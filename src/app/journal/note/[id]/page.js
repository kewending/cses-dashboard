import prisma from '@/lib/prisma';
import SecondBrainEditor from '@/components/Editor/SecondBrainEditor';
import BacklinkPanel from '@/components/KnowledgeGraph/BacklinkPanel';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function NotePage({ params }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      linksOut: { include: { toNote: true } },
      linksIn: { include: { fromNote: true } }
    }
  });

  if (!note) {
    notFound();
  }

  // Update touch count implicitly on view (simplified)
  await prisma.note.update({
    where: { id },
    data: { 
      touchCount: { increment: 1 },
      lastTouchedAt: new Date()
    }
  });

  const allBacklinks = [...(note.linksIn || []).map(l => l.fromNote), ...(note.linksOut || []).map(l => l.toNote)];

  return (
    <div className="w-full max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-8 text-[var(--color-text-muted)] mt-8">
        <Link href={`/journal/${note.paraCategory.toLowerCase()}`} className="hover:text-[var(--color-text-main)] transition-colors">
          ← Back to {note.paraCategory}
        </Link>
        <span>/</span>
        <span>Note</span>
      </div>

      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--color-text-main)] mb-2 outline-none">
          {note.title}
        </h1>
        {note.sourceUrl && (
          <a href={note.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline text-sm break-all">
            {note.sourceUrl}
          </a>
        )}
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-12">
        <SecondBrainEditor 
          initialContent={note.content} 
          onSave={async (html) => {
            'use server';
            await prisma.note.update({
              where: { id },
              data: { content: html, touchCount: { increment: 1 }, lastTouchedAt: new Date() }
            });
          }}
        />

        <BacklinkPanel 
          backlinks={allBacklinks} 
          dailyLogMentions={[]} 
        />
      </div>
    </div>
  );
}
