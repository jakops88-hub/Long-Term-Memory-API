# Prismodell - MemVault API

## 💰 Prisplaner

### 🆓 FREE Tier
- **Kostnad**: $0
- **Användning**: Begränsad tillgång
- **Överdrag**: Nej
- **Lämplig för**: Testa API:et

### 🏠 HOBBY Plan
- **Kostnad**: **$29/månad**
- **Inkluderat**: **100,000 tokens**
- **Överdrag**: **Nej - Hard limit**
- **När tokens tar slut**: API-anrop blockeras
- **Lämplig för**: Små projekt och hobbyprojekt

### 🚀 PRO Plan
- **Kostnad**: **$99/månad**
- **Inkluderat**: **1,000,000 tokens**
- **Överdrag**: **Ja - $0.003 per API-anrop** (efter 1M tokens används)
- **När tokens tar slut**: Fortsätter fungera, faktura skickas automatiskt
- **Lämplig för**: Produktion och professionella applikationer

---

## 📊 Hur Överdragsfakturering Fungerar (Pro Plan)

### Scenario: Pro-användare börjar med 1M tokens ($99 kredit)

```
Månad 1:
├─ 1,000,000 tokens inkluderade (från prenumeration)
├─ Använder 500,000 tokens
└─ 500,000 tokens kvar ✅ Ingen extra kostnad

Månad 2:
├─ 500,000 tokens från förra månaden
├─ + 1,000,000 nya tokens = 1,500,000 total
├─ Använder 1,200,000 tokens
└─ 300,000 tokens kvar ✅ Ingen extra kostnad

Månad 3 (hög användning):
├─ 300,000 tokens från förra månaden
├─ + 1,000,000 nya tokens = 1,300,000 total
├─ Använder 1,800,000 tokens
├─ Överdrag: 500,000 tokens (1,800,000 - 1,300,000)
│
└─ 🔔 Automatisk Stripe-faktura skickas
    ├─ Antal anrop: ~166,667 överdragsanrop
    ├─ Kostnad: 166,667 × $0.003 = ~$500.00
    ├─ Beskrivning: "166,667 calls @ $0.003/call (beyond 1M included tokens)"
    ├─ Betalning dras automatiskt
    └─ Nya tokens: 1,000,000 från nästa månads förnyelse ✅
```

### Fördelar med Pro Plan Överdrag:

1. **Ingen downtime** - API:et fortsätter fungera även vid hög användning
2. **Automatisk betalning** - Inga manuella topup-åtgärder
3. **Transparent kostnad** - Se exakt antal anrop i fakturan
4. **Flexibilitet** - Betala endast för vad du använder över basnivån

---

## 🔢 Exempel på Kostnadsberäkning

### Token-användning per Plan

| Plan | Inkluderade Tokens | Efter Tokens Tar Slut |
|------|-------------------|----------------------|
| **Hobby** | 100,000 tokens | ❌ Blockeras (hard limit) |
| **Pro** | 1,000,000 tokens | ✅ Fortsätter @ $0.003/anrop |

### Med Hobby Plan (100k tokens = $29)

| Tokens använt | Kostnad | Status |
|---------------|---------|--------|
| 50,000 | $0 | ✅ 50k tokens kvar |
| 100,000 | $0 | ✅ 0 tokens kvar |
| 100,001+ | - | ❌ **BLOCKERAT** |

| Tokens använt | Kostnad |
|---------------|---------|
| 500,000 | $0 (inom inkluderade) |
| 1,000,000 | $0 (exakt inkluderade) |
| 1,100,000 | ~$0.30 (100,000 tokens överdrag ≈ 33 anrop @ $0.003) |
| 1,500,000 | ~$1.50 (500,000 tokens överdrag ≈ 167 anrop @ $0.003) |
| 2,000,000 | ~$3.00 (1M tokens överdrag ≈ 333 anrop @ $0.003) |

### Break-even för Pro Plan
- **1,000,000 tokens/månad** ingår i $99 prenumeration
- Tokens rullar över mellan månader om de inte används
- Endast överdrag debiteras @ $0.003/anrop

**Exempel:**
```
Månad 1: Använder 600k tokens → 400k rullar över
Månad 2: 400k + 1M = 1.4M tillgängliga
         Använder 1.2M → 200k rullar över
Månad 3: 200k + 1M = 1.2M tillgängliga
```

---

## 🚨 Hur Begränsningar Fungerar

### HOBBY Plan (Hard Limit)
```typescript
Tokens: 100,000 (från $29 prenumeration)
│
├─ Använder 50,000 tokens: ✅ Fungerar
│  50,000 tokens kvar
│
├─ Använder ytterligare 50,000 tokens: ✅ Fungerar
│  0 tokens kvar
│
└─ Nästa API-anrop: ❌ Blockeras
   Response: 402 Payment Required
   Message: "Insufficient credits. Upgrade to Pro for unlimited usage."
   
   Måste vänta till nästa månad för nya 100k tokens
```

### PRO Plan (1M tokens inkluderade + Överdrag)
```typescript
Tokens: 1,000,000 (från $99 prenumeration)
│
├─ Månad 1: Använder 800k tokens ✅ 
│  200k tokens rullar över
│
├─ Månad 2: 200k + 1M = 1.2M tillgängliga
│  Använder 1.5M tokens
│  Överdrag: 300k tokens (~100 anrop @ $0.003)
│
└─ Stripe-faktura skickas automatiskt
   ├─ Belopp: ~$0.30
   ├─ Anrop: ~100 @ $0.003/call
   └─ Betalning dras → Nya 1M tokens från prenumeration
```

---

## 💳 Stripe-integration

### Automatiska Händelser

1. **Prenumeration startar**
   - Användare uppgraderas till HOBBY/PRO
   - Initial kredit läggs till balance

2. **Månadsförnyelse**
   - Ny månadskredit läggs till befintlig balance
   - Event: `invoice.payment_succeeded`

3. **Överdragsfaktura (endast Pro)**
   - Skapas när balance < $0
   - Beskrivning inkluderar antal anrop
   - Event: `invoice.payment_succeeded` → Balance nollställs

4. **Betalning misslyckades**
   - Event: `invoice.payment_failed`
   - TODO: Implementera suspension/nedgradering

5. **Prenumeration avslutad**
   - Event: `customer.subscription.deleted`
   - Användare nedgraderas till FREE

---

## 🔐 API-användning

### Kolla Balance (GET /api/billing/balance)
```json
{
  "userId": "user_123",
  "balance": 6900,  // $69.00 i cent
  "tier": "PRO",
  "canOverdraft": true
}
```

### Ladda Kredit (POST /api/billing/topup) - Hobby plan
```json
{
  "amount": 2900  // $29.00 i cent
}
```

---

## 📈 Rekommendationer

### Välj HOBBY om:
- ✅ Du behöver max 100,000 tokens/månad
- ✅ Du har förutsägbar, låg användning
- ✅ Du vill absolut kontroll över kostnader
- ✅ Du är OK med att API:et stoppas vid 100k tokens
- ✅ Du vill spara pengar med fast pris ($29 vs $99)

### Välj PRO om:
- ✅ Du behöver mer än 1M tokens/månad
- ✅ Du har varierande eller hög användning
- ✅ Du behöver garanterad uptime (ingen service-avbrott)
- ✅ Du vill betala per faktisk användning över basnivån
- ✅ Du kör i produktion med slutanvändare
- ✅ Du vill att oanvända tokens rullar över mellan månader

---

## 🛠️ Teknisk Implementation

### Kod för att debitera ett API-anrop:
```typescript
import { CostGuard } from './services/hybridCostGuard';

// Fast kostnad per anrop: $0.003
const cost = CostGuard.calculateApiCallCost(); // Returns 0.3 (cents)

// Dra av från användares balance
await CostGuard.deduct(userId, userContext, cost);
```

### Kostnadslogik:
- ✅ **RapidAPI-användare**: Ingen balanscheck (RapidAPI hanterar)
- ✅ **Direct FREE**: Blockeras vid $0
- ✅ **Direct HOBBY**: Blockeras vid $0 (hard limit)
- ✅ **Direct PRO**: Tillåten att gå negativt, faktura skickas automatiskt

---

## 📞 Support

För frågor om fakturering eller överdrag:
- Email: support@memvault.com
- Se dina fakturor: https://dashboard.stripe.com/invoices
