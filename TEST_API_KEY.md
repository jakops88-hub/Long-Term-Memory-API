# Test User & API Key

## Ready-to-use API Key 🔑

```
sk_test_memvault_2025_production_key_abc123xyz789def456ghi
```

**Important:** API key must be at least 32 characters and start with `sk_`

## SQL to Insert Test User (Run in Supabase SQL Editor)

```sql
-- 1. Create test user
INSERT INTO "User" (id, email, "apiKey", source, "createdAt", "updatedAt")
VALUES (
  'user_test_memvault_2025',
  'test@memvault.com',
  'sk_test_memvault_2025_production_key_abc123xyz789def456ghi',
  'DIRECT',
  NOW(),
  NOW()
);

-- 2. Create billing record for test user (with required id field)
INSERT INTO "UserBilling" (id, "userId", tier, "creditsBalance", "createdAt", "updatedAt")
VALUES (
  'billing_test_memvault_2025',
  'user_test_memvault_2025',
  'PRO',
  0,
  NOW(),
  NOW()
);

-- 3. Verify user was created
SELECT u.id, u.email, u."apiKey", ub.tier, ub."creditsBalance"
FROM "User" u
LEFT JOIN "UserBilling" ub ON u.id = ub."userId"
WHERE u.id = 'user_test_memvault_2025';
```

## How to Use

### 1. Insert in Database
- Go to Supabase Dashboard → SQL Editor
- Copy the SQL above
- Click "Run" to execute
- Verify the SELECT returns your test user

### 2. Test in Frontend

**Login Page:**
```javascript
// Enter this API key on /login page:
sk_test_memvault_2025_production_key_abc123xyz789def456ghi
```

**Test API Call:**
```bash
# Test authentication
curl https://your-api.koyeb.app/api/user/me \
  -H "Authorization: Bearer sk_test_memvault_2025_production_key_abc123xyz789def456ghi"

# Should return:
{
  "id": "user_test_memvault_2025",
  "email": "test@memvault.com",
  "tier": "PRO",
  "creditsBalance": 0,
  "createdAt": "2025-12-16T..."
}
```

**Add Memory:**
```bash
curl -X POST https://your-api.koyeb.app/api/memory/add \
  -H "Authorization: Bearer sk_test_memvault_2025_production_key_abc123xyz789def456ghi" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "text": "User prefers dark mode and loves TypeScript",
    "metadata": {"category": "preferences"}
  }'
```

**Search Memories:**
```bash
curl -X POST https://your-api.koyeb.app/api/memory/search \
  -H "Authorization: Bearer sk_test_memvault_2025_production_key_abc123xyz789def456ghi" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-user-001",
    "query": "What does the user prefer?",
    "limit": 10
  }'
```

## Alternative: Create via API Script

If you have access to the deployed environment:

```bash
# SSH into Koyeb or run locally
cd /app
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const user = await prisma.user.create({
    data: {
      id: 'user_test_memvault_2025',
      email: 'test@memvault.com',
      apiKey: 'sk_test_memvault_2025_production_key_abc123xyz789def456ghi',
      source: 'DIRECT',
      billing: {
        create: {
          tier: 'PRO',
          creditsBalance: 0,
        },
      },
    },
  });
  console.log('✅ Test user created:', user);
  await prisma.\$disconnect();
})();
"
```

## Delete Test User (Cleanup)

When you're done testing:

```sql
-- Delete test user and billing data
DELETE FROM "UserBilling" WHERE "userId" = 'user_test_memvault_2025';
DELETE FROM "User" WHERE id = 'user_test_memvault_2025';
```

---

## Your Test Credentials

**Email:** `test@memvault.com`  
**API Key:** `sk_test_memvault_2025_production_key_abc123xyz789def456ghi`  
**User ID:** `user_test_memvault_2025`  
**Tier:** `PRO`

Use these to test all frontend features! 🚀
