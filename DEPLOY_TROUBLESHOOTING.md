# Deploy Troubleshooting Guide

## ✅ Vad Vi Fixat

1. **Added .dockerignore** - Exkluderar test-filer och dokumentation från Docker build
2. **Verified TypeScript compilation** - Inga errors, bygger korrekt lokalt
3. **Checked all imports** - Alla dependencies finns och är korrekta

---

## 🔍 Koyeb Deploy Checklist

### Steg 1: Kontrollera Build Logs på Koyeb
Gå till din Koyeb dashboard och klicka på build logs för att se exakt fel:

**Leta efter:**
- `npm install` errors - Missing dependencies?
- `npx prisma generate` errors - Database schema problem?
- `npm run build` (tsc) errors - TypeScript compilation failure?
- Memory/resource errors - Build timeout?

---

### Steg 2: Verifiera Environment Variables

Koyeb behöver dessa variabler i **Build & Deploy** settings:

#### ✅ Required Variables:
```
SUPABASE_URL=your_supabase_url
STRIPE_SECRET_KEY=sk_test_... eller sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
```

#### ⚠️ Optional but Recommended:
```
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://your-frontend.com
RESEND_API_KEY=re_... (för welcome emails)
```

---

### Steg 3: Check Dockerfile Compatibility

Om builden failar vid `npm install` eller `prisma generate`:

1. **Kolla Node version:** Dockerfile använder `node:20-slim`
2. **Kolla OpenSSL:** Dockerfile installerar det för Prisma
3. **Kolla npm version:** Ska vara kompatibel med package-lock.json

---

### Steg 4: Vanliga Deploy-Problem & Lösningar

#### Problem 1: "Module not found" under build
**Lösning:**
```bash
# Lokalt: Verify all dependencies are in package.json
npm install
npm run build
```

#### Problem 2: "Prisma Client Not Generated"
**Lösning:** 
Dockerfile ska köra `npx prisma generate` FÖRE `npm run build`.
Kontrollera att denna rad finns i Dockerfile (line 11):
```dockerfile
RUN npx prisma generate
```

#### Problem 3: "Out of Memory" under build
**Lösning:** 
- Uppgradera Koyeb plan till större instance
- Eller lägg till `NODE_OPTIONS=--max-old-space-size=4096` som env var

#### Problem 4: TypeScript Build Timeout
**Lösning:**
Koyeb kan ha timeout på 10 min. Om din build tar längre:
- Optimera tsconfig.json (skipLibCheck: true)
- Pre-build lokalt och committa dist/ (inte rekommenderat)

---

### Steg 5: Manual Verification Steps

#### Lokalt (i denna workspace):
```bash
# Test full build pipeline
cd /workspaces/Long-Term-Memory-API
rm -rf dist node_modules
npm install
npx prisma generate
npm run build

# Verify dist folder exists
ls -la dist/
```

#### På Koyeb:
1. **Redeploy:** Försök re-trigger build från Koyeb dashboard
2. **Check logs:** Deployment → Logs → Build logs
3. **Verify env vars:** Settings → Environment Variables

---

### Steg 6: If All Else Fails - Rollback

Om nya koden verkligen orsakar problem (osannolikt):

```bash
# Rollback till previous commit (innan trial implementation)
git revert HEAD~1
git push origin main
```

Men enligt vår lokala test fungerar allt korrekt, så detta borde inte behövas.

---

## 🔥 Snabb Fix: Trigger Clean Build

Ibland hjälper det att tvinga en helt clean build på Koyeb:

1. Go to **Settings** → **General**
2. Click **"Trigger manual deployment"**
3. Enable **"Force rebuild"** checkbox
4. Click **Deploy**

Detta tvingar Koyeb att bygga om allt från scratch utan cache.

---

## 📊 Vad Ska Hända Vid Lyckad Deploy

1. **Build phase:**
   - Install dependencies (30-60 sek)
   - Generate Prisma Client (10-20 sek)
   - Compile TypeScript (20-40 sek)
   - Total: ~2-3 minuter

2. **Deploy phase:**
   - Start container
   - Run migrations (docker-entrypoint.sh)
   - Start Express server on port 4000

3. **Success indicators:**
   - ✅ Build exit code: 0
   - ✅ Health check passes
   - ✅ Logs show "Server running on port 4000"

---

## 🆘 Behöver Du Mer Hjälp?

**Kopiera följande från Koyeb Build Logs:**

1. **Last 50 lines of build output:**
   ```
   [paste här]
   ```

2. **Environment variables list** (ta bort secrets):
   ```
   NODE_ENV=...
   SUPABASE_URL=postgres://... (mask this)
   etc.
   ```

3. **Deployment settings:**
   - Instance type: ...
   - Region: ...
   - Build command: ...
   - Start command: ...

Med dessa logs kan vi identifiera exakt vad som går fel! 🔍
