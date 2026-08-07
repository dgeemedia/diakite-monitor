// src/app/login/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.message ?? 'Login failed.');
      return;
    }

    router.push(searchParams.get('next') ?? '/');
    router.refresh();
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Diakite Monitor</h1>
        <p>Internal ops dashboard — access restricted</p>
        {error && <div className="login-error">{error}</div>}
        <input
          type="email"
          placeholder="you@diakite.internal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button type="submit" disabled={loading || !email || !password}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <p style={{ marginTop: 14, fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
          No account? Ask whoever runs this dashboard to create one with{' '}
          <code>pnpm create-user</code>.
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}