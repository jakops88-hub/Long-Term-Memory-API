/**
 * Stripe Integration Guide for Long-Term-Memory-API
 * 
 * This backend uses Express/Node.js (not Next.js).
 * Below are examples of how to use Stripe in this environment.
 */

import Stripe from 'stripe';
import { env } from './config'; // Your existing env config

// ============================================================================
// SERVER-SIDE: Initialize Stripe with Secret Key
// ============================================================================

/**
 * Initialize Stripe client (server-side only)
 * This should be done in a service or config file
 */
export const stripe = new Stripe(env.stripeSecretKey || '', {
  apiVersion: '2024-11-20.acacia', // Use latest API version
  typescript: true,
});

// ============================================================================
// EXAMPLE 1: Create a Checkout Session
// ============================================================================

/**
 * Create a Stripe Checkout Session for subscription
 * Called from your billing routes/controllers
 */
async function createCheckoutSession(userId: string, priceId: string) {
  const session = await stripe.checkout.sessions.create({
    customer_email: `user-${userId}@yourapp.com`, // Or fetch from database
    mode: 'subscription',
    line_items: [
      {
        price: priceId, // e.g., 'price_1ABC...' from Stripe Dashboard
        quantity: 1,
      },
    ],
    success_url: `${env.frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.frontendUrl}/billing/cancel`,
    metadata: {
      userId, // Track who this belongs to
    },
  });

  return session;
}

// ============================================================================
// EXAMPLE 2: Create an Invoice for Overage (Phase 4 requirement)
// ============================================================================

/**
 * Create and send an invoice for Pro tier overage
 * This is what you need for the TODO in hybridCostGuard.ts
 */
async function createOverageInvoice(userId: string, amount: number) {
  // 1. Get or create Stripe customer
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { billing: true }
  });

  let customerId = user?.billing?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user?.email,
      metadata: { userId },
    });
    
    customerId = customer.id;
    
    // Save customer ID to database
    await prisma.userBilling.update({
      where: { userId },
      data: { stripeCustomerId: customerId },
    });
  }

  // 2. Create invoice item
  await stripe.invoiceItems.create({
    customer: customerId,
    amount: Math.round(amount), // Amount in cents
    currency: 'usd',
    description: `API Usage Overage - ${new Date().toLocaleDateString()}`,
  });

  // 3. Create and finalize invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    auto_advance: true, // Automatically finalize and attempt payment
    collection_method: 'charge_automatically',
    metadata: { userId, type: 'overage' },
  });

  await stripe.invoices.finalizeInvoice(invoice.id);

  return invoice;
}

// ============================================================================
// EXAMPLE 3: Handle Webhook Events
// ============================================================================

/**
 * Verify and handle Stripe webhooks
 * Should be called from a dedicated webhook route (e.g., POST /api/webhooks/stripe)
 */
async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    return res.status(400).send('Missing signature');
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body, // Raw body buffer (use express.raw() middleware)
      sig,
      env.stripeWebhookSecret || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      
      // Update user to PRO tier
      if (userId) {
        await prisma.userBilling.update({
          where: { userId },
          data: {
            tier: 'PRO',
            stripeCustomerId: session.customer as string,
          },
        });
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = invoice.metadata?.userId;
      
      // Clear negative balance or add credits
      if (userId) {
        await prisma.userBilling.update({
          where: { userId },
          data: { creditsBalance: 0 }, // Reset overage
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const userId = invoice.metadata?.userId;
      
      // Downgrade user or suspend service
      if (userId) {
        console.error(`Payment failed for user ${userId}`);
        // TODO: Implement suspension logic
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Downgrade user to FREE tier
      await prisma.userBilling.updateMany({
        where: { stripeCustomerId: customerId },
        data: { tier: 'FREE' },
      });
      break;
    }
  }

  res.json({ received: true });
}

// ============================================================================
// EXAMPLE 4: Client-Side Configuration (for your frontend)
// ============================================================================

/**
 * Return publishable key to frontend
 * This endpoint is safe to call from client-side JavaScript
 */
async function getStripeConfig(req: Request, res: Response) {
  res.json({
    publishableKey: env.stripePublishableKey,
  });
}

// ============================================================================
// SETUP INSTRUCTIONS
// ============================================================================

/**
 * 1. Install Stripe SDK:
 *    npm install stripe
 * 
 * 2. Add to src/config/env.ts:
 *    stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
 *    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
 *    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
 * 
 * 3. Create webhook route (src/routes/webhookRoutes.ts):
 *    import express from 'express';
 *    
 *    const router = express.Router();
 *    
 *    // IMPORTANT: Use express.raw() for Stripe webhooks
 *    router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);
 *    
 *    export default router;
 * 
 * 4. Mount in src/app.ts:
 *    import webhookRoutes from './routes/webhookRoutes';
 *    app.use('/webhooks', webhookRoutes);
 * 
 * 5. Configure webhook in Stripe Dashboard:
 *    - URL: https://your-api.com/webhooks/stripe
 *    - Events: checkout.session.completed, invoice.payment_succeeded, invoice.payment_failed, customer.subscription.deleted
 * 
 * 6. Test with Stripe CLI:
 *    stripe listen --forward-to localhost:4000/webhooks/stripe
 */

// ============================================================================
// SECURITY NOTES
// ============================================================================

/**
 * ✅ DO:
 * - Always verify webhook signatures
 * - Use HTTPS in production
 * - Store Secret Key in .env (never commit)
 * - Use different keys for test/live modes
 * 
 * ❌ DON'T:
 * - Never expose Secret Key to client-side
 * - Don't skip webhook signature verification
 * - Don't commit .env file to git
 * - Don't use live keys in development
 */
