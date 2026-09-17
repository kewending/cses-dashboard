import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const layer = searchParams.get('layer');
    const status = searchParams.get('status');
    const includeLinks = searchParams.get('includeLinks') === 'true';

    const where = {};
    if (layer) where.layer = layer;
    if (status) where.status = status;

    const notes = await prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: includeLinks ? {
        linksIn: { include: { fromNote: true } },
        linksOut: { include: { toNote: true } }
      } : undefined
    });
    return NextResponse.json(notes);
  } catch (err) {
    console.error('Fetch notes error:', err);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const note = await prisma.note.create({
      data: {
        title: data.title || 'Untitled',
        content: data.content || '',
        layer: data.layer || 'L1',
        status: data.status || 'INCOMPLETE',
        paraCategory: data.paraCategory || 'INBOX',
        sourceUrl: data.sourceUrl || null,
        linkedProjectId: data.linkedProjectId || null
      }
    });

    if (data.linkFromId) {
      await prisma.noteLink.create({
        data: { fromId: data.linkFromId, toId: note.id }
      });
    }
    if (data.linkToId) {
      await prisma.noteLink.create({
        data: { fromId: note.id, toId: data.linkToId }
      });
    }

    return NextResponse.json(note);
  } catch (err) {
    console.error('Note creation error:', err);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
