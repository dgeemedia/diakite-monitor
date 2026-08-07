// src/app/api/flagged-activity/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const flags = await prisma.flaggedActivity.findMany({
    orderBy: { occurredAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ success: true, data: { flags } });
}
