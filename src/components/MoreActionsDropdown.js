"use client";

import { useState, useRef, useEffect } from 'react';

export default function MoreActionsDropdown({ onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative z-[110]" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
      >
        <span className="text-xl leading-none mb-2">...</span>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 flex flex-col font-normal text-sm animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 pb-2 text-[11px] text-gray-400 font-medium tracking-wide">Other actions:</div>
          <button onClick={() => setIsOpen(false)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600 flex items-center gap-3">
            <span className="text-gray-400">🔁</span> Repeat
          </button>
          <button onClick={() => setIsOpen(false)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600 flex items-center justify-between">
            <span className="flex items-center gap-3"><span className="text-gray-400">🎯</span> Align with objective</span>
            <span className="text-xs text-gray-400 font-mono">R</span>
          </button>
          <button onClick={() => setIsOpen(false)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-600 flex items-center justify-between">
            <span className="flex items-center gap-3"><span className="text-gray-400">📋</span> Duplicate</span>
            <span className="text-xs text-gray-400 font-mono">Ctrl D</span>
          </button>
          <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center justify-between group">
            <span className="flex items-center gap-3"><span className="text-gray-400 group-hover:text-red-500">🗑️</span> Delete</span>
            <span className="text-[10px] text-gray-400 group-hover:text-red-400 font-mono">Ctrl Backspace</span>
          </button>
        </div>
      )}
    </div>
  );
}
