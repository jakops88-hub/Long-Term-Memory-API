# 🎯 Frontend Fixes - MemVault Dashboard

## Översikt
Din dashboard är 80% färdig men saknar några kritiska delar för att fungera i produktion. Här är vad som behöver implementeras:

---

## 1️⃣ **KRITISKT: Landing Page & Public Entry Point**

### Problem
- `/app/page.tsx` redirectar direkt till `/dashboard` utan auth check
- Inga nya användare kan komma in i systemet
- Ingen "Get Started" flow

### Lösning
Skapa en modern landing page med dessa komponenter:

**Fil: `app/page.tsx`**
```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Brain, Zap, Shield, CheckCircle } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">MemVault</span>
          </div>
          <Link href="/login">
            <Button variant="outline">Login</Button>
          </Link>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Memory as a Service
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            Persistent memory API for AI applications. Store, retrieve, and
            search memories with semantic understanding.
          </p>
          <Link href="/pricing">
            <Button size="lg" className="text-lg px-8 py-6">
              Get Started - $29/month
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <Zap className="h-10 w-10 text-blue-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Fast & Scalable</h3>
            <p className="text-slate-400">
              Vector-based semantic search with PostgreSQL + pgvector
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <Shield className="h-10 w-10 text-blue-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Secure</h3>
            <p className="text-slate-400">
              API key authentication with usage tracking and rate limiting
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
            <CheckCircle className="h-10 w-10 text-blue-500 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Simple API</h3>
            <p className="text-slate-400">
              RESTful API with comprehensive documentation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 2️⃣ **Pricing Page med Public Checkout**

**Fil: `app/pricing/page.tsx`**
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, Brain } from "lucide-react";

export default function PricingPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async () => {
    if (!email) {
      alert("Please enter your email");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/public/stripe/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create checkout");

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      <nav className="container mx-auto px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Brain className="h-8 w-8 text-blue-500" />
          <span className="text-2xl font-bold text-white">MemVault</span>
        </Link>
      </nav>

      <div className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white text-center mb-12">
            Simple, Transparent Pricing
          </h1>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Hobby Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Hobby</CardTitle>
                <div className="text-3xl font-bold">$29<span className="text-sm text-muted-foreground">/month</span></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    100,000 credits/month
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Semantic search
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    GraphRAG support
                  </li>
                </ul>
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button
                    onClick={handleCheckout}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Loading..." : "Get Started"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-blue-500 border-2">
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <div className="text-3xl font-bold">$99<span className="text-sm text-muted-foreground">/month</span></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    1,000,000 credits/month
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Advanced analytics
                  </li>
                </ul>
                <Button className="w-full" variant="outline">
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 3️⃣ **Login Page**

**Fil: `app/login/page.tsx`**
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey || !apiKey.startsWith("sk_")) {
      alert("Please enter a valid API key (starts with sk_)");
      return;
    }

    try {
      setIsLoading(true);

      // Verify API key by fetching user stats
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/me`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Invalid API key");
      }

      const userData = await response.json();

      // Save to auth context (which saves to localStorage)
      setUser({
        id: userData.id,
        email: userData.email,
        apiKey: apiKey,
        tier: userData.tier,
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      alert("Invalid API key. Please check your key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex items-center gap-2 justify-center mb-4">
            <Brain className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold">MemVault</span>
          </Link>
          <CardTitle>Login with API Key</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="sk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Check your email for your API key
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/pricing" className="text-blue-500 hover:underline">
                Get started
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 4️⃣ **Auth Guards Middleware**

**Fil: `middleware.ts` (i root av projektet)**
```tsx
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes som inte kräver auth
  const publicRoutes = ["/", "/pricing", "/login"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route);

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if accessing dashboard routes
  if (pathname.startsWith("/dashboard")) {
    // Check for API key in cookies (we'll set this on login)
    const apiKey = request.cookies.get("memvault_api_key");

    if (!apiKey) {
      // Redirect to login if no API key
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**Uppdatera också AuthContext för att spara API key i cookie:**

**Fil: `lib/auth-context.tsx`**
```tsx
// Lägg till i setUserWithStorage funktionen:
const setUserWithStorage = (newUser: User | null) => {
  setUser(newUser);
  if (newUser) {
    localStorage.setItem('memvault_user', JSON.stringify(newUser));
    // Save API key to cookie for middleware
    document.cookie = `memvault_api_key=${newUser.apiKey}; path=/; max-age=2592000`; // 30 days
  } else {
    localStorage.removeItem('memvault_user');
    // Clear cookie
    document.cookie = 'memvault_api_key=; path=/; max-age=0';
  }
};
```

---

## 5️⃣ **Success/Cancel Pages efter Checkout**

**Fil: `app/checkout/success/page.tsx`**
```tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail } from "lucide-react";

export default function CheckoutSuccessPage() {
  useEffect(() => {
    // Optional: Track conversion
    console.log("Checkout successful");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Mail className="h-5 w-5" />
            <p>Check your email for your API key</p>
          </div>
          <p className="text-sm text-muted-foreground">
            We've sent your API key to your email address. Use it to login and
            start using the MemVault API.
          </p>
          <div className="space-y-2">
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Fil: `app/checkout/canceled/page.tsx`**
```tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function CheckoutCanceledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Checkout Canceled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Your payment was canceled. No charges were made.
          </p>
          <div className="space-y-2">
            <Link href="/pricing">
              <Button className="w-full">Try Again</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 6️⃣ **Real API Keys Management**

**Uppdatera: `app/dashboard/api-keys/page.tsx`**

Ersätt hela filen med:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff, Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);
      const storedUser = localStorage.getItem("memvault_user");
      const apiKey = storedUser ? JSON.parse(storedUser).apiKey : null;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/api-keys`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch API keys");

      const data = await response.json();
      setApiKeys(data.apiKeys || []);
    } catch (error) {
      console.error("Failed to load API keys:", error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });
  };

  const toggleVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;

    try {
      const storedUser = localStorage.getItem("memvault_user");
      const apiKey = storedUser ? JSON.parse(storedUser).apiKey : null;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/api-keys/${keyId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete API key");

      toast({
        title: "Success",
        description: "API key deleted",
      });

      loadApiKeys();
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast({
        title: "Error",
        description: "Failed to delete API key",
        variant: "destructive",
      });
    }
  };

  const maskApiKey = (key: string) => {
    return `${key.substring(0, 7)}${"•".repeat(20)}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your API keys for accessing MemVault services
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Create New Key (Coming Soon)
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <svg
                className="h-5 w-5 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Keep your API keys secure
              </p>
              <p className="mt-1 text-sm text-blue-700">
                Never share your API keys publicly or commit them to version
                control. Store them securely in environment variables.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground">No API keys found</p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((apiKey) => (
            <Card key={apiKey.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{apiKey.name}</CardTitle>
                    <CardDescription>
                      Created on {new Date(apiKey.createdAt).toLocaleDateString()}
                      {apiKey.lastUsed && ` • Last used ${apiKey.lastUsed}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility(apiKey.id)}
                    >
                      {visibleKeys.has(apiKey.id) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(apiKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDelete(apiKey.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted p-3 font-mono text-sm">
                  {visibleKeys.has(apiKey.id)
                    ? apiKey.key
                    : maskApiKey(apiKey.key)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
```

**Lägg också till toast hook:**

**Fil: `hooks/use-toast.ts`**
```tsx
import { useState } from "react";

export const useToast = () => {
  const toast = ({ title, description, variant }: any) => {
    alert(`${title}\n${description}`);
  };

  return { toast };
};
```

---

## 7️⃣ **Environment Variables**

**Skapa/uppdatera: `.env.local`**
```bash
NEXT_PUBLIC_BACKEND_URL=https://moderate-krystal-memvault-af80fe26.koyeb.app
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_XXXXX  # Din Stripe Price ID
```

---

## 8️⃣ **Uppdatera Redirect URLs i Public Checkout**

**Fil: `src/routes/publicStripeRoutes.ts` (Backend - men för referens)**

Säkerställ att success/cancel URLs pekar på rätt ställe:
```typescript
success_url: `${corsOrigin}/checkout/success`,
cancel_url: `${corsOrigin}/checkout/canceled`,
```

---

## ✅ **Checklista**

- [ ] Skapa landing page (`/`)
- [ ] Skapa pricing page (`/pricing`)
- [ ] Skapa login page (`/login`)
- [ ] Lägg till middleware för auth guards
- [ ] Uppdatera AuthContext med cookie support
- [ ] Skapa success page (`/checkout/success`)
- [ ] Skapa canceled page (`/checkout/canceled`)
- [ ] Implementera real API keys management
- [ ] Sätt environment variables
- [ ] Ta bort `DemoUserSetup` från alla dashboard pages

---

## 🚀 **Test Flow**

1. Ny användare går till `/pricing`
2. Fyller i email och klickar "Get Started"
3. Redirectas till Stripe checkout
4. Betalar med test-kort: `4242 4242 4242 4242`
5. Redirectas till `/checkout/success`
6. Får email med API key
7. Går till `/login` och loggar in med API key
8. Kommer in i dashboard
9. Kan se sin API key under `/dashboard/api-keys`

---

## 📝 **Notera**

Backend behöver också:
- ✅ Email service (Resend/SendGrid)
- ✅ `GET /api/user/me` endpoint
- ✅ `GET /api/user/api-keys` endpoint
- ✅ `DELETE /api/user/api-keys/:id` endpoint

(Backend-delen kommer att implementeras separat)
