/**
 * User source type - determines billing strategy
 */
export type UserSource = 'RAPIDAPI' | 'DIRECT';

/**
 * User tier - determines feature access and overage policy
 */
export type UserTier = 'FREE' | 'HOBBY' | 'PRO';

/**
 * User context containing billing and access control information
 */
export interface UserContext {
  userId: string;
  source: UserSource;
  tier: UserTier;
  balance: number; // Current balance in cents (e.g., 1000 = $10.00)
}

/**
 * Result from CostGuard.checkAccess()
 */
export interface AccessCheckResult {
  allowed: boolean;
  allowBackgroundJobs: boolean; // RapidAPI users cannot use expensive background features
  reason?: string;
  estimatedCost: number;
}

/**
 * Configuration for overage policy (Pro tier)
 */
export interface OveragePolicy {
  enabled: boolean;
  maxNegativeBalance: number; // Max negative balance allowed in cents (e.g., -2000 = -$20)
  triggerInvoice: boolean; // Auto-create Stripe invoice when threshold hit
}
