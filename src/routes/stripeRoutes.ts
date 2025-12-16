import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config';
import { hybridAuth } from '../middleware/hybridAuth';
import Stripe from 'stripe';

// Stripe API version must match webhookRoutes
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-11-17.clover',
});

const router = Router();

// POST /api/stripe/create-portal-session
router.post('/create-portal-session', hybridAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
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
