"use client";

import { useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import DraggableSession from './DraggableSession';
import CurrentTimeLine from './CurrentTimeLine';
import { HOURS, formatAbsoluteDate } from '@/lib/utils';

export default function CalendarGrid({ sessions, tasks, onOpenDetail, baseDate, zoomLevel, setZoomLevel, calendarScrollRef, onDoubleClickTime }) {
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

  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  const todayStr = d.toISOString().split('T')[0];
  const isToday = baseDate === todayStr || !baseDate;

  return (
    <div className="w-[300px] flex-shrink-0 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-2xl flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-panel)]">
        <h2 className="font-semibold text-[var(--color-text-main)]">{baseDate ? formatAbsoluteDate(baseDate) : 'Calendars'}</h2>
        <div className="flex gap-2 text-[var(--color-text-main)]">
          <button onClick={() => setZoomLevel(Math.max(40, zoomLevel - 20))} className="w-6 h-6 rounded bg-[var(--color-bg-panel-hover)] hover:bg-[var(--color-bg-panel-hover)] flex items-center justify-center font-mono">-</button>
          <button onClick={() => setZoomLevel(Math.min(160, zoomLevel + 20))} className="w-6 h-6 rounded bg-[var(--color-bg-panel-hover)] hover:bg-[var(--color-bg-panel-hover)] flex items-center justify-center font-mono">+</button>
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
          {isToday && <CurrentTimeLine zoomLevel={zoomLevel} />}
          {HOURS.map(h => (
            <div key={h} style={{ height: `${zoomLevel}px` }} className="border-b border-[var(--color-border)] relative flex pointer-events-none">
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
