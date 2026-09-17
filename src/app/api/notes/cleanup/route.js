import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Find notes that have 0 linksIn and 0 linksOut
    const isolatedNotes = await prisma.note.findMany({
      where: {
        linksIn: { none: {} },
        linksOut: { none: {} },
      },
      select: { id: true }
    });

    const idsToDelete = isolatedNotes.map(n => n.id);

    if (idsToDelete.length > 0) {
      await prisma.note.deleteMany({
        where: { id: { in: idsToDelete } }
      });
    }

    return NextResponse.json({ success: true, count: idsToDelete.length });
  } catch (err) {
    console.error('Garbage collection error:', err);
    return NextResponse.json({ error: 'Failed to clean up notes' }, { status: 500 });
  }
}
