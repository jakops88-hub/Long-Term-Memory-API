# Frontend API Key Authentication Fix

## Problem
Efter inloggning sparas inte API-nyckeln korrekt, vilket gör att Playground och andra sidor inte kan göra API-anrop. Felet "Failed to load API key" visas.

## Root Cause
1. API-nyckeln sparas inte i cookie efter lyckad inloggning
2. `lib/api.ts` skickar inte `Authorization: Bearer` header i API-anrop
3. `DemoUserSetup` component skapar fake user som skriver över riktig autentisering
4. Ingen login-sida finns ännu

## Lösning - Implementera Följande

### 1. Skapa Login Page (`app/login/page.tsx`)

**Skapa ny fil:** `app/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate API key format
      if (!apiKey.startsWith('sk_') || apiKey.length < 32) {
        throw new Error('Invalid API key format. Key must start with "sk_" and be at least 32 characters.');
      }

      // Validate API key with backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/me`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key');
        }
        throw new Error('Authentication failed');
      }

      const user = await response.json();

      // Save API key in cookie (30 days)
      document.cookie = `memvault_api_key=${apiKey}; path=/; max-age=2592000; secure; samesite=strict`;
      
      // Save user data in localStorage
      localStorage.setItem('memvault_user', JSON.stringify({
        ...user,
        apiKey: apiKey
      }));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid API key. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🧠 MemVault</h1>
          <p className="text-gray-600">Login with your API key</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
              API Key
            </label>
            <Input
              id="apiKey"
              type="text"
              placeholder="sk_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the API key you received via email after signup
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/pricing" className="text-blue-600 hover:underline">
            Get started
          </a>
        </div>
      </Card>
    </div>
  );
}
```

---

### 2. Uppdatera `lib/api.ts` - Lägg till Authentication Headers

**Hitta filen:** `lib/api.ts`

**Lägg till denna funktion högst upp i filen:**

```typescript
// Helper function to get authentication headers
const getAuthHeaders = (): HeadersInit => {
  // Try to get API key from cookie first
  const apiKey = document.cookie
    .split('; ')
    .find(row => row.startsWith('memvault_api_key='))
    ?.split('=')[1];
  
  if (!apiKey) {
    throw new Error('No API key found. Please login at /login');
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
};
```

**Uppdatera ALLA API-anrop att använda `getAuthHeaders()`:**

```typescript
export const memoryApi = {
  add: async (data: AddMemoryRequest) => {
    const response = await fetch(`${API_BASE_URL}/memory/add`, {
      method: 'POST',
      headers: getAuthHeaders(), // ← ADD THIS
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to add memory' }));
      throw new Error(error.error || 'Failed to add memory');
    }
    return response.json();
  },
  
  search: async (data: SearchMemoryRequest) => {
    const response = await fetch(`${API_BASE_URL}/memory/search`, {
      method: 'POST',
      headers: getAuthHeaders(), // ← ADD THIS
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to search memories' }));
      throw new Error(error.error || 'Failed to search memories');
    }
    return response.json();
  }
};

export const userApi = {
  getMe: async () => {
    const response = await fetch(`${API_BASE_URL}/user/me`, {
      headers: getAuthHeaders(), // ← ADD THIS
    });
    if (!response.ok) {
      throw new Error('Failed to get user info');
    }
    return response.json();
  },
  
  getApiKeys: async () => {
    const response = await fetch(`${API_BASE_URL}/user/api-keys`, {
      headers: getAuthHeaders(), // ← ADD THIS
    });
    if (!response.ok) {
      throw new Error('Failed to load API keys');
    }
    return response.json();
  },

  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/user/me`, {
      headers: getAuthHeaders(), // ← ADD THIS
    });
    if (!response.ok) {
      throw new Error('Failed to get user stats');
    }
    return response.json();
  }
};

export const billingApi = {
  getBalance: async () => {
    const response = await fetch(`${API_BASE_URL}/billing/balance`, {
      headers: getAuthHeaders(), // ← ADD THIS
    });
    if (!response.ok) {
      throw new Error('Failed to get balance');
    }
    return response.json();
  },

  createCheckoutSession: async () => {
    const response = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: getAuthHeaders(), // ← ADD THIS
    });
    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }
    return response.json();
  },

  createPortalSession: async () => {
    const response = await fetch(`${API_BASE_URL}/stripe/create-portal-session`, {
      method: 'POST',
      headers: getAuthHeaders(), // ← ADD THIS
    });
    if (!response.ok) {
      throw new Error('Failed to create portal session');
    }
    return response.json();
  }
};

// Add GraphRAG API with auth
export const graphRAGApi = {
  query: async (data: any) => {
    const response = await fetch(`${API_BASE_URL}/graphrag/query`, {
      method: 'POST',
      headers: getAuthHeaders(), // ← ADD THIS
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to query' }));
      throw new Error(error.error || 'Failed to query');
    }
    return response.json();
  }
};
```

---

### 3. Ta Bort DemoUserSetup Component

**Hitta filen:** `app/dashboard/layout.tsx` eller där `DemoUserSetup` används

**Ta bort eller kommentera ut:**

```typescript
// REMOVE THIS LINE:
// import DemoUserSetup from '@/components/DemoUserSetup';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* REMOVE THIS LINE: */}
      {/* <DemoUserSetup /> */}
      
      {/* Rest of your layout */}
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

**Alternativt, radera hela filen:** `components/DemoUserSetup.tsx`

---

### 4. Uppdatera Auth Context (`lib/auth-context.tsx`)

**Hitta filen:** `lib/auth-context.tsx`

**Uppdatera för att läsa från cookie:**

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  tier: string;
  apiKey?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (apiKey: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const apiKey = document.cookie
      .split('; ')
      .find(row => row.startsWith('memvault_api_key='))
      ?.split('=')[1];

    if (apiKey) {
      // Try to fetch user data
      fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/me`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      })
        .then(res => res.json())
        .then(userData => {
          setUser({ ...userData, apiKey });
          localStorage.setItem('memvault_user', JSON.stringify({ ...userData, apiKey }));
        })
        .catch(() => {
          // Invalid key, clear everything
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      // Try localStorage as fallback
      const savedUser = localStorage.getItem('memvault_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    }
  }, []);

  const login = async (apiKey: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/me`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error('Invalid API key');
    }

    const userData = await response.json();
    
    // Save to cookie
    document.cookie = `memvault_api_key=${apiKey}; path=/; max-age=2592000; secure; samesite=strict`;
    
    // Save to localStorage
    const user = { ...userData, apiKey };
    setUser(user);
    localStorage.setItem('memvault_user', JSON.stringify(user));
  };

  const logout = () => {
    // Clear cookie
    document.cookie = 'memvault_api_key=; path=/; max-age=0';
    
    // Clear localStorage
    localStorage.removeItem('memvault_user');
    
    // Clear state
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

### 5. Skapa Auth Middleware (`middleware.ts`)

**Skapa ny fil:** `middleware.ts` (i root-mappen bredvid `app/`)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const apiKey = request.cookies.get('memvault_api_key')?.value;
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/pricing', '/checkout/success', '/checkout/canceled'];
  
  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow static files and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Redirect to login if no API key for protected routes
  if (!apiKey && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

### 6. Uppdatera Landing Page (`app/page.tsx`)

**Ändra från redirect till faktisk landing page:**

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">🧠 MemVault</h1>
        <div className="space-x-4">
          <Link href="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link href="/pricing">
            <Button>Get Started</Button>
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Memory as a Service
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Store, retrieve, and manage contextual memories for your AI applications with MemVault's powerful API.
        </p>
        <Link href="/pricing">
          <Button size="lg" className="text-lg px-8 py-6">
            Start Building →
          </Button>
        </Link>
      </main>
    </div>
  );
}
```

---

### 7. Uppdatera Environment Variables

**Hitta filen:** `.env.local`

**Lägg till:**

```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.koyeb.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
NEXT_PUBLIC_STRIPE_PRICE_ID=price_your_price_id
```

---

## Testing Checklist

Efter implementering, testa följande:

### 1. Login Flow
- [ ] Gå till `/login`
- [ ] Ange API key: `sk_test_memvault_2025_production_key_abc123xyz789def456ghi`
- [ ] Klicka "Login"
- [ ] Ska redirecta till `/dashboard`
- [ ] Cookie `memvault_api_key` ska vara satt (kolla i DevTools)

### 2. Dashboard
- [ ] `/dashboard` visar användarstatistik
- [ ] Ingen error "Failed to load API key"
- [ ] User info hämtas från backend

### 3. Playground
- [ ] `/dashboard/playground` öppnas utan error
- [ ] Kan skapa memories
- [ ] Kan söka memories
- [ ] API-anrop fungerar

### 4. API Keys Page
- [ ] `/dashboard/api-keys` visar riktig API key
- [ ] Inte mock data längre
- [ ] Copy-knapp fungerar
- [ ] Visar rätt tier (PRO)

### 5. Auth Middleware
- [ ] Försök gå direkt till `/dashboard` utan login → redirect till `/login`
- [ ] Efter login, `/dashboard` är accessible
- [ ] Logout → redirect till landing page

### 6. Browser Console Check
Öppna DevTools Console och kör:
```javascript
// Should show your API key
document.cookie

// Should show user object with apiKey
JSON.parse(localStorage.getItem('memvault_user'))
```

---

## Common Issues & Solutions

### Issue: "No API key found" error
**Solution:** Kontrollera att `getAuthHeaders()` används i ALLA API-anrop i `lib/api.ts`

### Issue: Cookie sparas inte
**Solution:** Använd `secure` endast i production, ta bort för localhost:
```typescript
const isProduction = window.location.protocol === 'https:';
document.cookie = `memvault_api_key=${apiKey}; path=/; max-age=2592000; ${isProduction ? 'secure;' : ''} samesite=strict`;
```

### Issue: API key försvinner efter page reload
**Solution:** Kontrollera att AuthContext läser från cookie i `useEffect`

### Issue: DemoUserSetup skriver över riktig user
**Solution:** Radera helt `components/DemoUserSetup.tsx` och alla imports

---

## Expected Result

Efter implementation:

✅ Login page på `/login` där användare anger API key
✅ Cookie sparar API key säkert
✅ Alla API-anrop inkluderar `Authorization: Bearer` header
✅ Dashboard visar riktig användardata
✅ Playground fungerar med riktiga API-anrop
✅ API Keys page visar riktig nyckel från backend
✅ Auth middleware skyddar `/dashboard` routes
✅ Landing page på `/` istället för redirect

---

## Implementation Order

1. **Börja här:** Uppdatera `lib/api.ts` med `getAuthHeaders()`
2. Ta bort `DemoUserSetup` component
3. Skapa login page
4. Uppdatera auth context
5. Lägg till middleware
6. Fixa landing page
7. Testa hela flödet

Estimerad tid: **30-45 minuter**

---

## Test API Key

**För testning använd:**
```
sk_test_memvault_2025_production_key_abc123xyz789def456ghi
```

**Backend URL:**
```
https://your-backend.koyeb.app
```

**Test User Data:**
- Email: `test@memvault.com`
- User ID: `user_test_memvault_2025`
- Tier: `PRO`

---

**När allt är klart borde hela user journey fungera från login → dashboard → playground → API keys!** 🚀
