"use client";

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableTask from './SortableTask';
import { formatAbsoluteDate, formatActualTime, formatMins } from '@/lib/utils';

export default function KanbanColumn({ id, title, dateStr, tasks, sessions, onAddTaskClick, activeTimer, onToggleTimer, onOpenDetail, onToggleComplete, onToggleSubtaskComplete, onDeleteTask, showAdd = true, onShutdownClick }) {
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
              onDeleteTask={onDeleteTask}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
