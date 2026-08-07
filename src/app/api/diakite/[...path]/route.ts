// src/app/api/diakite/[...path]/route.ts
// Server-side proxy: browser -> this route -> diakite.onrender.com/api/admin/*
//
// The monitoring bot's JWT never reaches the browser. This route is
// read-only by design (GET-only forward) since the dashboard should never
// be able to mutate production state — approve drivers, refund payments,
// etc. That stays in the real admin-web app.

import { NextRequest, NextResponse } from 'next/server';
import { getDiakiteToken, getDiakiteBaseUrl } from '@/lib/diakiteAuth';

export const dynamic = 'force-dynamic';

// Explicit allowlist of admin sub-paths this dashboard is permitted to read.
// Add to this as you wire up more pages — deliberately NOT a wildcard, so a
// typo or a future page can't accidentally expose a write endpoint.
const ALLOWED_PREFIXES = [
  'dashboard/stats',
  'payments/stats',
  'payments',
  'refunds',
  'analytics/revenue',
  'analytics/performance',
  'analytics/commission',
  'analytics/user-growth',
  'shield/stats',
  'shield/sessions',
  'duopay/stats',
  'duopay/accounts',
  'logs',
  'feedback/stats',
  'feedback',
  'rides/live',
  'deliveries/live',
  'corporate/companies',
];

function isAllowed(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');

  if (!isAllowed(path)) {
    return NextResponse.json({ success: false, message: `Path not allowlisted: ${path}` }, { status: 403 });
  }

  const search = req.nextUrl.search; // includes leading "?" if present
  const target = `${getDiakiteBaseUrl()}/api/admin/${path}${search}`;

  const doFetch = async (token: string) =>
    fetch(target, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

  try {
    let token = await getDiakiteToken();
    let upstream = await doFetch(token);

    // Token may have been invalidated server-side (password rotated, TTL
    // expired sooner than expected) — refresh once and retry before failing.
    if (upstream.status === 401) {
      token = await getDiakiteToken(true);
      upstream = await doFetch(token);
    }

    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch (err) {
    console.error('[diakite proxy] request failed:', err);
    return NextResponse.json(
      { success: false, message: 'Failed to reach Diakite backend.' },
      { status: 502 }
    );
  }
}
