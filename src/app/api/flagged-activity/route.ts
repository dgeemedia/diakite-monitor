import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const flags = await prisma.flaggedActivity.findMany({
    orderBy: { occurredAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ success: true, data: { flags } });
}
