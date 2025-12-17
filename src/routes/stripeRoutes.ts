import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config';
import { hybridAuth, AuthenticatedRequest } from '../middleware/hybridAuth';
import Stripe from 'stripe';

// Stripe API version must match webhookRoutes
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-11-17.clover',
});

const router = Router();

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', hybridAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userContext?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ error: 'Price ID is required' });

    // Hämta user email från databasen
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Skapa Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user?.email || undefined,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      // HARDCODED: 7-day free trial for all subscription plans
      // This cannot be configured in Stripe Dashboard for this price.
      // Trial starts immediately, user is charged $0 for first 7 days.
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `${process.env.CORS_ORIGIN}/dashboard/billing?success=true`,
      cancel_url: `${process.env.CORS_ORIGIN}/dashboard/billing?canceled=true`,
      metadata: {
        userId, // VIKTIGT: Används i webhook för att identifiera användaren
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// POST /api/stripe/create-portal-session
router.post('/create-portal-session', hybridAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userContext?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Hämta stripeCustomerId från userBilling
    const billing = await prisma.userBilling.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });
    if (!billing?.stripeCustomerId) {
      return res.status(404).json({ error: 'No Stripe customer found for user' });
    }

    // Skapa portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${process.env.CORS_ORIGIN}/dashboard/billing`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

export default router;
