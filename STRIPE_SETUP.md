# Stripe Configuration Guide

## ✅ Environment Variables Configured

Your `.env` file now includes:

```env
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_51S0ic1DHR4l3RAkygRNBco9bz8CHIYDG9U2yAnBz0DRnLDqpdSxndngWEQ6evScphkQk1al3F6jSGoP1E0z0uGGg002b7JhOdR
STRIPE_SECRET_KEY=              # ⚠️ PASTE YOUR SECRET KEY HERE
STRIPE_WEBHOOK_SECRET=          # ⚠️ PASTE YOUR WEBHOOK SECRET HERE
```

## 🔐 Security Checklist

1. **Add `.env` to `.gitignore`** ✅ (Already done)
2. **Never commit your Secret Key** ⚠️ (Fill it in manually)
3. **Use test keys in development** (Your current key is LIVE mode)
4. **Use HTTPS in production** (Required for webhooks)

---

## 📝 How to Use Stripe in Your Backend

### Server-Side (Express Routes/Controllers)

```typescript
import Stripe from 'stripe';
import { env } from './config';

// Initialize Stripe client
const stripe = new Stripe(env.stripeSecretKey || '', {
  apiVersion: '2024-11-20.acacia',
});

// Example: Create checkout session
async function createCheckout(userId: string) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{
      price: 'price_1ABC...', // Your price ID from Stripe Dashboard
      quantity: 1,
    }],
    success_url: 'https://yourapp.com/success',
    cancel_url: 'https://yourapp.com/cancel',
  });
  
  return session.url; // Redirect user here
}
```

### Client-Side (Frontend/JavaScript)

```typescript
// 1. Get publishable key from your API
const response = await fetch('/api/config/stripe');
const { publishableKey } = await response.json();

// 2. Initialize Stripe.js
const stripe = Stripe(publishableKey);

// 3. Redirect to checkout
const { sessionId } = await fetch('/api/billing/checkout', {
  method: 'POST',
  body: JSON.stringify({ userId: 'user_123' })
}).then(r => r.json());

await stripe.redirectToCheckout({ sessionId });
```

---

## 🎯 Integration with Your Phase 4 Implementation

Your `hybridCostGuard.ts` has a TODO for Stripe invoices. Replace this:

```typescript
// TODO: Implement Stripe invoice integration
private async triggerStripeInvoice(userId: string, amount: number): Promise<void> {
  logger.warn('Stripe invoice integration not implemented', { userId, amount });
}
```

With this:

```typescript
import Stripe from 'stripe';
import { env } from '../config';

const stripe = new Stripe(env.stripeSecretKey || '', {
  apiVersion: '2024-11-20.acacia',
});

private async triggerStripeInvoice(userId: string, amount: number): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { billing: true }
    });

    let customerId = user?.billing?.stripeCustomerId;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user?.email,
        metadata: { userId },
      });
      
      customerId = customer.id;
      
      await prisma.userBilling.update({
        where: { userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create invoice item
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: Math.round(amount), // Amount in cents
      currency: 'usd',
      description: `API Usage Overage - ${new Date().toLocaleDateString()}`,
    });

    // Create and finalize invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: true,
      collection_method: 'charge_automatically',
      metadata: { userId, type: 'overage' },
    });

    await stripe.invoices.finalizeInvoice(invoice.id);
    
    logger.info('Stripe invoice created', { userId, invoiceId: invoice.id, amount });
  } catch (error: any) {
    logger.error('Failed to create Stripe invoice', { userId, amount, error: error.message });
    throw error;
  }
}
```

---

## 🔔 Webhook Setup

1. **Create webhook endpoint** in your API:

```typescript
// src/routes/webhookRoutes.ts
import express from 'express';
import Stripe from 'stripe';
import { env } from '../config';

const router = express.Router();
const stripe = new Stripe(env.stripeSecretKey || '', {
  apiVersion: '2024-11-20.acacia',
});

router.post('/stripe', 
  express.raw({ type: 'application/json' }), 
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    
    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        env.stripeWebhookSecret || ''
      );

      switch (event.type) {
        case 'invoice.payment_succeeded':
          // Clear user's negative balance
          const invoice = event.data.object as Stripe.Invoice;
          const userId = invoice.metadata?.userId;
          
          if (userId) {
            await prisma.userBilling.update({
              where: { userId },
              data: { creditsBalance: 0 }
            });
          }
          break;
      }

      res.json({ received: true });
    } catch (err: any) {
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

export default router;
```

2. **Mount in app.ts**:

```typescript
import webhookRoutes from './routes/webhookRoutes';
app.use('/webhooks', webhookRoutes);
```

3. **Configure in Stripe Dashboard**:
   - Go to: https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://your-api.com/webhooks/stripe`
   - Select events: `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy webhook secret to `.env`

4. **Test with Stripe CLI**:

```bash
stripe login
stripe listen --forward-to localhost:4000/webhooks/stripe
```

---

## 📦 Install Stripe SDK

```bash
npm install stripe
npm install --save-dev @types/stripe
```

---

## 🚨 Important Notes

1. **Your current key is LIVE MODE** (`pk_live_...`)
   - This will charge real money
   - Use test keys during development: `pk_test_...` and `sk_test_...`

2. **Get test keys from**: https://dashboard.stripe.com/test/apikeys

3. **Secret Key Security**:
   - Never expose in client-side code
   - Never commit to git
   - Rotate immediately if compromised

4. **Webhook Secret**:
   - Required to verify webhook authenticity
   - Get from Stripe Dashboard after creating webhook endpoint

---

## ✅ Next Steps

1. ☐ Paste your **Secret Key** into `.env` (line 43)
2. ☐ Create webhook endpoint in Stripe Dashboard
3. ☐ Paste **Webhook Secret** into `.env` (line 46)
4. ☐ Install Stripe SDK: `npm install stripe`
5. ☐ Implement invoice integration in `hybridCostGuard.ts`
6. ☐ Test with Stripe test keys first
7. ☐ Deploy and configure production webhooks

---

For complete examples, see: `STRIPE_INTEGRATION.ts`
