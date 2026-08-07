// Server-only. Logs into the Diakite backend using the dedicated monitoring
// bot account and caches the resulting JWT in memory for the lifetime of
// this serverless function instance. Never import this from a client component.

import 'server-only';

const BASE_URL = process.env.DIAKITE_API_BASE_URL;
const EMAIL = process.env.DIAKITE_MONITOR_EMAIL;
const PASSWORD = process.env.DIAKITE_MONITOR_PASSWORD;

interface CachedToken {
  token: string;
  fetchedAt: number;
}

// Module-level cache — persists across requests on a warm Vercel lambda,
// gets rebuilt on cold start. Cheap and good enough for a read-only bot.
let cached: CachedToken | null = null;

// Diakite JWTs aren't guaranteed to carry a long expiry — refresh
// proactively every 20 minutes rather than trying to decode the token.
const MAX_TOKEN_AGE_MS = 20 * 60 * 1000;

async function login(): Promise<string> {
  if (!BASE_URL || !EMAIL || !PASSWORD) {
    throw new Error(
      'Missing DIAKITE_API_BASE_URL, DIAKITE_MONITOR_EMAIL, or DIAKITE_MONITOR_PASSWORD env vars.'
    );
  }

  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Diakite monitor-bot login failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  // auth.controller's login response shape — adjust the path below if your
  // controller nests the token differently (e.g. data.token vs data.accessToken).
  const token: string | undefined = json?.data?.token ?? json?.token;

  if (!token) {
    throw new Error('Diakite login succeeded but no token was found in the response.');
  }

  return token;
}

export async function getDiakiteToken(forceRefresh = false): Promise<string> {
  const isStale = !cached || Date.now() - cached.fetchedAt > MAX_TOKEN_AGE_MS;

  if (forceRefresh || isStale) {
    const token = await login();
    cached = { token, fetchedAt: Date.now() };
  }

  return cached!.token;
}

export function getDiakiteBaseUrl(): string {
  if (!BASE_URL) throw new Error('DIAKITE_API_BASE_URL is not set.');
  return BASE_URL;
}
