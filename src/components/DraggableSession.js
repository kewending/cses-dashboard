"use client";

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { formatSessionTime } from '@/lib/utils';

export default function DraggableSession({ session, task, onOpenDetail, zoomLevel }) {
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
      <div className={`text-[11px] font-bold text-[var(--color-text-main)] leading-tight ${task.isCompleted ? 'line-through' : ''}`}>{task.title}</div>
      <div className="text-[10px] text-blue-100 mt-auto">
        {formatSessionTime(session.startMinutes)}
      </div>
    </div>
  );
}
