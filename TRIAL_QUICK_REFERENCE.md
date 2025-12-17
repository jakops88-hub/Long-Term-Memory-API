# 7-Day Free Trial - Quick Reference

## 🎯 What Was Changed

### File 1: `src/routes/stripeRoutes.ts`
**Line ~29-42:** Added `subscription_data` to checkout session
```typescript
subscription_data: {
  trial_period_days: 7,
}
```

### File 2: `src/routes/webhookRoutes.ts`  
**Line ~126-195:** Completely rewrote `invoice.payment_succeeded` handler

**Key Change:** Now provisions credits for $0 trial invoices instead of skipping them.

---

## 💡 Key Concepts

### Trial Flow:
1. User subscribes → Stripe creates 7-day trial
2. Stripe sends `invoice.payment_succeeded` with **$0.00**
3. Backend detects `amountPaid === 0` → Provisions credits
4. User gets full monthly credits immediately

### Credit Amounts:
| Tier | Credits | Tokens |
|------|---------|--------|
| HOBBY | 2900¢ ($29) | 100k |
| PRO | 9900¢ ($99) | 1M |

---

## ✅ Testing Checklist

- [ ] Create test checkout session
- [ ] Complete checkout with test card (4242 4242 4242 4242)
- [ ] Verify webhook logs show "Trial started - credits provisioned"
- [ ] Check database: `creditsBalance` should be 2900 or 9900
- [ ] User should be able to call API immediately
- [ ] After 7 days: Verify recurring payment works
- [ ] Test cancellation during trial

---

## 🚨 Critical Rules

1. **NEVER skip $0 invoices** - These are trial start events
2. **Always provision credits on trial start** - Or user logs into empty account
3. **Use `stripeCustomerId`** - More reliable than `userId` in metadata
4. **Log everything** - Include `amountPaid`, `tier`, `creditsAdded`

---

## 📊 Monitoring

**Good Logs:**
```
✅ Trial started - credits provisioned { userId, tier, creditsAdded }
✅ Recurring payment - balance replenished { userId, tier, amountPaid }
```

**Warning Logs:**
```
⚠️ Invoice payment succeeded but no user billing found { customerId, userId }
```

---

## 🐛 Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| User has 0 credits after trial start | Webhook skipped $0 invoice | Check `amountPaid === 0` logic |
| Credits not replenishing | Wrong userId in metadata | Use `stripeCustomerId` instead |
| Trial not applying | Missing `subscription_data` | Check stripeRoutes.ts line ~38 |

---

## 📝 Code Locations

- **Checkout creation:** [stripeRoutes.ts](src/routes/stripeRoutes.ts#L29-L42)
- **Credit provisioning:** [webhookRoutes.ts](src/routes/webhookRoutes.ts#L126-L195)
- **Test script:** [test_trial_provisioning.ts](scripts/test_trial_provisioning.ts)
- **Full documentation:** [STRIPE_TRIAL_IMPLEMENTATION.md](STRIPE_TRIAL_IMPLEMENTATION.md)

---

## 🔄 Rollback

**If issues arise:**
1. Remove `subscription_data` block from stripeRoutes.ts
2. Revert webhook to simple balance clearing
3. Redeploy

**Rollback time:** < 5 minutes
