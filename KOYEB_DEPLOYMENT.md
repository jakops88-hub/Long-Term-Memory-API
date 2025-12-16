# Koyeb Deployment Checklist

## Quick Setup (5 minutes)

### 1. Add Environment Variable 🔑
1. Go to your Koyeb dashboard: https://app.koyeb.com
2. Select your MemVault API app
3. Click **Settings** → **Environment Variables**
4. Add new variable:
   ```
   Name: RESEND_API_KEY
   Value: [Your Resend API key from https://resend.com/api-keys]
   ```
5. Click **Save** and **Redeploy**

### 2. Get Resend API Key 📧
If you don't have one yet:
1. Visit https://resend.com
2. Sign up for free account (100 emails/day free tier)
3. Go to **API Keys** section
4. Click **Create API Key**
5. Copy the key (starts with `re_`)
6. Paste into Koyeb environment variable

### 3. Verify Deployment ✅
After redeployment completes (2-3 minutes):

1. Check health endpoint:
   ```bash
   curl https://your-app.koyeb.app/health
   ```

2. Test user endpoint:
   ```bash
   curl https://your-app.koyeb.app/api/user/me \
     -H "Authorization: Bearer sk_test_key"
   ```
   Should return 401 Unauthorized (correct - endpoint exists)

3. Check logs for startup:
   - Click **Logs** in Koyeb dashboard
   - Should see: `Server running on port 4000`
   - No errors about missing RESEND_API_KEY

### 4. Test Email Flow 📬
Complete a test checkout:

1. Frontend calls `/api/public/stripe/checkout` with email
2. Complete Stripe payment with test card: `4242 4242 4242 4242`
3. Check logs for: `✅ Welcome email sent successfully`
4. Check email inbox for welcome message

### 5. Update Frontend Environment 🌐
In your frontend `.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=https://your-app.koyeb.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
NEXT_PUBLIC_STRIPE_PRICE_ID=price_your_price_id
```

---

## Optional: Domain Verification

For production with custom domain emails:

1. Go to Resend dashboard → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `memvault.com`)
4. Add these DNS records to your domain provider:

   | Type | Name | Value |
   |------|------|-------|
   | TXT | @ | (provided by Resend) |
   | MX | @ | feedback-smtp.eu-west-1.amazonses.com |
   | CNAME | resend._domainkey | (provided by Resend) |

5. Wait for verification (5-10 minutes)
6. Update email service:
   - Edit `src/services/emailService.ts`
   - Change `from: 'MemVault <noreply@memvault.com>'`
   - Push changes and redeploy

---

## Troubleshooting

### Email not sending?
1. Check Koyeb logs for errors
2. Verify `RESEND_API_KEY` is set correctly
3. Check Resend dashboard → **Logs** for delivery status
4. API key should be logged as fallback if email fails

### 401 Unauthorized on /api/user/me?
✅ **This is correct behavior!** 
- Endpoint requires valid API key
- Test with real API key from database or email

### Environment variable not updating?
1. After adding variable, click **Redeploy**
2. Wait for new deployment to complete (2-3 minutes)
3. Old instances don't automatically get new variables

### Webhook not triggering?
1. Check Stripe dashboard → **Developers** → **Webhooks**
2. Verify webhook URL: `https://your-app.koyeb.app/api/webhooks/stripe`
3. Check recent deliveries for errors
4. Webhook secret must match `STRIPE_WEBHOOK_SECRET` in Koyeb

---

## Current Environment Variables

Your Koyeb app should have these variables:

```env
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (NEW - ADD THIS)
RESEND_API_KEY=re_...

# OpenAI
OPENAI_API_KEY=sk-...

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# CORS
CORS_ORIGIN=https://your-frontend.vercel.app
```

---

## Expected Logs After Deployment

Successful startup:
```
[INFO] Server starting...
[INFO] Environment: production
[INFO] Port: 4000
[INFO] Email service initialized with Resend
[INFO] Server running on port 4000
```

Successful email send:
```
[INFO] Checkout session completed { sessionId: "cs_...", email: "user@example.com" }
[INFO] New user created from public checkout { userId: "user_...", email: "user@example.com" }
[INFO] ✅ Welcome email sent successfully { email: "user@example.com" }
```

---

## Next Steps

1. ✅ Add `RESEND_API_KEY` to Koyeb
2. ✅ Redeploy app
3. ✅ Verify logs show no errors
4. ⏳ Implement frontend fixes (see `FRONTEND_FIXES_PROMPT.md`)
5. ⏳ Test complete user journey
6. ⏳ (Optional) Set up custom domain with Resend

---

**Deployment Time: ~5 minutes**
**Testing Time: ~10 minutes**
**Total Setup: ~15 minutes**

🚀 Backend is ready for production after adding the API key!
