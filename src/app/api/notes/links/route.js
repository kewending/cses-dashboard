import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { fromId, toId } = await request.json();
    if (!fromId || !toId) {
      return NextResponse.json({ error: 'Missing fromId or toId' }, { status: 400 });
    }
    
    const link = await prisma.noteLink.create({
      data: { fromId, toId }
    });
    
    return NextResponse.json(link);
  } catch (err) {
    console.error('NoteLink creation error:', err);
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromId = searchParams.get('fromId');
    const toId = searchParams.get('toId');
    
    if (!fromId || !toId) {
      return NextResponse.json({ error: 'Missing fromId or toId' }, { status: 400 });
    }

    await prisma.noteLink.delete({
      where: {
        fromId_toId: {
          fromId,
          toId
        }
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete link error:', err);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
