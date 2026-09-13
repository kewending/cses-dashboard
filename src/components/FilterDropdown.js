"use client";

import { useState, useRef, useEffect } from 'react';

export default function FilterDropdown({ taskFilter, setTaskFilter, allTags }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTags = allTags.filter(t => t.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative z-50" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-dark)] text-white/90 rounded border border-white/10 hover:bg-white/10 text-sm font-semibold shadow-sm transition-colors"
      >
        <span className="text-[12px]">≡</span> Filter
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-[#232323] rounded-lg shadow-2xl border border-white/10 z-50 py-2">
          <div className="px-4 pb-2 text-xs text-white/40 font-semibold border-b border-white/10 mb-2 mt-1">
            Filter tasks by channel:
          </div>
          <div className="px-3 mb-2">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#2d2d2d] border border-white/10 rounded text-sm p-1.5 focus:outline-none text-white/90 placeholder-white/30"
            />
          </div>
          <div className="max-h-48 overflow-y-auto custom-scrollbar">
            <button onClick={() => { setTaskFilter('all'); setIsOpen(false); }} className="w-full text-left px-4 py-1.5 hover:bg-white/5 text-sm text-white/80 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-green-500 text-lg">#</span> all
              </span>
              {taskFilter === 'all' && <span className="text-white/50 text-xs">✓</span>}
            </button>
            {filteredTags.map(tag => (
              <button key={tag} onClick={() => { setTaskFilter(tag); setIsOpen(false); }} className="w-full text-left px-4 py-1.5 hover:bg-white/5 text-sm text-white/80 flex items-center justify-between">
                <span className="flex items-center gap-2 pl-4">
                  <span className="text-[#f2a950] text-lg">#</span> {tag}
                </span>
                {taskFilter === tag && <span className="text-white/50 text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
