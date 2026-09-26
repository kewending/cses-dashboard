"use client";

import { useState, useEffect, useRef } from 'react';
import { formatAbsoluteDate, HOURS } from '@/lib/utils';
import { useSettings } from '@/lib/SettingsContext';

export default function TaskCreatorModal({ config, onClose, onAdd, projects = [] }) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [tag, setTag] = useState('');
  const [priority, setPriority] = useState('None');
  const [startDate, setStartDate] = useState(config?.dateStr || '');
  const [projectId, setProjectId] = useState(config?.projectId || '');
  
  const { settings } = useSettings();

  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      onClose();
      return;
    }

    onAdd({
      id: `t-${Date.now()}`,
      title,
      plannedDurationMinutes: parseInt(duration) || settings.pomodoro.focus || 25,
      tag: tag.replace('#', ''),
      status: config.status,
      actualDurationSeconds: 0,
      projectId: projectId || null,
      isCompleted: false,
      priority,
      startDate,
      dueDate: startDate,
      notes: '',
      subtasks: []
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose}></div>
      <form onSubmit={handleSubmit} className="bg-[var(--color-bg-panel)] text-[var(--color-text-main)] rounded-xl shadow-2xl flex flex-col relative z-20 overflow-hidden w-[720px]">
        <input
          ref={inputRef}
          type="text"
          placeholder="Task description..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onClose();
            }
          }}
          className="w-full bg-transparent border-none text-[18px] text-[var(--color-text-main)] placeholder-gray-400 focus:outline-none p-5 pb-3"
        />

        <div className="flex items-center gap-4 px-5 pb-4 pt-2 text-sm text-[var(--color-text-muted)] font-medium flex-nowrap overflow-hidden border-t border-[var(--color-border)] mt-2">
          <div className="flex items-center gap-1.5 hover:text-[var(--color-text-main)] transition-colors flex-shrink-0 mt-2">
            <span>📅</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent focus:outline-none w-[115px] cursor-pointer" />
          </div>
          <div className="flex items-center gap-1.5 hover:text-[var(--color-text-main)] transition-colors flex-shrink-0 mt-2">
            <span>🕒</span>
            <input type="number" placeholder="--:--" value={duration} onChange={e => setDuration(e.target.value)} className="bg-transparent focus:outline-none w-12 text-center" />
          </div>
          <div className="flex items-center gap-1.5 hover:text-[var(--color-text-main)] transition-colors flex-shrink-0 mt-2">
            <span>#</span>
            <input type="text" placeholder="tag" value={tag} onChange={e => setTag(e.target.value)} className="bg-transparent focus:outline-none w-16" />
          </div>
          <div className="flex items-center gap-1.5 hover:text-[var(--color-text-main)] transition-colors flex-shrink-0 mt-2">
            <span>🚩</span>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              <option value="None">Priority 4</option>
              <option value="Low">Priority 3</option>
              <option value="Medium">Priority 2</option>
              <option value="High">Priority 1</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 hover:text-[var(--color-text-main)] transition-colors flex-shrink-0 mt-2">
            <span>📁</span>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              <option value="">No Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="absolute opacity-0 pointer-events-none w-0 h-0" tabIndex="-1">Submit</button>
      </form>
    </div>
  );
}
