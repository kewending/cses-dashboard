import prisma from '@/lib/prisma';
import SecondBrainLists from './SecondBrainLists';

export const revalidate = 0; // Disable static rendering

export default async function SecondBrainPage() {
  // Fetch L1 Inbox: Notes that are L1 and have NO outgoing links to L2
  const inboxNotes = await prisma.note.findMany({
    where: {
      layer: 'L1',
      linksOut: { none: {} }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch Incomplete Notes: Any note with INCOMPLETE status, ordered by recent
  const incompleteNotes = await prisma.note.findMany({
    where: {
      status: 'INCOMPLETE'
    },
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="w-full h-full max-w-6xl mx-auto flex flex-col animate-in slide-in-from-bottom-4 duration-700">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text-main)] mb-2">Second Brain</h1>
          <p className="text-[var(--color-text-muted)]">Save Work, Not Information.</p>
        </div>
      </header>

      <SecondBrainLists 
        initialInbox={inboxNotes} 
        initialIncomplete={incompleteNotes} 
      />
    </div>
  );
}
