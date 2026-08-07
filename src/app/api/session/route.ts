// src/app/api/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSession, destroySession, getSessionUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function logAttempt(email: string, success: boolean, userId: string | null, req: NextRequest) {
  await prisma.monitorLoginLog.create({
    data: {
      email,
      userId,
      success,
      ip: req.headers.get('x-forwarded-for') ?? req.ip ?? null,
      userAgent: req.headers.get('user-agent'),
    },
  }).catch((err: unknown) => console.error('[session] failed to log login attempt:', err));
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({ email: '', password: '' }));

  if (!email || !password) {
    return NextResponse.json({ success: false, message: 'Email and password are required.' }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const user = await prisma.monitorUser.findUnique({ where: { email: normalizedEmail } });

  if (!user || !user.isActive) {
    await logAttempt(normalizedEmail, false, user?.id ?? null, req);
    // Same message whether the account doesn't exist or is deactivated —
    // avoids confirming which emails have accounts here.
    return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    await logAttempt(normalizedEmail, false, user.id, req);
    return NextResponse.json({ success: false, message: 'Invalid email or password.' }, { status: 401 });
  }

  await Promise.all([
    createSession({ userId: user.id, email: user.email, name: user.name }),
    prisma.monitorUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    logAttempt(normalizedEmail, true, user.id, req),
  ]);

  return NextResponse.json({ success: true, data: { email: user.email, name: user.name } });
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ success: true, data: { user: null } });
  return NextResponse.json({ success: true, data: { user: { email: user.email, name: user.name } } });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ success: true });
}
