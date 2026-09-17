'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Edit3, Trash2, PlusCircle, Search } from 'lucide-react';
import Link from 'next/link';

export default function SecondBrainLists({ initialInbox, initialIncomplete }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleGarbageCollection = async () => {
    if (!confirm('Are you sure you want to delete all isolated notes (0 links)?')) return;
    setIsDeleting(true);
    try {
      // Need an API for this or we can do it via a bulk delete route
      // Let's create a quick API call to a new endpoint we will build
      const res = await fetch('/api/notes/cleanup', { method: 'POST' });
      if (res.ok) {
        alert('Isolated notes cleaned up successfully!');
        router.refresh();
      } else {
        alert('Failed to clean up notes');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const NoteCard = ({ note, icon: Icon, colorClass }) => (
    <Link href={`/journal/editor/${note.id}`} className="block">
      <div className={`p-4 rounded-xl bg-[var(--color-bg-dark)] border border-[var(--color-glass-border)] hover:bg-[var(--color-bg-panel-hover)] transition-all flex items-start gap-4 mb-3 group`}>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 mt-1`}>
          <Icon size={18} className={colorClass} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--color-text-main)] group-hover:text-[var(--color-accent)] transition-colors">
            {note.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-text-muted)]">
            <span className="px-2 py-0.5 rounded-full bg-[var(--color-bg-panel)] border border-[var(--color-glass-border)]">
              {note.layer}
            </span>
            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar flex gap-8">
      
      {/* Inbox Column */}
      <div className="flex-1 flex flex-col bg-[var(--color-bg-panel)] rounded-2xl p-6 border border-[var(--color-glass-border)] shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-[var(--color-text-main)] font-semibold text-lg">
            <Inbox className="text-blue-400" />
            <h2>Inbox (L1 Raw)</h2>
          </div>
          <span className="bg-[var(--color-bg-dark)] px-2 py-1 rounded-md text-xs text-[var(--color-text-muted)] border border-[var(--color-glass-border)]">
            {initialInbox.length} items
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {initialInbox.length === 0 ? (
            <div className="text-center text-[var(--color-text-muted)] mt-10">
              <p>Inbox is empty.</p>
              <p className="text-sm mt-2">Use <kbd className="bg-[var(--color-bg-dark)] px-1 py-0.5 rounded border border-[var(--color-glass-border)]">Cmd+K</kbd> to capture.</p>
            </div>
          ) : (
            initialInbox.map(note => (
              <NoteCard key={note.id} note={note} icon={Inbox} colorClass="text-blue-400" />
            ))
          )}
        </div>
      </div>

      {/* Incomplete / Processing Column */}
      <div className="flex-1 flex flex-col bg-[var(--color-bg-panel)] rounded-2xl p-6 border border-[var(--color-glass-border)] shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-[var(--color-text-main)] font-semibold text-lg">
            <Edit3 className="text-orange-400" />
            <h2>Incomplete Notes</h2>
          </div>
          <span className="bg-[var(--color-bg-dark)] px-2 py-1 rounded-md text-xs text-[var(--color-text-muted)] border border-[var(--color-glass-border)]">
            {initialIncomplete.length} items
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {initialIncomplete.length === 0 ? (
            <div className="text-center text-[var(--color-text-muted)] mt-10">
              <p>All caught up!</p>
            </div>
          ) : (
            initialIncomplete.map(note => (
              <NoteCard key={note.id} note={note} icon={Edit3} colorClass="text-orange-400" />
            ))
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--color-glass-border)] flex justify-end">
          <button 
            onClick={handleGarbageCollection}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/30 transition-colors border border-transparent hover:border-red-900/50"
          >
            {isDeleting ? <Search className="animate-spin" size={16} /> : <Trash2 size={16} />}
            Cleanup Isolated Notes
          </button>
        </div>
      </div>

    </div>
  );
}
