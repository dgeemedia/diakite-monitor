// src/app/api/alerts/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const alerts = await prisma.alertState.findMany({ orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ success: true, data: { alerts } });
}