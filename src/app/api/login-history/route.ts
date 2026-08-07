// src/app/api/flagged-activity/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const logs = await prisma.monitorLoginLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return NextResponse.json({ success: true, data: { logs } });
}
