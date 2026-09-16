"use client";

import { useState, useEffect, useRef } from 'react';

export default function ProjectCreatorModal({ config, onClose, onCreate, objectives = [] }) {
  const [title, setTitle] = useState('');
  const [objectiveId, setObjectiveId] = useState(config?.objectiveId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      onClose();
      return;
    }
    await onCreate({
      title: title.trim(),
      status: 'BACKLOG',
      objectiveId: objectiveId || null,
      parentProjectId: config?.parentProjectId || null,
      startDate: startDate || null,
      endDate: endDate || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <form onSubmit={handleSubmit} className="bg-[var(--color-bg-panel)] text-[var(--color-text-main)] rounded-xl shadow-2xl flex flex-col relative z-20 overflow-hidden w-[720px]">
        {/* Title input */}
        <input
          ref={inputRef}
          type="text"
          placeholder="Project name..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          className="w-full bg-transparent border-none text-[18px] text-[var(--color-text-main)] placeholder-gray-400 focus:outline-none p-5 pb-3"
        />

        {/* Fields row — only Objective, Start, End */}
        <div className="flex items-center gap-6 px-5 pb-4 pt-2 text-sm text-[var(--color-text-muted)] font-medium border-t border-[var(--color-border)] mt-2">

          {/* Objective */}
          <div className="flex items-center gap-1.5 hover:text-[var(--color-text-main)] transition-colors flex-shrink-0 mt-2">
            <span>🎯</span>
            <select
              value={objectiveId}
              onChange={e => setObjectiveId(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">No Objective</option>
              {objectives.map(o => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-1.5 hover:text-[var(--color-text-main)] transition-colors flex-shrink-0 mt-2">
            <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] mr-0.5">Start</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none w-[115px] cursor-pointer"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-1.5 hover:text-[var(--color-text-main)] transition-colors flex-shrink-0 mt-2">
            <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] mr-0.5">End</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none w-[115px] cursor-pointer"
            />
          </div>
        </div>

        <button type="submit" className="absolute opacity-0 pointer-events-none w-0 h-0" tabIndex="-1">Submit</button>
      </form>
    </div>
  );
}

