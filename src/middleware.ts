import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'diakite_monitor_session';
// /api/alerts/evaluate is hit by Vercel Cron, which has no session cookie —
// it authenticates itself separately via CRON_SECRET inside the route.
const PUBLIC_PATHS = ['/login', '/api/session', '/api/alerts/evaluate'];

function getSecretKey() {
  return new TextEncoder().encode(process.env.SESSION_SECRET ?? '');
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return redirectToLogin(req);
  }

  try {
    await jwtVerify(token, getSecretKey());
    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest) {
  // API routes get a 401 JSON response, page routes get redirected.
  if (req.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
  }
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
