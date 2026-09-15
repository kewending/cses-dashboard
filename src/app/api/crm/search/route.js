import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const exclude = searchParams.get('exclude') || '';

  try {
    const contacts = await prisma.contact.findMany({
      where: {
        AND: [
          { id: { not: exclude } },
          { status: 'active' },
          {
            OR: [
              { fullName: { contains: q } },
              { chineseName: { contains: q } },
              { displayName: { contains: q } },
            ],
          },
        ],
      },
      select: { id: true, fullName: true, chineseName: true, avatarUrl: true, tier: true },
      take: 10,
      orderBy: { fullName: 'asc' },
    });
    return NextResponse.json(contacts);
  } catch (e) {
    console.error('CRM search error:', e);
    return NextResponse.json([], { status: 500 });
  }
}
