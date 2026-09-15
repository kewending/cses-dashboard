import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const contactId = formData.get('contactId');

    if (!file || !contactId) {
      return NextResponse.json({ error: 'Missing file or contactId' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Compress with sharp: resize to 400x400 cover, convert to WebP quality 80
    const compressed = await sharp(buffer)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80 })
      .toBuffer();

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
    await mkdir(uploadDir, { recursive: true });

    const filename = `${contactId}.webp`;
    const filepath = join(uploadDir, filename);
    await writeFile(filepath, compressed);

    const avatarUrl = `/uploads/avatars/${filename}`;

    // Update contact in DB
    await prisma.contact.update({
      where: { id: contactId },
      data: { avatarUrl },
    });

    return NextResponse.json({ avatarUrl });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
