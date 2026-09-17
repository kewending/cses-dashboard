import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        linksIn: { include: { fromNote: true } },
        linksOut: { include: { toNote: true } },
      }
    });

    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(note);
  } catch (err) {
    console.error('Fetch note error:', err);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    const note = await prisma.note.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        status: data.status,
        layer: data.layer,
        paraCategory: data.paraCategory,
        sourceUrl: data.sourceUrl,
        linkedProjectId: data.linkedProjectId,
        touchCount: data.touchCount !== undefined ? { increment: 1 } : undefined,
        lastTouchedAt: data.touchCount !== undefined ? new Date() : undefined,
      }
    });
    return NextResponse.json(note);
  } catch (err) {
    console.error('Update note error:', err);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.note.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete note error:', err);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
