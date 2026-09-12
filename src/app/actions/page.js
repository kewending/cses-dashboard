"use client";

import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

// --- MOCK DATA ---
const INITIAL_TASKS = [
  {
    id: 't1',
    title: 'Set up Sunsama',
    status: 'today',
    plannedDurationMinutes: 20,
    actualDurationSeconds: 0,
    tag: 'work',
    objectiveId: 'obj1',
    isCompleted: false,
    priority: 'High',
    startDate: '2026-09-12',
    dueDate: '2026-09-12',
    notes: 'You\'ve already created your first task. You can add more with the keyboard shortcut A or by clicking the "Add Task" button.',
    subtasks: [
      { id: 'st1', title: 'Add a task', isCompleted: true, plannedDurationMinutes: 5, actualDurationSeconds: 300 },
      { id: 'st2', title: 'Complete daily planning', isCompleted: false, plannedDurationMinutes: 15, actualDurationSeconds: 0 },
    ]
  },
  {
    id: 't2',
    title: 'Outline thesis structure',
    status: 'today',
    plannedDurationMinutes: 30,
    actualDurationSeconds: 0,
    tag: 'work',
    objectiveId: null,
    isCompleted: false,
    priority: 'Medium',
    startDate: '',
    dueDate: '',
    notes: '',
    subtasks: []
  },
];

const INITIAL_SESSIONS = [
  { id: 's1', taskId: 't1', startMinutes: 9 * 60 },
  { id: 's2', taskId: 't2', startMinutes: 11 * 60 + 35 },
];

const INITIAL_OBJECTIVES = [
  { id: 'obj1', title: 'Writing Thesis' },
  { id: 'obj2', title: 'Launch SaaS MVP' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 12 AM to 11 PM

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const formatRelativeDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatAbsoluteDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
function DateSelectorDropdown({ baseDate, setBaseDate }) {
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
        className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-dark)] text-white/90 rounded border border-white/10 hover:bg-white/10 text-sm font-semibold shadow-sm transition-colors"
      >
        <span className="text-[12px]">📅</span> {formatRelativeDate(baseDate)}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-[#232323] rounded-lg shadow-2xl border border-white/10 z-50 py-2">
          <button onClick={goToday} className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white/80 flex justify-between">
            Go to today
          </button>
          <button onClick={() => changeDate(1)} className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white/80 flex justify-between">
            Go to next day
          </button>
          <button onClick={() => changeDate(-1)} className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-white/80 flex justify-between border-b border-white/10 mb-2 pb-3">
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
              className="w-full p-2 bg-[#2d2d2d] border border-white/10 rounded text-sm text-white/90 focus:outline-none focus:border-[var(--color-accent)] color-scheme-dark"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterDropdown({ taskFilter, setTaskFilter, allTags }) {
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

const getProjectionDays = (baseDateStr) => {
  const days = [];
  const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 4; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);

    const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
    let dayName = DAYS_OF_WEEK[d.getDay()];
    if (diffDays === 0) dayName = 'Today';
    else if (diffDays === 1) dayName = 'Tomorrow';
    else if (diffDays === -1) dayName = 'Yesterday';

    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${m}-${day}`;

    days.push({ id: dateStr, title: dayName, dateStr: dateStr });
  }
  return days;
};

const formatActualTime = (totalSeconds) => {
  if (totalSeconds === 0 || !totalSeconds) return '0:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `0:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
const formatMins = (mins) => {
  if (mins === 0 || !mins) return '--:--';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m === 0) return `${h} hr`;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}`;
  return `0:${m.toString().padStart(2, '0')}`;
};
const formatSessionTime = (mins) => {
  if (mins == null) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
};

// --- COMPONENTS ---

function SortableTask({ task, session, isActiveTimer, activeTimer, onToggleTimer, onOpenDetail, onToggleComplete, onToggleSubtaskComplete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const totalActualSeconds = task.actualDurationSeconds + (task.subtasks?.reduce((acc, sub) => acc + sub.actualDurationSeconds, 0) || 0);
  const actualFormatted = formatActualTime(totalActualSeconds);
  const plannedFormatted = formatMins(task.plannedDurationMinutes);
  const isOverTime = totalActualSeconds > task.plannedDurationMinutes * 60;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-[var(--color-bg-dark)] border ${isActiveTimer ? 'border-[var(--color-accent)] shadow-[0_0_15px_var(--color-accent)]/20' : 'border-white/10 hover:border-white/30'} ${task.isCompleted ? 'opacity-50' : ''} rounded-xl mb-3 group transition-all relative flex flex-col`}
    >
      <div className="flex justify-between items-start mb-2 relative">
        <div className="flex-1 flex gap-2 items-start cursor-grab active:cursor-grabbing mr-2 pb-1" {...attributes} {...listeners} onClick={() => onOpenDetail(task.id)}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleComplete(task.id); }}
            className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${task.isCompleted ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-white/60'}`}
          >
            {task.isCompleted && <span className="text-white text-[10px]">✓</span>}
          </button>
          <div className={`text-sm font-semibold leading-tight ${task.isCompleted ? 'text-white/50 line-through' : 'text-white'}`}>
            {session && (
              <span className="inline-block mr-2 text-[10px] bg-[#f2a950] text-black px-1.5 py-0.5 rounded font-bold align-middle mb-0.5">
                {formatSessionTime(session.startMinutes)}
              </span>
            )}
            {task.title}
          </div>
        </div>
      </div>

      {/* SUBTASKS BLOCK */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="flex flex-col gap-1.5 pl-6 pr-2 mb-3 mt-1">
          {task.subtasks.map(sub => (
            <div key={sub.id} className="flex items-center justify-between group/sub">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSubtaskComplete(task.id, sub.id); }}
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${sub.isCompleted ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-white/60'}`}
                >
                  {sub.isCompleted && <span className="text-white text-[8px]">✓</span>}
                </button>
                <span className={`text-xs truncate cursor-pointer ${sub.isCompleted ? 'text-white/40 line-through' : 'text-white/80'}`} onClick={(e) => { e.stopPropagation(); onOpenDetail(task.id); }}>
                  {sub.title}
                </span>
              </div>
              <div className={`flex items-center gap-2 transition-opacity ${activeTimer?.id === sub.id && activeTimer?.type === 'subtask' ? 'opacity-100' : 'opacity-0 group-hover/sub:opacity-100'}`}>
                <div className="text-[9px] font-mono text-white/40">
                  {formatActualTime(sub.actualDurationSeconds)} / {formatMins(sub.plannedDurationMinutes)}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleTimer(sub.id, 'subtask'); }}
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${activeTimer?.id === sub.id && activeTimer?.type === 'subtask' ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                >
                  {activeTimer?.id === sub.id && activeTimer?.type === 'subtask' ? '⏹' : '▶'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isActiveTimer) {
                if (activeTimer?.type === 'task' && activeTimer?.id === task.id) {
                  onToggleTimer(task.id, 'task');
                } else if (activeTimer?.type === 'subtask' && task.subtasks?.some(s => s.id === activeTimer.id)) {
                  onToggleTimer(activeTimer.id, 'subtask');
                }
              } else {
                onToggleTimer(task.id, 'task');
              }
            }}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors z-10 relative ${isActiveTimer ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20'}`}
          >
            {isActiveTimer ? '⏸' : '▶'}
          </button>
          {task.tag && <span className="text-[10px] text-[var(--color-accent)] font-medium">#{task.tag}</span>}
        </div>

        <div className={`text-[10px] font-mono px-2 py-0.5 rounded ${isOverTime ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-[var(--color-text-muted)]'}`}>
          {actualFormatted} / {plannedFormatted}
        </div>
      </div>
    </div>
  );
}

function DraggableSession({ session, task, onOpenDetail, zoomLevel }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `session-${session.id}`,
    data: { type: 'Session', session, task }
  });

  const top = (session.startMinutes) * (zoomLevel / 60);
  const height = (task.plannedDurationMinutes / 60) * zoomLevel;

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.6 : (task.isCompleted ? 0.4 : 1),
    top: `${top}px`,
    height: `${Math.max(height, 20)}px`
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpenDetail(task.id)}
      className={`absolute left-16 right-2 ${task.isCompleted ? 'bg-gray-600' : 'bg-blue-500/90'} hover:opacity-80 rounded-lg p-2 overflow-hidden shadow-lg z-10 cursor-grab active:cursor-grabbing transition-colors flex flex-col`}
    >
      <div className={`text-[11px] font-bold text-white leading-tight ${task.isCompleted ? 'line-through' : ''}`}>{task.title}</div>
      <div className="text-[10px] text-blue-100 mt-auto">
        {formatSessionTime(session.startMinutes)}
      </div>
    </div>
  );
}

function CurrentTimeLine({ zoomLevel }) {
  const [minsFromMidnight, setMinsFromMidnight] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setMinsFromMidnight(now.getHours() * 60 + now.getMinutes());
    };
    updateTime();
    const int = setInterval(updateTime, 60000);
    return () => clearInterval(int);
  }, []);

  const top = (minsFromMidnight) * (zoomLevel / 60);

  return (
    <div
      className="absolute left-14 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
    </div>
  );
}

function CalendarGrid({ sessions, tasks, onOpenDetail, baseDate, zoomLevel, setZoomLevel, calendarScrollRef, onDoubleClickTime }) {
  const { setNodeRef } = useDroppable({
    id: `calendar-main`,
    data: { type: 'CalendarMain' }
  });

  const scrollRef = useRef(null);

  // Auto-scroll to current time on mount and zoom change
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const minsFromMidnight = now.getHours() * 60 + now.getMinutes();
      const top = (minsFromMidnight) * (zoomLevel / 60);
      scrollRef.current.scrollTop = Math.max(0, top - scrollRef.current.clientHeight / 2);
      if (calendarScrollRef) calendarScrollRef.current = scrollRef.current.scrollTop;
    }
  }, [zoomLevel, calendarScrollRef]);

  return (
    <div className="w-[300px] flex-shrink-0 bg-white/5 border border-white/10 rounded-2xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
        <h2 className="font-semibold text-white">{baseDate ? formatAbsoluteDate(baseDate) : 'Calendars'}</h2>
        <div className="flex gap-2 text-white">
          <button onClick={() => setZoomLevel(Math.max(40, zoomLevel - 20))} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center font-mono">-</button>
          <button onClick={() => setZoomLevel(Math.min(160, zoomLevel + 20))} className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center font-mono">+</button>
        </div>
      </div>
      <div 
        ref={(node) => { setNodeRef(node); scrollRef.current = node; }} 
        onScroll={(e) => {
          if (calendarScrollRef) calendarScrollRef.current = e.target.scrollTop;
        }}
        className="flex-1 relative bg-transparent overflow-y-auto custom-scrollbar"
      >
        <div 
          className="relative pt-4" 
          style={{ minHeight: `${24 * zoomLevel + 40}px` }}
          onDoubleClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top - 16;
            let mins = y * (60 / zoomLevel);
            mins = Math.max(0, Math.round(mins / 10) * 10);
            if (onDoubleClickTime) onDoubleClickTime(mins);
          }}
        >
          <CurrentTimeLine zoomLevel={zoomLevel} />
          {HOURS.map(h => (
            <div key={h} style={{ height: `${zoomLevel}px` }} className="border-b border-white/5 relative flex pointer-events-none">
              <div className="absolute -top-3 left-0 w-14 text-right pr-2 text-[10px] text-[var(--color-text-muted)] font-mono">
                {h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
              </div>
            </div>
          ))}
          {sessions.map(s => {
            const t = tasks.find(x => x.id === s.taskId);
            if (!t) return null;
            if (t.startDate && t.startDate !== baseDate) return null;
            if (!t.startDate && t.status !== baseDate) return null;
            return <DraggableSession key={s.id} session={s} task={t} onOpenDetail={onOpenDetail} zoomLevel={zoomLevel} />
          })}
        </div>
      </div>
    </div>
  );
}

function TaskCreatorModal({ config, onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');
  const [tag, setTag] = useState('');
  const [priority, setPriority] = useState('None');
  const [startDate, setStartDate] = useState(config?.dateStr || '');

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
      plannedDurationMinutes: parseInt(duration) || 30,
      tag: tag.replace('#', ''),
      status: config.status,
      actualDurationSeconds: 0,
      objectiveId: null,
      isCompleted: false,
      priority,
      startDate,
      dueDate: '',
      notes: '',
      subtasks: []
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose}></div>
      <form onSubmit={handleSubmit} className="bg-white text-gray-800 rounded-xl shadow-2xl flex flex-col relative z-20 overflow-hidden w-[550px]">
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
          className="w-full bg-transparent border-none text-[18px] text-gray-800 placeholder-gray-400 focus:outline-none p-5 pb-3"
        />

        <div className="flex items-center gap-4 px-5 pb-4 pt-2 text-sm text-gray-500 font-medium flex-nowrap overflow-hidden border-t border-gray-100 mt-2">
          <div className="flex items-center gap-1.5 hover:text-gray-800 transition-colors flex-shrink-0 mt-2">
            <span>📅</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent focus:outline-none w-[115px] cursor-pointer" />
          </div>
          <div className="flex items-center gap-1.5 hover:text-gray-800 transition-colors flex-shrink-0 mt-2">
            <span>🕒</span>
            <input type="number" placeholder="--:--" value={duration} onChange={e => setDuration(e.target.value)} className="bg-transparent focus:outline-none w-12 text-center" />
          </div>
          <div className="flex items-center gap-1.5 hover:text-gray-800 transition-colors flex-shrink-0 mt-2">
            <span>#</span>
            <input type="text" placeholder="tag" value={tag} onChange={e => setTag(e.target.value)} className="bg-transparent focus:outline-none w-16" />
          </div>
          <div className="flex items-center gap-1.5 hover:text-gray-800 transition-colors flex-shrink-0 mt-2">
            <span>🚩</span>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              <option>None</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
        </div>
        <button type="submit" className="absolute opacity-0 pointer-events-none w-0 h-0" tabIndex="-1">Submit</button>
      </form>
    </div>
  );
}

function ShutdownView({ 
  dateStr, 
  tasks, 
  sessions,
  onAddTaskClick,
  activeTimer,
  onToggleTimer,
  onOpenDetail,
  onToggleComplete,
  onToggleSubtaskComplete 
}) {
  const shutdownTasks = tasks.filter(t => t.startDate === dateStr);

  const formatHrsMins = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const totalActualSeconds = shutdownTasks.reduce((acc, t) => {
    let tSec = t.actualDurationSeconds || 0;
    if (t.subtasks) {
      tSec += t.subtasks.reduce((sAcc, sub) => sAcc + (sub.actualDurationSeconds || 0), 0);
    }
    return acc + tSec;
  }, 0);

  const totalPlannedMinutes = shutdownTasks.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0);

  // Group by tag for pie chart
  const tagDataMap = {};
  shutdownTasks.forEach(t => {
    let tSec = t.actualDurationSeconds || 0;
    if (t.subtasks) {
      tSec += t.subtasks.reduce((sAcc, sub) => sAcc + (sub.actualDurationSeconds || 0), 0);
    }
    if (tSec > 0) {
      const tag = t.tag || 'untagged';
      tagDataMap[tag] = (tagDataMap[tag] || 0) + tSec;
    }
  });

  const pieData = Object.keys(tagDataMap).map(tag => ({
    name: tag,
    value: tagDataMap[tag]
  }));

  const COLORS = ['#f39c12', '#3498db', '#e74c3c', '#9b59b6', '#2ecc71', '#1abc9c', '#34495e'];

  const workedOnTasks = shutdownTasks.filter(t => {
    let tSec = t.actualDurationSeconds || 0;
    let anySubtaskCompleted = false;
    if (t.subtasks) {
      tSec += t.subtasks.reduce((sAcc, sub) => sAcc + (sub.actualDurationSeconds || 0), 0);
      anySubtaskCompleted = t.subtasks.some(s => s.isCompleted);
    }
    return tSec > 0 || t.isCompleted || anySubtaskCompleted;
  });

  const missedTasks = shutdownTasks.filter(t => {
    let tSec = t.actualDurationSeconds || 0;
    let anySubtaskCompleted = false;
    if (t.subtasks) {
      tSec += t.subtasks.reduce((sAcc, sub) => sAcc + (sub.actualDurationSeconds || 0), 0);
      anySubtaskCompleted = t.subtasks.some(s => s.isCompleted);
    }
    return tSec === 0 && !t.isCompleted && !anySubtaskCompleted;
  });

  // Calculate bar progress
  const sixHoursSecs = 6 * 3600;
  const eightHoursSecs = 8 * 3600;
  const maxScale = Math.max(eightHoursSecs + 3600, totalActualSeconds, totalPlannedMinutes * 60);
  const actualPercent = (totalActualSeconds / maxScale) * 100;
  const plannedPercent = ((totalPlannedMinutes * 60) / maxScale) * 100;
  const sixHrPercent = (sixHoursSecs / maxScale) * 100;
  const eightHrPercent = (eightHoursSecs / maxScale) * 100;

  return (
    <div className="flex-1 flex gap-4 min-h-0">
      {/* Date In Review Panel */}
      <div className="w-[350px] flex-shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar p-2">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Date in review</h2>
          <p className="text-sm text-gray-400">How you spent your time on {dateStr} in total</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-8">
          <div>
            <h3 className="text-lg font-semibold text-white mb-6">Total time</h3>
            
            <div className="relative mt-8 mb-12">
              {/* Tooltip Actual */}
              <div 
                className="absolute -top-8 -translate-x-1/2 bg-green-500 text-white text-xs font-bold py-1 px-2 rounded whitespace-nowrap"
                style={{ left: `${Math.min(100, actualPercent)}%` }}
              >
                {formatHrsMins(totalActualSeconds)}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-green-500"></div>
              </div>

              {/* Progress Bar Background */}
              <div className="h-1.5 w-full bg-white/10 rounded-full relative">
                {/* 6hr marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/20" style={{ left: `${sixHrPercent}%` }}>
                  <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap">6 hr</span>
                </div>
                {/* 8hr marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/20" style={{ left: `${eightHrPercent}%` }}>
                  <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap">8 hr</span>
                </div>
                
                {/* Actual Bar */}
                <div 
                  className="absolute top-0 left-0 bottom-0 bg-green-500 rounded-full" 
                  style={{ width: `${Math.min(100, actualPercent)}%` }}
                ></div>
              </div>

              {/* Tooltip Planned */}
              <div 
                className="absolute top-6 -translate-x-1/2 bg-gray-500 text-white text-[10px] font-bold py-1 px-2 rounded flex flex-col items-center whitespace-nowrap"
                style={{ left: `${Math.min(100, plannedPercent)}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-500"></div>
                <span>{formatHrsMins(totalPlannedMinutes * 60)}</span>
                <span>planned</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">How you spent your time</h3>
            <div className="h-[200px] w-full relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value) => formatHrsMins(value)}
                      contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
                  No tracked time
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Worked On Panel */}
      <div className="w-[280px] flex-shrink-0 flex flex-col gap-4">
        <KanbanColumn
          id="worked_on"
          title="Worked on"
          tasks={workedOnTasks}
          sessions={sessions}
          onAddTaskClick={onAddTaskClick}
          activeTimer={activeTimer}
          onToggleTimer={onToggleTimer}
          onOpenDetail={onOpenDetail}
          onToggleComplete={onToggleComplete}
          onToggleSubtaskComplete={onToggleSubtaskComplete}
          showAdd={false}
        />
      </div>

      {/* Didn't Get To Panel */}
      <div className="w-[280px] flex-shrink-0 flex flex-col gap-4">
        <KanbanColumn
          id="didnt_get_to"
          title="Didn't get to"
          tasks={missedTasks}
          sessions={sessions}
          onAddTaskClick={onAddTaskClick}
          activeTimer={activeTimer}
          onToggleTimer={onToggleTimer}
          onOpenDetail={onOpenDetail}
          onToggleComplete={onToggleComplete}
          onToggleSubtaskComplete={onToggleSubtaskComplete}
          showAdd={false}
        />
      </div>
    </div>
  );
}


// --- COLUMN COMPONENT ---
function KanbanColumn({ id, title, dateStr, tasks, sessions, onAddTaskClick, activeTimer, onToggleTimer, onOpenDetail, onToggleComplete, onToggleSubtaskComplete, showAdd = true, onShutdownClick }) {
  const { setNodeRef } = useDroppable({ id });

  const totalPlanned = tasks.reduce((acc, t) => acc + t.plannedDurationMinutes, 0);
  const isOverloaded = totalPlanned > 330; // 5.5 hours

  return (
    <div className="flex-1 min-w-[280px] bg-[rgba(255,255,255,0.02)] border border-white/5 rounded-2xl flex flex-col overflow-hidden p-2">
      <div className="px-3 py-3 flex items-center justify-between font-semibold text-white/90">
        <div className="flex items-center gap-3 group">
          <div>
            <div className="text-[15px]">{title}</div>
            {dateStr && <div className="text-[10px] text-white/40 mt-0.5">{dateStr}</div>}
          </div>
          {dateStr && onShutdownClick && (
            <button onClick={() => onShutdownClick(dateStr)} className="opacity-0 group-hover:opacity-100 bg-[#2ecc71] hover:bg-[#27ae60] text-white text-[11px] font-bold px-2 py-1 rounded shadow-sm transition-all duration-200">Shutdown</button>
          )}
        </div>
        <div className={`text-[11px] font-mono px-2 py-1 rounded ${isOverloaded ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/60'}`}>
          {formatMins(totalPlanned)}
        </div>
      </div>

      {showAdd && (
        <div className="px-2">
          <button
            onClick={() => onAddTaskClick(id, dateStr)}
            className="w-full text-left px-3 py-2 mb-3 rounded-lg border border-transparent hover:bg-white/5 text-[13px] text-white/50 hover:text-white/80 transition-colors flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Add task
          </button>
        </div>
      )}

      <div ref={setNodeRef} className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col min-h-[100px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(t => (
            <SortableTask
              key={t.id}
              task={t}
              session={sessions?.find(s => s.taskId === t.id)}
              isActiveTimer={(activeTimer?.type === 'task' && activeTimer?.id === t.id) || (activeTimer?.type === 'subtask' && t.subtasks?.some(s => s.id === activeTimer.id))}
              activeTimer={activeTimer}
              onToggleTimer={onToggleTimer}
              onOpenDetail={onOpenDetail}
              onToggleComplete={onToggleComplete}
              onToggleSubtaskComplete={onToggleSubtaskComplete}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}


// --- MAIN APP ---
export default function ActionEngine() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [objectives, setObjectives] = useState(INITIAL_OBJECTIVES);

  const getTodayStr = () => {
    const d = new Date();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  };

  const [baseDate, setBaseDate] = useState(getTodayStr());
  const [taskFilter, setTaskFilter] = useState('all');
  const [calendarZoom, setCalendarZoom] = useState(80);
  const calendarScrollRef = useRef(0);

  const [viewMode, setViewMode] = useState('daily');
  const [activeId, setActiveId] = useState(null);

  const handleShutdownClick = (dateStr) => {
    setBaseDate(dateStr);
    setViewMode('shutdown');
  };

  // Timer State: { id, type: 'task' | 'subtask' }
  const [activeTimer, setActiveTimer] = useState(null);
  const [taskCreatorConfig, setTaskCreatorConfigState] = useState(null);

  const setTaskCreatorConfig = (status, dateStr) => {
    if (!status) {
      setTaskCreatorConfigState(null);
    } else if (typeof status === 'object') {
      setTaskCreatorConfigState(status);
    } else {
      setTaskCreatorConfigState({ status, dateStr });
    }
  };

  const isNextFewDays = (dateStr) => {
    if (!dateStr || !baseDate) return false;
    const d = new Date(dateStr);
    const b = new Date(baseDate);
    d.setHours(0,0,0,0);
    b.setHours(0,0,0,0);
    const diffDays = Math.round((d - b) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
  };

  // Modal State
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusType, setFocusType] = useState('focus');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // --- TIME TRACKER ENGINE ---
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (activeTimer?.type === 'task' && activeTimer?.id === t.id) {
          return { ...t, actualDurationSeconds: t.actualDurationSeconds + 1 };
        }
        if (activeTimer?.type === 'subtask' && t.subtasks?.length) {
          if (t.subtasks.some(s => s.id === activeTimer.id)) {
            return {
              ...t,
              subtasks: t.subtasks.map(s => s.id === activeTimer.id ? { ...s, actualDurationSeconds: s.actualDurationSeconds + 1 } : s)
            };
          }
        }
        return t;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const toggleTimer = (id, type) => {
    if (activeTimer?.id === id) setActiveTimer(null);
    else setActiveTimer({ id, type });
  };

  const handleAddTask = (task) => {
    setTasks(prev => [...prev, task]);
    if (taskCreatorConfig?.startMinutes !== undefined) {
      setSessions(prev => [...prev, {
        id: `s-${Date.now()}`,
        taskId: task.id,
        startMinutes: taskCreatorConfig.startMinutes
      }]);
    }
  };

  const handleToggleComplete = (taskId) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const newIsCompleted = !t.isCompleted;
        return { 
          ...t, 
          isCompleted: newIsCompleted,
          subtasks: t.subtasks ? t.subtasks.map(s => ({ ...s, isCompleted: newIsCompleted })) : []
        };
      }
      return t;
    }));
  };

  const handleToggleSubtaskComplete = (taskId, subtaskId) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newSubtasks = t.subtasks.map(s => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s);
      const allSubtasksCompleted = newSubtasks.length > 0 && newSubtasks.every(s => s.isCompleted);
      return {
        ...t,
        isCompleted: allSubtasksCompleted,
        subtasks: newSubtasks
      };
    }));
  };

  const handleAddSubtask = (taskId) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newSub = {
        id: `st-${Date.now()}`,
        title: 'New subtask',
        isCompleted: false,
        plannedDurationMinutes: 15,
        actualDurationSeconds: 0
      };
      return { ...t, subtasks: [...(t.subtasks || []), newSub] };
    }));
  };

  // --- DND ENGINE ---
  const handleDragStart = (e) => setActiveId(e.active.id);

  const handleDragEnd = (e) => {
    const { active, over, delta } = e;
    setActiveId(null);
    if (!over) return;

    const activeDaySessions = sessions.filter(s => {
      const t = tasks.find(x => x.id === s.taskId);
      if (!t) return false;
      if (t.startDate && t.startDate !== baseDate) return false;
      if (!t.startDate && t.status !== baseDate) return false;
      return true;
    });

    const resolveOverlap = (proposedMins, durationMins, activeId) => {
      let currentMins = proposedMins;
      let hasOverlap = true;
      const blocks = activeDaySessions
        .filter(s => `session-${s.id}` !== activeId && s.taskId !== activeId)
        .map(s => {
          const t = tasks.find(x => x.id === s.taskId);
          const dur = t ? t.plannedDurationMinutes : 60;
          return { start: s.startMinutes, end: s.startMinutes + dur };
        })
        .sort((a,b) => a.start - b.start);

      while (hasOverlap) {
        hasOverlap = false;
        let currentEnd = currentMins + durationMins;
        for (let b of blocks) {
          if (currentMins < b.end && currentEnd > b.start) {
            currentMins = b.end;
            hasOverlap = true;
            break;
          }
        }
      }
      return Math.max(0, Math.min(currentMins, 1440 - durationMins));
    };

    if (active.data.current?.type === 'Session') {
      if (over.data.current?.type === 'CalendarMain') {
        setSessions(prev => prev.map(s => {
          if (`session-${s.id}` === active.id) {
            const calendarTop = over.rect.top;
            const dropTop = active.rect.current.translated.top;
            const scrollTop = calendarScrollRef.current;
            
            const offsetPx = dropTop - calendarTop - 16 + scrollTop; 
            let exactMins = (offsetPx * (60 / calendarZoom));
            exactMins = Math.round(exactMins / 10) * 10;
            const task = tasks.find(t => t.id === s.taskId);
            const duration = task ? task.plannedDurationMinutes : 60;
            exactMins = resolveOverlap(exactMins, duration, active.id);
            return { ...s, startMinutes: exactMins };
          }
          return s;
        }));
      }
      return;
    }

    if (active.data.current?.type === 'Task') {
      const activeTask = tasks.find(t => t.id === active.id);
      if (!activeTask) return;

      if (over.data.current?.type === 'CalendarMain') {
        if (activeTask.status?.startsWith('backlog')) {
          setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: '', startDate: baseDate } : t));
        } else if (!activeTask.startDate) {
          setTasks(prev => prev.map(t => t.id === active.id ? { ...t, startDate: baseDate } : t));
        }

        const calendarTop = over.rect.top;
        const dropTop = active.rect.current.translated.top;
        const scrollTop = calendarScrollRef.current;
        
        const offsetPx = dropTop - calendarTop - 16 + scrollTop; 
        let exactMins = (offsetPx * (60 / calendarZoom));
        exactMins = Math.round(exactMins / 10) * 10;
        const duration = activeTask ? activeTask.plannedDurationMinutes : 60;
        exactMins = resolveOverlap(exactMins, duration, active.id);

        setSessions(prev => {
          const filtered = prev.filter(s => s.taskId !== active.id);
          return [...filtered, { id: `s-${Date.now()}`, taskId: active.id, startMinutes: exactMins }];
        });
        return;
      }

      // Moving to a Sortable List Area
      const isColumn = over.id.toString().startsWith('backlog_') || over.id.toString() === 'inbox' || over.id.toString() === 'next_few_days' || over.id.toString().includes('-');
      let finalStatus = isColumn ? over.id : null;

      const targetTask = tasks.find(t => t.id === over.id);
      if (targetTask) {
        if (targetTask.status?.startsWith('backlog') || targetTask.status === 'inbox' || targetTask.status === 'next_few_days') {
          finalStatus = targetTask.status;
        } else {
          finalStatus = targetTask.startDate;
        }
      }

      if (finalStatus) {
        setTasks(prev => {
          const oldIndex = prev.findIndex(t => t.id === active.id);
          const newIndex = targetTask ? prev.findIndex(t => t.id === over.id) : prev.length;

          let next = [...prev];
          if (finalStatus === 'inbox') {
            next[oldIndex].status = finalStatus;
            next[oldIndex].startDate = '';
          } else if (finalStatus === 'next_few_days') {
            const b = new Date(baseDate);
            b.setDate(b.getDate() + 1);
            next[oldIndex].startDate = b.toISOString().split('T')[0];
            next[oldIndex].status = finalStatus;
          } else if (finalStatus.toString().startsWith('backlog')) {
            next[oldIndex].status = finalStatus;
            next[oldIndex].startDate = '';
          } else {
            next[oldIndex].startDate = finalStatus;
            next[oldIndex].status = '';
          }
          next = arrayMove(next, oldIndex, newIndex);
          return next;
        });

        if (finalStatus === 'inbox' || finalStatus === 'next_few_days' || finalStatus.toString().startsWith('backlog')) {
          setSessions(prev => prev.filter(s => s.taskId !== active.id));
        }
      }
    }
  };

  const activeTaskObj = activeId?.toString().startsWith('session-') ? null : tasks.find(t => t.id === activeId);
  const detailTask = tasks.find(t => t.id === detailTaskId);


  // ---- RENDERERS ----

  const renderDetailContent = () => {
    if (!detailTask) return null;
    const totalActualSeconds = detailTask.actualDurationSeconds + (detailTask.subtasks?.reduce((acc, sub) => acc + sub.actualDurationSeconds, 0) || 0);
    const detailSession = sessions.find(s => s.taskId === detailTask.id);
    const isMainTimerActive = (activeTimer?.type === 'task' && activeTimer?.id === detailTask.id) || (activeTimer?.type === 'subtask' && detailTask.subtasks?.some(s => s.id === activeTimer.id));

    return (
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full pt-16 relative text-[#333]">
        {/* Top Left Controls */}
        <div className="absolute top-0 left-0 flex gap-2">
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`px-3 py-1 text-xs border rounded transition-colors ${isFocusMode ? 'border-gray-400 text-gray-700 bg-gray-100' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
          >
            ⏱ Focus
          </button>
        </div>

        {/* Meta Top Bar (Priority, Dates) */}
        <div className="absolute top-0 right-10 flex gap-4 text-xs font-semibold text-gray-400">
          {detailSession && (
            <div className="flex gap-1.5 items-center text-[#f2a950] bg-[#f2a950]/10 px-2 py-0.5 rounded font-bold">
              <span>@</span>
              <input
                type="time"
                value={(() => {
                  const h = Math.floor(detailSession.startMinutes / 60);
                  const m = detailSession.startMinutes % 60;
                  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                })()}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [hh, mm] = e.target.value.split(':');
                  const newMins = parseInt(hh) * 60 + parseInt(mm);
                  setSessions(prev => prev.map(s => s.id === detailSession.id ? { ...s, startMinutes: newMins } : s));
                }}
                className="bg-transparent font-mono focus:outline-none w-[65px] text-[#f2a950]"
              />
            </div>
          )}
          <div className="flex gap-2 items-center">
            <span>Tag:</span>
            <input
              type="text"
              value={detailTask.tag || ''}
              onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, tag: e.target.value } : t))}
              placeholder="#work"
              className="bg-transparent border-b border-dashed border-gray-300 focus:outline-none text-gray-600 w-16"
            />
          </div>
          <div className="flex gap-2 items-center">
            <span>Priority:</span>
            <select
              value={detailTask.priority}
              onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, priority: e.target.value } : t))}
              className="bg-transparent border-b border-dashed border-gray-300 focus:outline-none text-gray-600"
            >
              <option>None</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <span>Start:</span>
            <input
              type="date"
              value={detailTask.startDate}
              onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, startDate: e.target.value } : t))}
              className="bg-transparent border-b border-dashed border-gray-300 focus:outline-none text-gray-600 w-28"
            />
          </div>
          <div className="flex gap-2 items-center">
            <span>Due:</span>
            <input
              type="date"
              value={detailTask.dueDate}
              onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, dueDate: e.target.value } : t))}
              className="bg-transparent border-b border-dashed border-gray-300 focus:outline-none text-gray-600 w-28"
            />
          </div>
        </div>

        {/* Header Row */}
        <div className="flex items-start justify-between mt-12 mb-10">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={() => handleToggleComplete(detailTask.id)}
              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${detailTask.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-green-400'}`}
            >
              <span className="text-sm font-bold">✓</span>
            </button>
            <input
              type="text"
              value={detailTask.title}
              onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, title: e.target.value } : t))}
              className={`bg-transparent text-4xl font-bold focus:outline-none flex-1 min-w-0 ${detailTask.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}
            />
          </div>

          <div className="flex gap-6 items-center text-center pl-8">
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Actual</span>
              <span className={`text-[22px] font-mono ${totalActualSeconds > 0 ? 'text-green-500' : 'text-gray-600'}`}>{formatActualTime(totalActualSeconds)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-1">Planned</span>
              <div className="flex items-baseline">
                <input
                  type="number"
                  value={detailTask.plannedDurationMinutes}
                  onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, plannedDurationMinutes: parseInt(e.target.value) } : t))}
                  className="bg-transparent text-[22px] font-mono text-gray-600 text-center w-16 focus:outline-none hover:bg-gray-100 rounded"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (isMainTimerActive) {
                  if (activeTimer?.type === 'task' && activeTimer?.id === detailTask.id) {
                    toggleTimer(detailTask.id, 'task');
                  } else if (activeTimer?.type === 'subtask' && detailTask.subtasks?.some(s => s.id === activeTimer.id)) {
                    toggleTimer(activeTimer.id, 'subtask');
                  }
                } else {
                  toggleTimer(detailTask.id, 'task');
                }
              }}
              className={`w-28 h-10 rounded font-bold text-sm transition-all flex items-center justify-center gap-2 ${isMainTimerActive
                  ? 'bg-transparent text-green-500 border border-green-500 hover:bg-green-50'
                  : 'bg-green-500 text-white hover:bg-green-600'
                }`}
            >
              {isMainTimerActive ? '⏸ STOP' : '▶ START'}
            </button>
          </div>
        </div>

        {/* Subtasks List */}
        <div className="flex flex-col gap-1 pl-11 mb-8">
          {detailTask.subtasks?.map(sub => (
            <div key={sub.id} className="flex items-center py-2 group">
              <button
                onClick={() => handleToggleSubtaskComplete(detailTask.id, sub.id)}
                className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors mr-3 ${sub.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-green-400'}`}
              >
                <span className="text-[10px] font-bold">✓</span>
              </button>

              <input
                type="text"
                value={sub.title}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && sub.title === '') {
                    setTasks(prev => prev.map(t => {
                      if (t.id !== detailTask.id) return t;
                      return { ...t, subtasks: t.subtasks.filter(s => s.id !== sub.id) };
                    }));
                  }
                }}
                onChange={(e) => setTasks(prev => prev.map(t => {
                  if (t.id !== detailTask.id) return t;
                  return { ...t, subtasks: t.subtasks.map(s => s.id === sub.id ? { ...s, title: e.target.value } : s) };
                }))}
                className={`flex-1 bg-transparent focus:outline-none text-[15px] min-w-0 ${sub.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}
              />

              <div className="flex items-center gap-6 ml-auto pl-4">
                <span className={`font-mono text-sm w-16 text-right ${sub.actualDurationSeconds > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                  {formatActualTime(sub.actualDurationSeconds)}
                </span>
                <input
                  type="number"
                  value={sub.plannedDurationMinutes}
                  onChange={(e) => setTasks(prev => prev.map(t => {
                    if (t.id !== detailTask.id) return t;
                    return { ...t, subtasks: t.subtasks.map(s => s.id === sub.id ? { ...s, plannedDurationMinutes: parseInt(e.target.value) || 0 } : s) };
                  }))}
                  className="font-mono text-sm text-gray-400 w-12 text-right bg-transparent focus:outline-none hover:bg-gray-100 rounded"
                />
                <button
                  onClick={() => toggleTimer(sub.id, 'subtask')}
                  className={`w-[72px] px-2 py-1 rounded font-bold text-[11px] flex items-center justify-center gap-1 transition-opacity ${activeTimer?.id === sub.id
                      ? 'bg-transparent text-green-500 border border-green-400 opacity-100'
                      : 'bg-transparent text-green-500 border border-green-400 opacity-0 group-hover:opacity-100'
                    }`}
                >
                  {activeTimer?.id === sub.id ? '⏸ STOP' : '▶ START'}
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => handleAddSubtask(detailTask.id)}
            className="flex items-center gap-3 text-gray-400 hover:text-gray-600 transition-colors mt-2 py-1 w-max"
          >
            <span className="w-4 h-4 flex items-center justify-center border border-gray-300 rounded-full text-[10px]">+</span>
            <span className="text-[15px]">Add subtask</span>
          </button>
        </div>

        {/* Notes Section */}
        <div className="mt-4 pl-11 flex-1 flex flex-col min-h-[200px]">
          <textarea
            value={detailTask.notes}
            onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, notes: e.target.value } : t))}
            placeholder="Add a description or notes for this task..."
            className="w-full flex-1 bg-transparent focus:outline-none text-gray-600 resize-none text-sm leading-relaxed"
          />
        </div>

      </div>
    );
  };

  const projectionDays = getProjectionDays(baseDate);
  const allTags = [...new Set(tasks.map(t => t.tag).filter(Boolean))];
  const filteredTasks = tasks.filter(t => taskFilter === 'all' || t.tag === taskFilter);

  return (
    <div className="absolute inset-0 flex flex-col p-8 pt-6 overflow-hidden bg-[var(--color-bg-dark)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <DateSelectorDropdown baseDate={baseDate} setBaseDate={setBaseDate} />
          <FilterDropdown taskFilter={taskFilter} setTaskFilter={setTaskFilter} allTags={allTags} />
        </div>
        <div className="flex gap-2 bg-black/40 p-1 rounded-full border border-white/10">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'daily' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
          >
            Daily Planning
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'weekly' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
          >
            Multi-Day Projection
          </button>
        </div>
      </div>

      {/* Task Creator Modal */}
      {taskCreatorConfig && (
        <TaskCreatorModal
          config={taskCreatorConfig}
          onClose={() => setTaskCreatorConfig(null)}
          onAdd={handleAddTask}
        />
      )}

      {/* Main Layout */}
      <DndContext id="action-dnd" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-4 min-h-0 overflow-x-auto pb-4">

          {/* DAILY VIEW: BACKLOG PANEL */}
          {viewMode === 'daily' && (
            <div className="w-[350px] flex-shrink-0 flex flex-col gap-4">
              <KanbanColumn
                id="next_few_days"
                title="Next few day"
                tasks={filteredTasks.filter(t => isNextFewDays(t.startDate))}
                sessions={sessions}
                onAddTaskClick={null}
                showAdd={false}
                activeTimer={activeTimer}
                onToggleTimer={toggleTimer}
                onOpenDetail={setDetailTaskId}
                onToggleComplete={handleToggleComplete}
                onToggleSubtaskComplete={handleToggleSubtaskComplete}
              />
              <KanbanColumn
                id="inbox"
                title="Inbox"
                tasks={filteredTasks.filter(t => !t.startDate)}
                sessions={sessions}
                onAddTaskClick={setTaskCreatorConfig}
                activeTimer={activeTimer}
                onToggleTimer={toggleTimer}
                onOpenDetail={setDetailTaskId}
                onToggleComplete={handleToggleComplete}
                onToggleSubtaskComplete={handleToggleSubtaskComplete}
              />
            </div>
          )}

          {/* DYNAMIC PROJECTION COLUMNS AND SHUTDOWN VIEW */}
          {viewMode === 'shutdown' ? (
            <ShutdownView 
              dateStr={baseDate} 
              tasks={filteredTasks} 
              sessions={sessions}
              onAddTaskClick={setTaskCreatorConfig}
              activeTimer={activeTimer}
              onToggleTimer={toggleTimer}
              onOpenDetail={setDetailTaskId}
              onToggleComplete={handleToggleComplete}
              onToggleSubtaskComplete={handleToggleSubtaskComplete}
            />
          ) : (
            <>
              {(viewMode === 'daily' ? [projectionDays[0]] : projectionDays).map(day => (
                <KanbanColumn
                  onShutdownClick={handleShutdownClick}
              key={day.id}
              id={day.id}
              title={day.title}
              dateStr={day.dateStr}
              tasks={filteredTasks.filter(t => t.startDate === day.dateStr || (!t.startDate && t.status === day.id))}
              sessions={sessions}
              onAddTaskClick={setTaskCreatorConfig}
              activeTimer={activeTimer}
              onToggleTimer={toggleTimer}
              onOpenDetail={setDetailTaskId}
              onToggleComplete={handleToggleComplete}
              onToggleSubtaskComplete={handleToggleSubtaskComplete}
            />
          ))}

          {/* CALENDAR (ALWAYS VISIBLE, RIGHT ALIGNED) */}
          <CalendarGrid 
            sessions={sessions} 
            tasks={filteredTasks} 
            onOpenDetail={setDetailTaskId} 
            baseDate={baseDate} 
            zoomLevel={calendarZoom} 
            setZoomLevel={setCalendarZoom} 
            calendarScrollRef={calendarScrollRef}
            onDoubleClickTime={(mins) => {
              setTaskCreatorConfig({ status: baseDate, dateStr: baseDate, startMinutes: mins });
            }} 
          />
            </>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeTaskObj ? (
            <div className="rotate-3 scale-105 shadow-2xl opacity-90 w-[280px]">
              <SortableTask task={activeTaskObj} isActiveTimer={false} onToggleTimer={() => { }} onOpenDetail={() => { }} onToggleComplete={() => { }} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* TASK DETAIL OVERLAY */}
      {detailTaskId && !isFocusMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setDetailTaskId(null)}>
          <div className="bg-[#fcfcfc] border border-gray-200 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-full bg-[#fcfcfc] flex">
              <div className="flex-1 p-10 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
                {renderDetailContent()}
              </div>
              <button onClick={() => setDetailTaskId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800 text-xl font-bold">✕</button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN FOCUS MODE */}
      {detailTaskId && isFocusMode && (
        <div className="fixed inset-0 z-[200] bg-[#fcfcfc] flex items-start justify-center p-12 overflow-y-auto overflow-x-hidden animate-in zoom-in-95 duration-200 custom-scrollbar">
          {renderDetailContent()}
        </div>
      )}

    </div>
  );
}
