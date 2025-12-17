import { Router, Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { env } from '../config';
import { logger } from '../config/logger';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(env.stripeSecretKey || '', {
  apiVersion: '2025-12-15.clover',
});

/**
 * Public Checkout Endpoint
 * 
 * Allows anyone to start a Stripe checkout session without authentication.
 * User account + API key will be created automatically via webhook after payment.
 * 
 * POST /api/public/stripe/checkout
 * Body: { "email": "user@example.com", "priceId": "price_xxx" }
 */
router.post('/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, priceId } = req.body;

    // Validate input
    if (!email || !priceId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Both email and priceId are required',
      });
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address',
      });
    }

    logger.info('Creating public checkout session', { email, priceId });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${env.corsOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.corsOrigin}/checkout/canceled`,
      metadata: {
        email, // Store email to create user account in webhook
        source: 'public_checkout',
      },
      subscription_data: {
        metadata: {
          email, // Also store in subscription metadata
          source: 'public_checkout',
        },
      },
    });

    logger.info('Public checkout session created', {
      sessionId: session.id,
      email,
      url: session.url,
    });

    return res.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error: any) {
    logger.error('Failed to create public checkout session', {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      error: 'Checkout session creation failed',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

export default router;
