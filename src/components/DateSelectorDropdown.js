"use client";

import { useState, useRef, useEffect } from 'react';
import { formatRelativeDate } from '@/lib/utils';

export default function DateSelectorDropdown({ baseDate, setBaseDate }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeDate = (daysOffset) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + daysOffset);
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    setBaseDate(`${d.getFullYear()}-${m}-${day}`);
    setIsOpen(false);
  };

  const goToday = () => {
    const d = new Date();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    setBaseDate(`${d.getFullYear()}-${m}-${day}`);
    setIsOpen(false);
  };

  return (
    <div className="relative z-50" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-dark)] text-[var(--color-text-main)] rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-panel-hover)] text-sm font-semibold shadow-sm transition-colors"
      >
        <span className="text-[12px]">📅</span> {formatRelativeDate(baseDate)}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-[var(--color-bg-panel)] rounded-lg shadow-2xl border border-[var(--color-border)] z-50 py-2">
          <button onClick={goToday} className="w-full text-left px-4 py-2 hover:bg-[var(--color-bg-panel-hover)] text-sm text-[var(--color-text-main)] flex justify-between">
            Go to today
          </button>
          <button onClick={() => changeDate(1)} className="w-full text-left px-4 py-2 hover:bg-[var(--color-bg-panel-hover)] text-sm text-[var(--color-text-main)] flex justify-between">
            Go to next day
          </button>
          <button onClick={() => changeDate(-1)} className="w-full text-left px-4 py-2 hover:bg-[var(--color-bg-panel-hover)] text-sm text-[var(--color-text-main)] flex justify-between border-b border-[var(--color-border)] mb-2 pb-3">
            Go to previous day
          </button>
          <div className="px-4 pb-2">
            <input
              type="date"
              value={baseDate}
              onChange={(e) => {
                if (e.target.value) {
                  setBaseDate(e.target.value);
                  setIsOpen(false);
                }
              }}
              className="w-full p-2 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
