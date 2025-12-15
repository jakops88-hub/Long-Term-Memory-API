import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { env } from '../config';
import { logger } from '../config/logger';
import { prisma } from '../config/prisma';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(env.stripeSecretKey || '', {
  apiVersion: '2025-11-17.clover',
  typescript: true,
});

/**
 * Stripe Webhook Handler
 * 
 * IMPORTANT: This route must use express.raw() middleware
 * to receive the raw request body for signature verification.
 * 
 * Endpoint: POST /api/webhooks/stripe
 */
router.post(
  '/stripe',
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      logger.error('Missing Stripe signature header');
      return res.status(400).send('Missing signature');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        env.stripeWebhookSecret || ''
      );
    } catch (err: any) {
      logger.error('Webhook signature verification failed', { error: err.message });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    logger.info('Received Stripe webhook event', { type: event.type, id: event.id });

    // Handle different event types
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;

          logger.info('Checkout session completed', { sessionId: session.id, userId });

          if (userId) {
            // Upgrade user to PRO tier
            await prisma.userBilling.update({
              where: { userId },
              data: {
                tier: 'PRO',
                stripeCustomerId: session.customer as string,
              },
            });

            logger.info('User upgraded to PRO tier', { userId });
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const userId = invoice.metadata?.userId;

          logger.info('Invoice payment succeeded', { invoiceId: invoice.id, userId });

          if (userId) {
            // Clear negative balance (overage paid)
            await prisma.userBilling.update({
              where: { userId },
              data: { creditsBalance: 0 },
            });

            logger.info('User balance cleared after payment', { userId });
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const userId = invoice.metadata?.userId;

          logger.error('Invoice payment failed', { invoiceId: invoice.id, userId });

          if (userId) {
            // TODO: Implement suspension or downgrade logic
            logger.warn('Payment failed - user should be suspended', { userId });
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          logger.info('Subscription cancelled', { subscriptionId: subscription.id, customerId });

          // Downgrade user to FREE tier
          await prisma.userBilling.updateMany({
            where: { stripeCustomerId: customerId },
            data: { tier: 'FREE' },
          });

          logger.info('User downgraded to FREE tier', { customerId });
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          logger.info('Subscription updated', { subscriptionId: subscription.id, customerId });

          // Update tier based on subscription status
          if (subscription.status === 'active') {
            await prisma.userBilling.updateMany({
              where: { stripeCustomerId: customerId },
              data: { tier: 'PRO' },
            });
          } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            await prisma.userBilling.updateMany({
              where: { stripeCustomerId: customerId },
              data: { tier: 'FREE' },
            });
          }
          break;
        }

        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }

      // Return 200 to acknowledge receipt
      res.json({ received: true });
    } catch (error: any) {
      logger.error('Error processing webhook event', {
        type: event.type,
        error: error.message,
      });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

export default router;
