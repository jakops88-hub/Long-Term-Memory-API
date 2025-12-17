import { redis } from '../config/redis';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { UserContext, UserSource, AccessCheckResult, OveragePolicy } from '../types/billing';
import { ApiError } from '../types/errors';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(env.stripeSecretKey || '', {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

/**
 * CostGuard - Unified cost control for RapidAPI and Direct (Stripe) users
 * 
 * THE GOLDEN RULE:
 * - RapidAPI users: Never check credits (they handle billing), but BLOCK expensive background jobs
 * - Direct users: Always check credits, allow overage for Pro tier
 */
export class CostGuard {
  private static readonly REDIS_BALANCE_KEY = (userId: string) => `user:${userId}:balance`;
  private static readonly REDIS_LOCK_KEY = (userId: string) => `user:${userId}:lock`;
  
  // Pricing and overage policy - TOKEN-BASED SYSTEM
  // Hobby: $29/month - 100,000 tokens included, HARD LIMIT (no overage)
  // Pro: $99/month - 1,000,000 tokens included, then $0.003 per API call overage
  private static readonly PRICING = {
    COST_PER_API_CALL: 0.3, // $0.003 in cents (overage rate for Pro)
    HOBBY_MONTHLY: 2900, // $29.00
    HOBBY_INCLUDED_TOKENS: 100_000, // 100k tokens included with Hobby plan
    PRO_MONTHLY: 9900, // $99.00
    PRO_INCLUDED_TOKENS: 1_000_000 // 1M tokens included with Pro plan
  };

  private static readonly OVERAGE_POLICY: Record<string, OveragePolicy> = {
    PRO: {
      enabled: true,
      maxNegativeBalance: -100000, // -$1000.00 (unlimited with billing)
      triggerInvoice: true
    },
    HOBBY: {
      enabled: false,
      maxNegativeBalance: 0, // Hard limit at $0
      triggerInvoice: false
    },
    FREE: {
      enabled: false,
      maxNegativeBalance: 0,
      triggerInvoice: false
    }
  };

  /**
   * Check if user has access to perform an operation
   * 
   * @param userId - User ID
   * @param context - User context with source, tier, and balance
   * @param estimatedCost - Estimated cost in cents
   * @returns Access check result with permissions
   */
  static async checkAccess(
    userId: string,
    context: UserContext,
    estimatedCost: number
  ): Promise<AccessCheckResult> {
    // ============================================================================
    // RAPIDAPI USERS: Bypass balance check, block background jobs
    // ============================================================================
    if (context.source === 'RAPIDAPI') {
      logger.info('RapidAPI user - bypassing balance check', {
        userId,
        tier: context.tier,
        estimatedCost
      });

      return {
        allowed: true,
        allowBackgroundJobs: false, // CRITICAL: Block expensive features
        estimatedCost,
        reason: 'RapidAPI user - billing handled externally'
      };
    }

    // ============================================================================
    // DIRECT USERS: Check balance with tier-specific policies
    // ============================================================================
    const balance = await this.getBalance(userId);
    const policy = this.OVERAGE_POLICY[context.tier];

    // Calculate balance after operation
    const balanceAfter = balance - estimatedCost;

    // Check if operation would exceed limit
    if (balanceAfter < policy.maxNegativeBalance) {
      const shortfall = Math.abs(balanceAfter - policy.maxNegativeBalance);
      
      logger.warn('Insufficient balance for Direct user', {
        userId,
        tier: context.tier,
        balance,
        estimatedCost,
        balanceAfter,
        shortfall
      });

      // Trigger invoice for Pro users if enabled
      if (policy.triggerInvoice && context.tier === 'PRO') {
        await this.triggerStripeInvoice(userId, shortfall);
      }

      throw new ApiError({
        code: 'INSUFFICIENT_BALANCE',
        status: 402,
        message: `Insufficient balance. You need at least $${(shortfall / 100).toFixed(2)} more credits.`,
        details: {
          currentBalance: balance,
          estimatedCost,
          shortfall,
          tier: context.tier
        }
      });
    }

    logger.info('Access granted for Direct user', {
      userId,
      tier: context.tier,
      balance,
      estimatedCost,
      balanceAfter
    });

    return {
      allowed: true,
      allowBackgroundJobs: true, // Direct users can use all features
      estimatedCost,
      reason: 'Sufficient balance'
    };
  }

  /**
   * Deduct cost from user balance (Direct users only)
   * 
   * @param userId - User ID
   * @param context - User context
   * @param actualCost - Actual cost in cents
   */
  static async deduct(
    userId: string,
    context: UserContext,
    actualCost: number
  ): Promise<void> {
    // ============================================================================
    // RAPIDAPI USERS: No-op (they handle billing)
    // ============================================================================
    if (context.source === 'RAPIDAPI') {
      logger.debug('RapidAPI user - skipping deduction', { userId, actualCost });
      return;
    }

    // ============================================================================
    // DIRECT USERS: Atomic deduction using Redis
    // ============================================================================
    const balanceKey = this.REDIS_BALANCE_KEY(userId);
    
    try {
      // Atomic decrement
      const newBalance = await redis.incrby(balanceKey, -actualCost);
      
      logger.info('Balance deducted', {
        userId,
        actualCost,
        newBalance,
        tier: context.tier
      });

      // Sync to database (async, non-blocking)
      this.syncBalanceToDatabase(userId, newBalance).catch(err => {
        logger.error('Failed to sync balance to database', { userId, error: err.message });
      });

      // Check if balance went negative beyond threshold
      const policy = this.OVERAGE_POLICY[context.tier];
      if (newBalance < policy.maxNegativeBalance && policy.triggerInvoice) {
        await this.triggerStripeInvoice(userId, Math.abs(newBalance));
      }
    } catch (error) {
      logger.error('Failed to deduct balance', {
        userId,
        actualCost,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new ApiError({
        code: 'DEDUCTION_FAILED',
        status: 500,
        message: 'Failed to deduct balance'
      });
    }
  }

  /**
   * Get current balance from Redis (with fallback to database)
   * 
   * @param userId - User ID
   * @returns Current balance in cents
   */
  static async getBalance(userId: string): Promise<number> {
    const balanceKey = this.REDIS_BALANCE_KEY(userId);
    
    try {
      const balance = await redis.get(balanceKey);
      
      if (balance === null) {
        // Fallback to database
        logger.debug('Balance not in Redis, loading from database', { userId });
        return await this.loadBalanceFromDatabase(userId);
      }
      
      return parseInt(balance, 10);
    } catch (error) {
      logger.error('Failed to get balance from Redis', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Fallback to database
      return await this.loadBalanceFromDatabase(userId);
    }
  }

  /**
   * Add credits to user balance (Direct users only)
   * 
   * @param userId - User ID
   * @param amount - Amount to add in cents
   */
  static async addCredits(userId: string, amount: number): Promise<number> {
    const balanceKey = this.REDIS_BALANCE_KEY(userId);
    
    try {
      const newBalance = await redis.incrby(balanceKey, amount);
      
      logger.info('Credits added', { userId, amount, newBalance });
      
      // Sync to database
      await this.syncBalanceToDatabase(userId, newBalance);
      
      return newBalance;
    } catch (error) {
      logger.error('Failed to add credits', {
        userId,
        amount,
        error: error instanceof Error ? error.message : String(error)
      });
      throw new ApiError({
        code: 'ADD_CREDITS_FAILED',
        status: 500,
        message: 'Failed to add credits'
      });
    }
  }

  /**
   * Initialize balance in Redis from database
   * 
   * @param userId - User ID
   * @returns Current balance
   */
  private static async loadBalanceFromDatabase(userId: string): Promise<number> {
    const billing = await prisma.userBilling.findUnique({
      where: { userId },
      select: { creditsBalance: true }
    });

    if (!billing) {
      logger.warn('User billing record not found', { userId });
      return 0;
    }

    const balance = billing.creditsBalance;
    const balanceKey = this.REDIS_BALANCE_KEY(userId);
    
    // Store in Redis for future queries
    await redis.set(balanceKey, balance.toString());
    
    return balance;
  }

  /**
   * Sync balance from Redis to database (non-blocking)
   * 
   * @param userId - User ID
   * @param balance - Current balance in cents
   */
  private static async syncBalanceToDatabase(userId: string, balance: number): Promise<void> {
    try {
      await prisma.userBilling.update({
        where: { userId },
        data: { creditsBalance: balance }
      });
    } catch (error) {
      logger.error('Failed to sync balance to database', {
        userId,
        balance,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Trigger Stripe invoice creation for Pro users with negative balance
   * 
   * @param userId - User ID
   * @param amount - Amount to invoice in cents
   */
  private static async triggerStripeInvoice(userId: string, amount: number): Promise<void> {
    logger.info('Triggering Stripe invoice for overage', { userId, amount });
    
    try {
      // Get user with billing info
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { billing: true }
      });

      if (!user) {
        logger.error('User not found for invoice', { userId });
        return;
      }

      let customerId = user.billing?.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        logger.info('Creating Stripe customer', { userId, email: user.email });
        
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.email || `User ${userId}`,
          metadata: { userId },
          description: 'MemVault API User'
        });

        customerId = customer.id;

        // Save customer ID to database
        await prisma.userBilling.update({
          where: { userId },
          data: { stripeCustomerId: customerId }
        });

        logger.info('Stripe customer created', { userId, customerId });
      }

      // Calculate number of API calls from amount (at $0.003 per call)
      const apiCalls = Math.round(amount / CostGuard.PRICING.COST_PER_API_CALL);

      // Create invoice item for overage
      const invoiceItem = await stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(amount), // Ensure integer cents
        currency: 'usd',
        description: `MemVault API Overage - ${apiCalls.toLocaleString()} calls @ $0.003/call (beyond 1M included tokens) - ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}`,
        metadata: {
          userId,
          type: 'overage',
          apiCalls: apiCalls.toString(),
          pricePerCall: '0.003',
          timestamp: new Date().toISOString()
        }
      });

      logger.info('Invoice item created', { 
        userId, 
        invoiceItemId: invoiceItem.id, 
        amount 
      });

      // Create and finalize invoice
      const invoice = await stripe.invoices.create({
        customer: customerId,
        auto_advance: true, // Automatically finalize and attempt payment
        collection_method: 'charge_automatically',
        description: 'MemVault API Usage Overage',
        metadata: {
          userId,
          type: 'overage'
        }
      });

      // Finalize the invoice (this triggers payment attempt)
      await stripe.invoices.finalizeInvoice(invoice.id);

      logger.info('Stripe invoice created and finalized', { 
        userId, 
        invoiceId: invoice.id,
        amount,
        status: invoice.status,
        hostedInvoiceUrl: invoice.hosted_invoice_url
      });

      // Note: Webhook will handle updating balance when payment succeeds
      
    } catch (error) {
      logger.error('Failed to trigger Stripe invoice', {
        userId,
        amount,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Don't throw - we don't want to block the operation if invoicing fails
      // Just log the error and continue
    }
  }

  /**
   * Calculate cost for a single API call
   * Fixed rate: $0.003 per call
   * 
   * @returns Cost in cents (0.3 cents = $0.003)
   */
  static calculateApiCallCost(): number {
    return this.PRICING.COST_PER_API_CALL;
  }

  /**
   * Calculate estimated cost for an operation (LEGACY - for token-based billing if needed)
   * 
   * NOTE: Current pricing is per-API-call ($0.003), not per-token.
   * This function is kept for backward compatibility or future token-based pricing.
   * 
   * @param tokenCount - Estimated token count
   * @param hasEmbedding - Whether operation includes embedding generation
   * @param hasGraphExtraction - Whether operation includes graph extraction
   * @returns Estimated cost in cents
   */
  static calculateEstimatedCost(
    tokenCount: number,
    hasEmbedding: boolean = false,
    hasGraphExtraction: boolean = false
  ): number {
    // NEW PRICING MODEL: Fixed $0.003 per API call
    // Ignore token count and just return per-call cost
    return this.PRICING.COST_PER_API_CALL;
    
    // OLD TOKEN-BASED PRICING (commented out):
    // Base cost: $0.50 per 1M tokens (GPT-4o-mini pricing)
    // let cost = (tokenCount / 1_000_000) * 50;
    // 
    // // Embedding cost: ~$0.02 per 1M tokens (text-embedding-3-small)
    // if (hasEmbedding) {
    //   cost += (tokenCount / 1_000_000) * 2;
    // }
    // 
    // // Graph extraction cost: ~3x base cost (structured output)
    // if (hasGraphExtraction) {
    //   cost *= 3;
    // }
    // 
    // // Add 30% profit margin
    // cost *= 1.3;
    // 
    // return Math.ceil(cost); // Round up to nearest cent
  }
}
