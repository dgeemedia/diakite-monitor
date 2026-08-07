import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const alerts = await prisma.alertState.findMany({ orderBy: { updatedAt: 'desc' } });
  return NextResponse.json({ success: true, data: { alerts } });
}
