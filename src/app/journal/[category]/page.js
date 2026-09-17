import prisma from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function CategoryPage({ params }) {
  const resolvedParams = await params;
  const categoryStr = resolvedParams.category.toUpperCase();
  const validCategories = ['INBOX', 'PROJECTS', 'AREAS', 'RESOURCES', 'ARCHIVES'];

  if (!validCategories.includes(categoryStr)) {
    // Handling standard PARA mismatch by falling back or 404
    // Note: Since 'projects' is plural in URL, but singular in PARA usually, we'll map them.
    const mapping = {
      'PROJECTS': 'PROJECT',
      'AREAS': 'AREA',
      'RESOURCES': 'RESOURCE',
      'ARCHIVES': 'ARCHIVE',
      'INBOX': 'INBOX'
    };

    if (!mapping[categoryStr]) {
      notFound();
    }
  }

  const dbCategory = {
    'PROJECTS': 'PROJECT',
    'AREAS': 'AREA',
    'RESOURCES': 'RESOURCE',
    'ARCHIVES': 'ARCHIVE',
    'INBOX': 'INBOX'
  }[categoryStr];

  const notes = await prisma.note.findMany({
    where: { paraCategory: dbCategory },
    orderBy: [
      { touchCount: 'desc' },
      { lastTouchedAt: 'desc' }
    ]
  });

  return (
    <div className="w-full max-w-4xl mx-auto h-full flex flex-col p-8 animate-in slide-in-from-bottom-4 duration-700">

      <header className="mb-8">
        <p className="text-[var(--color-text-muted)]">
          {notes.length} notes found. Sorted by relevance (Touch Count).
        </p>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
        {notes.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[var(--color-glass-border)] rounded-xl text-[var(--color-text-muted)]">
            No notes in this category yet. Use Cmd+K to capture something!
          </div>
        ) : (
          notes.map(note => (
            <Link key={note.id} href={`/journal/note/${note.id}`} className="block">
              <div className="p-4 bg-[var(--color-bg-panel)] border border-[var(--color-glass-border)] rounded-xl hover:border-[var(--color-accent)] transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-[var(--color-text-main)]">{note.title}</h3>
                  <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded-full">
                    🔥 {note.touchCount} touches
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] line-clamp-2">
                  {note.summary || note.content.replace(/<[^>]+>/g, '') || "Empty note"}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
