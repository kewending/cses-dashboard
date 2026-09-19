'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Circle, Plus, Search, Loader2, Edit3, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from 'lucide-react';
import SecondBrainEditor from '@/components/Editor/SecondBrainEditor';

export default function ThreePaneEditor({ initialId }) {
  const router = useRouter();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  
  // Search states for linking
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  const [leftResults, setLeftResults] = useState([]);
  const [rightResults, setRightResults] = useState([]);
  const [isSearchingLeft, setIsSearchingLeft] = useState(false);
  const [isSearchingRight, setIsSearchingRight] = useState(false);

  // Accordion state
  const [maximizedInputId, setMaximizedInputId] = useState(null);
  const [maximizedOutputId, setMaximizedOutputId] = useState(null);

  // Panel sizing state
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(320);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingLeft.current) {
        let newWidth = e.clientX;
        if (newWidth < 0) newWidth = 0;
        const max = window.innerWidth * 0.5;
        if (newWidth > max) newWidth = max;
        setLeftWidth(newWidth);
      } else if (isResizingRight.current) {
        let newWidth = window.innerWidth - e.clientX;
        if (newWidth < 0) newWidth = 0;
        const max = window.innerWidth * 0.5;
        if (newWidth > max) newWidth = max;
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingLeft.current = false;
      isResizingRight.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizingLeft = (e) => {
    e.preventDefault();
    isResizingLeft.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const startResizingRight = (e) => {
    e.preventDefault();
    isResizingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const toggleLeft = () => setLeftWidth(w => w > 0 ? 0 : 320);
  const toggleRight = () => setRightWidth(w => w > 0 ? 0 : 320);

  const fetchNote = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notes/${id}`);
      const data = await res.json();
      setNote(data);
      setTitle(data.title);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNote(initialId);
  }, [initialId]);

  const updateNote = async (updates) => {
    try {
      const res = await fetch(`/api/notes/${initialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      setNote(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleTitleChange = (e) => setTitle(e.target.value);
  const handleTitleBlur = () => {
    if (title !== note.title) updateNote({ title });
  };

  const toggleStatus = () => {
    const newStatus = note.status === 'COMPLETED' ? 'INCOMPLETE' : 'COMPLETED';
    updateNote({ status: newStatus });
  };

  const handleCreateAndLink = async (direction) => {
    const newLayer = direction === 'input' 
      ? (note.layer === 'L3' ? 'L2' : 'L1')
      : (note.layer === 'L1' ? 'L2' : 'L3');

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled Note',
          layer: newLayer,
          status: 'INCOMPLETE',
          paraCategory: newLayer === 'L1' ? 'INBOX' : 'RESOURCE',
          linkToId: direction === 'input' ? initialId : undefined,
          linkFromId: direction === 'output' ? initialId : undefined
        })
      });
      const newNote = await res.json();
      router.push(`/journal/editor/${newNote.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLinkExisting = async (id, direction) => {
    try {
      await fetch('/api/notes/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId: direction === 'input' ? id : initialId,
          toId: direction === 'output' ? id : initialId
        })
      });
      fetchNote(initialId);
      setLeftSearch('');
      setRightSearch('');
      setLeftResults([]);
      setRightResults([]);
    } catch (err) {
      console.error(err);
    }
  };

  const searchNotes = async (query, setResults, setIsSearching) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch('/api/notes');
      const allNotes = await res.json();
      const filtered = allNotes.filter(n => 
        n.id !== initialId && 
        n.title.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => searchNotes(leftSearch, setLeftResults, setIsSearchingLeft), 300);
    return () => clearTimeout(timer);
  }, [leftSearch]);

  useEffect(() => {
    const timer = setTimeout(() => searchNotes(rightSearch, setRightResults, setIsSearchingRight), 300);
    return () => clearTimeout(timer);
  }, [rightSearch]);

  if (loading || !note) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[var(--color-accent)]">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  const inputs = note.linksIn?.map(link => link.fromNote) || [];
  const outputs = note.linksOut?.map(link => link.toNote) || [];

  return (
    <div className="h-full w-full flex flex-col bg-[var(--color-bg-dark)]">
      {/* Top Navbar */}
      <div className="h-14 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-panel)] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/journal" className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors">
            <ArrowLeft size={18} />
            <span>Back</span>
          </Link>
          <div className="w-px h-6 bg-[var(--color-glass-border)]" />
          <button onClick={toggleLeft} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-dark)] rounded transition-colors" title="Toggle Inputs">
            {leftWidth > 0 ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
          <button onClick={toggleRight} className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-dark)] rounded transition-colors" title="Toggle Outputs">
            {rightWidth > 0 ? <PanelRightClose size={18} /> : <PanelRight size={18} />}
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="px-2 py-1 rounded-md bg-[var(--color-bg-dark)] border border-[var(--color-glass-border)] text-xs text-[var(--color-text-muted)] font-mono">
            ID: {note.id.substring(0,8)}
          </span>
          <button 
            onClick={toggleStatus}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              note.status === 'COMPLETED' 
                ? 'bg-green-900/30 text-green-400 border-green-900/50 hover:bg-green-900/50' 
                : 'bg-orange-900/30 text-orange-400 border-orange-900/50 hover:bg-orange-900/50'
            }`}
          >
            {note.status === 'COMPLETED' ? <CheckCircle size={16} /> : <Circle size={16} />}
            {note.status === 'COMPLETED' ? 'Completed' : 'Incomplete'}
          </button>
        </div>
      </div>

      {/* 3-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Pane: Inputs or Source */}
        <div style={{ width: leftWidth > 0 ? leftWidth : 0, opacity: leftWidth > 0 ? 1 : 0 }} className="border-r border-[var(--color-glass-border)] bg-[var(--color-bg-panel)]/30 flex flex-col transition-opacity duration-200 overflow-hidden">
          
          {note.layer === 'L1' ? (
            <div className="flex-1 flex flex-col h-full bg-[var(--color-bg-dark)]">
              <div className="p-4 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-panel)] flex items-center justify-between shadow-sm whitespace-nowrap overflow-hidden shrink-0">
                <h3 className="font-semibold text-[var(--color-text-main)] flex items-center gap-2">
                  <span className="text-blue-400">←</span> Original Source
                </h3>
                {note.sourceUrl && (
                  <a 
                    href={note.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    title="Open Source in New Tab"
                    className="p-1.5 rounded bg-[var(--color-bg-dark)] hover:bg-[var(--color-glass-border)] text-[var(--color-text-main)] transition-colors border border-[var(--color-glass-border)] shrink-0 flex items-center gap-1 text-xs"
                  >
                    Open <span className="text-blue-400 text-lg leading-none">↗</span>
                  </a>
                )}
              </div>
              {note.sourceUrl ? (
                <div className="flex-1 bg-[var(--color-bg-dark)] relative">
                  <iframe src={note.sourceUrl} className="absolute inset-0 w-full h-full border-none" title="Source View" sandbox="allow-scripts allow-same-origin" />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center text-[var(--color-text-muted)] text-sm">
                  This is an L1 Source note.<br/>No original URL was provided.
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-panel)] flex items-center justify-between shadow-sm whitespace-nowrap overflow-hidden">
                <h3 className="font-semibold text-[var(--color-text-main)] flex items-center gap-2">
                  <span className="text-blue-400">←</span> Inputs
                </h3>
                <button 
                  onClick={() => handleCreateAndLink('input')}
                  title="Create New Input Note"
                  className="p-1.5 rounded bg-[var(--color-bg-dark)] hover:bg-[var(--color-glass-border)] text-[var(--color-text-main)] transition-colors border border-[var(--color-glass-border)] shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="p-4 border-b border-[var(--color-glass-border)] relative shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input 
                    value={leftSearch}
                    onChange={(e) => setLeftSearch(e.target.value)}
                    placeholder="Link existing..." 
                    className="w-full bg-[var(--color-bg-dark)] border border-[var(--color-glass-border)] rounded-md py-1.5 pl-8 pr-3 text-sm outline-none text-[var(--color-text-main)] focus:border-[var(--color-accent)]"
                  />
                </div>
                {leftResults.length > 0 && (
                  <div className="absolute top-full left-4 right-4 mt-1 bg-[var(--color-bg-panel)] border border-[var(--color-glass-border)] rounded-md shadow-2xl z-10 overflow-hidden">
                    {leftResults.map(res => (
                      <button 
                        key={res.id} 
                        onClick={() => handleLinkExisting(res.id, 'input')}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-bg-dark)] text-[var(--color-text-main)] flex items-center justify-between"
                      >
                        <span className="truncate">{res.title}</span>
                        <span className="text-[10px] text-[var(--color-text-muted)] border border-[var(--color-glass-border)] px-1 rounded">{res.layer}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
                {inputs.map(inputNote => {
                  const isMaximized = maximizedInputId === inputNote.id;
                  return (
                    <div 
                      key={inputNote.id} 
                      className={`rounded-lg bg-[var(--color-bg-dark)] border transition-all shadow-sm flex flex-col overflow-hidden ${
                        isMaximized 
                          ? 'border-[var(--color-accent)] flex-1 min-h-[300px]' 
                          : 'border-[var(--color-glass-border)] hover:border-[var(--color-accent)] cursor-pointer shrink-0'
                      }`}
                    >
                      <div 
                        onClick={() => setMaximizedInputId(isMaximized ? null : inputNote.id)}
                        className="p-3 flex items-center gap-2 bg-[var(--color-bg-dark)] shrink-0 cursor-pointer"
                      >
                        <span className="text-[10px] bg-[var(--color-bg-panel)] border border-[var(--color-glass-border)] px-1.5 rounded text-[var(--color-text-muted)] shrink-0">
                          {inputNote.layer}
                        </span>
                        <h4 className="text-sm font-medium text-[var(--color-text-main)] truncate flex-1">
                          {inputNote.title}
                        </h4>
                        {isMaximized && (
                          <button 
                            onClick={() => router.push(`/journal/editor/${inputNote.id}`)}
                            className="px-2 py-1 text-[10px] uppercase font-bold tracking-wide rounded bg-[var(--color-accent)] text-white hover:brightness-110 flex items-center gap-1 shrink-0 transition-colors"
                          >
                            <Edit3 size={12} /> Edit
                          </button>
                        )}
                      </div>
                      {isMaximized && (
                        <div className="flex-1 border-t border-[var(--color-glass-border)] p-4 overflow-y-auto prose prose-sm prose-invert max-w-none break-words" dangerouslySetInnerHTML={{ __html: inputNote.content || '<p class="text-gray-500 italic">Empty note.</p>' }} />
                      )}
                    </div>
                  );
                })}
                {inputs.length === 0 && (
                  <p className="text-sm text-[var(--color-text-muted)] text-center mt-4 shrink-0">No inputs linked.</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Resizer Left */}
        {leftWidth > 0 && (
          <div 
            onMouseDown={startResizingLeft}
            className="w-1 cursor-col-resize bg-[var(--color-glass-border)] hover:bg-[var(--color-accent)] active:bg-[var(--color-accent)] shrink-0 transition-colors z-20"
          />
        )}

        {/* Center Pane: Current Note */}
        <div className="flex-1 min-w-[300px] flex flex-col bg-[var(--color-bg-dark)] shadow-[0_0_40px_rgba(0,0,0,0.5)] z-10">
          <div className="px-8 md:px-12 pt-12 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-2 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)] border border-[var(--color-accent)]/30 text-xs font-bold uppercase tracking-wider">
                {note.layer}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                Last touched: {new Date(note.lastTouchedAt).toLocaleString()}
              </span>
            </div>
            <input 
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="Note Title"
              className="w-full text-4xl font-bold bg-transparent border-none outline-none text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]"
            />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 md:px-12 pb-24">
             <SecondBrainEditor 
               key={note.id}
               initialContent={note.content}
               onSave={async (html) => {
                 await updateNote({ content: html, touchCount: note.touchCount + 1 });
               }}
             />
          </div>
        </div>

        {/* Resizer Right */}
        {rightWidth > 0 && (
          <div 
            onMouseDown={startResizingRight}
            className="w-1 cursor-col-resize bg-[var(--color-glass-border)] hover:bg-[var(--color-accent)] active:bg-[var(--color-accent)] shrink-0 transition-colors z-20"
          />
        )}

        {/* Right Pane: Outputs */}
        <div style={{ width: rightWidth > 0 ? rightWidth : 0, opacity: rightWidth > 0 ? 1 : 0 }} className="border-l border-[var(--color-glass-border)] bg-[var(--color-bg-panel)]/30 flex flex-col transition-opacity duration-200">
          <div className="p-4 border-b border-[var(--color-glass-border)] bg-[var(--color-bg-panel)] flex items-center justify-between shadow-sm whitespace-nowrap overflow-hidden">
            <h3 className="font-semibold text-[var(--color-text-main)] flex items-center gap-2">
              Outputs <span className="text-orange-400">→</span>
            </h3>
            <button 
              onClick={() => handleCreateAndLink('output')}
              title="Create New Output Note"
              className="p-1.5 rounded bg-[var(--color-bg-dark)] hover:bg-[var(--color-glass-border)] text-[var(--color-text-main)] transition-colors border border-[var(--color-glass-border)] shrink-0"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="p-4 border-b border-[var(--color-glass-border)] relative shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input 
                value={rightSearch}
                onChange={(e) => setRightSearch(e.target.value)}
                placeholder="Link existing..." 
                className="w-full bg-[var(--color-bg-dark)] border border-[var(--color-glass-border)] rounded-md py-1.5 pl-8 pr-3 text-sm outline-none text-[var(--color-text-main)] focus:border-[var(--color-accent)]"
              />
            </div>
            {rightResults.length > 0 && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-[var(--color-bg-panel)] border border-[var(--color-glass-border)] rounded-md shadow-2xl z-10 overflow-hidden">
                {rightResults.map(res => (
                  <button 
                    key={res.id} 
                    onClick={() => handleLinkExisting(res.id, 'output')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-bg-dark)] text-[var(--color-text-main)] flex items-center justify-between"
                  >
                    <span className="truncate">{res.title}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)] border border-[var(--color-glass-border)] px-1 rounded">{res.layer}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scrollbar">
            {outputs.map(outputNote => {
              const isMaximized = maximizedOutputId === outputNote.id;
              return (
                <div 
                  key={outputNote.id} 
                  className={`rounded-lg bg-[var(--color-bg-dark)] border transition-all shadow-sm flex flex-col overflow-hidden ${
                    isMaximized 
                      ? 'border-[var(--color-accent)] flex-1 min-h-[300px]' 
                      : 'border-[var(--color-glass-border)] hover:border-[var(--color-accent)] cursor-pointer shrink-0'
                  }`}
                >
                  <div 
                    onClick={() => setMaximizedOutputId(isMaximized ? null : outputNote.id)}
                    className="p-3 flex items-center gap-2 bg-[var(--color-bg-dark)] shrink-0 cursor-pointer"
                  >
                    <span className="text-[10px] bg-[var(--color-bg-panel)] border border-[var(--color-glass-border)] px-1.5 rounded text-[var(--color-text-muted)] shrink-0">
                      {outputNote.layer}
                    </span>
                    <h4 className="text-sm font-medium text-[var(--color-text-main)] truncate flex-1">
                      {outputNote.title}
                    </h4>
                    {isMaximized && (
                      <button 
                        onClick={() => router.push(`/journal/editor/${outputNote.id}`)}
                        className="px-2 py-1 text-[10px] uppercase font-bold tracking-wide rounded bg-[var(--color-accent)] text-white hover:brightness-110 flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    )}
                  </div>
                  {isMaximized && (
                    <div className="flex-1 border-t border-[var(--color-glass-border)] p-4 overflow-y-auto prose prose-sm prose-invert max-w-none break-words" dangerouslySetInnerHTML={{ __html: outputNote.content || '<p class="text-gray-500 italic">Empty note.</p>' }} />
                  )}
                </div>
              );
            })}
            {outputs.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] text-center mt-4 shrink-0">No outputs linked.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
