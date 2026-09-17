'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Link as LinkIcon, FilePlus, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function QuickCaptureModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [layer, setLayer] = useState('L1');
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  const saveToInbox = async (data) => {
     try {
       await fetch('/api/notes', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data)
       });
       router.refresh();
     } catch (err) {
       console.error("Failed to save note:", err);
     }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const urlPattern = /^(https?:\/\/[^\s]+)/;
    const match = input.match(urlPattern);

    if (match && layer === 'L1') {
      setIsScraping(true);
      setError(null);
      try {
        const url = match[1];
        const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('Failed to scrape URL');
        
        const metadata = await res.json();
        await saveToInbox({
          title: metadata.title || 'Untitled Link',
          content: metadata.description || '',
          sourceUrl: url,
          layer: 'L1',
          paraCategory: 'INBOX',
          status: 'INCOMPLETE'
        });
        
        setInput('');
        setLayer('L1');
        setIsOpen(false);
      } catch (err) {
        setError('Failed to extract metadata. Saving as raw link.');
        await saveToInbox({
          title: 'Captured Link',
          content: input,
          sourceUrl: match[1],
          layer: 'L1',
          paraCategory: 'INBOX',
          status: 'INCOMPLETE'
        });
        setInput('');
        setLayer('L1');
        setIsOpen(false);
      } finally {
        setIsScraping(false);
      }
    } else {
      await saveToInbox({
        title: input,
        content: '',
        layer: layer,
        paraCategory: layer === 'L1' ? 'INBOX' : 'RESOURCE',
        status: 'INCOMPLETE'
      });
      setInput('');
      setLayer('L1');
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-[var(--color-bg-dark)]/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[var(--color-bg-panel)] rounded-2xl shadow-2xl overflow-hidden border border-[var(--color-glass-border)]">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="flex items-center px-4 border-b border-[var(--color-glass-border)]">
            <Search className="text-[var(--color-text-muted)] mr-3" size={24} />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Title of note, or paste a URL for L1..."
              className="flex-1 py-5 bg-transparent border-none outline-none text-lg text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]"
            />
            
            <select 
              value={layer} 
              onChange={e => setLayer(e.target.value)}
              className="bg-[var(--color-bg-dark)] text-[var(--color-text-main)] border border-[var(--color-glass-border)] rounded-md px-3 py-2 mr-3 outline-none"
            >
              <option value="L1">L1 (Raw Source)</option>
              <option value="L2">L2 (Summary)</option>
              <option value="L3">L3 (Atomic)</option>
            </select>

            <div className="flex items-center space-x-2">
              {isScraping && <Loader2 className="animate-spin text-[var(--color-accent)]" size={20} />}
              <button type="button" onClick={() => setIsOpen(false)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
                <X size={20} />
              </button>
            </div>
          </div>
          
          {error && (
            <div className="px-4 py-2 bg-red-900/30 text-red-400 text-sm border-b border-red-900/50">
              {error}
            </div>
          )}

          <div className="px-4 py-3 bg-[var(--color-bg-dark)]/50 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center space-x-4">
              <span className="flex items-center"><LinkIcon size={14} className="mr-1"/> L1 auto-extracts URLs</span>
              <span className="flex items-center"><FilePlus size={14} className="mr-1"/> Saves to Inbox/Second Brain</span>
            </div>
            <div className="flex space-x-2">
              <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-panel)] border border-[var(--color-glass-border)]">ESC</span> to close
              <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-panel)] border border-[var(--color-glass-border)] ml-2">↵</span> to save
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
