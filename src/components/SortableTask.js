"use client";

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatActualTime, formatMins, formatSessionTime } from '@/lib/utils';

export default function SortableTask({ task, session, isActiveTimer, activeTimer, onToggleTimer, onOpenDetail, onToggleComplete, onToggleSubtaskComplete, onDeleteTask }) {
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
      className={`p-3 bg-[var(--color-bg-dark)] border ${isActiveTimer ? 'border-[var(--color-accent)] shadow-[0_0_15px_var(--color-accent)]/20' : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'} ${task.isCompleted ? 'opacity-50' : ''} rounded-xl mb-3 group transition-all relative flex flex-col`}
    >
      <div className="flex justify-between items-start mb-2 relative">
        <div className="flex-1 flex gap-2 items-start cursor-grab active:cursor-grabbing mr-2 pb-1" {...attributes} {...listeners} onClick={() => onOpenDetail(task.id)}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleComplete(task.id); }}
            className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${task.isCompleted ? 'bg-green-500 border-green-500' : 'border-[var(--color-border-hover)] hover:border-white/60'}`}
          >
            {task.isCompleted && <span className="text-[var(--color-text-main)] text-[10px]">✓</span>}
          </button>
          <div className={`text-sm font-semibold leading-tight ${task.isCompleted ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-main)]'}`}>
            {session && (
              <span className="inline-block mr-2 text-[10px] bg-[#f2a950] text-black px-1.5 py-0.5 rounded font-bold align-middle mb-0.5">
                {formatSessionTime(session.startMinutes)}
              </span>
            )}
            {task.title}
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
          className="text-[var(--color-text-muted)] opacity-50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1"
          title="Delete Task"
        >
          🗑️
        </button>
      </div>

      {/* SUBTASKS BLOCK */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="flex flex-col gap-1.5 pl-6 pr-2 mb-3 mt-1">
          {task.subtasks.map(sub => (
            <div key={sub.id} className="flex items-center justify-between group/sub">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleSubtaskComplete(task.id, sub.id); }}
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${sub.isCompleted ? 'bg-green-500 border-green-500' : 'border-[var(--color-border-hover)] hover:border-white/60'}`}
                >
                  {sub.isCompleted && <span className="text-[var(--color-text-main)] text-[8px]">✓</span>}
                </button>
                <span className={`text-xs truncate cursor-pointer ${sub.isCompleted ? 'text-[var(--color-text-muted)] opacity-70 line-through' : 'text-[var(--color-text-main)]'}`} onClick={(e) => { e.stopPropagation(); onOpenDetail(task.id); }}>
                  {sub.title}
                </span>
              </div>
              <div className={`flex items-center gap-2 transition-opacity ${activeTimer?.id === sub.id && activeTimer?.type === 'subtask' ? 'opacity-100' : 'opacity-0 group-hover/sub:opacity-100'}`}>
                <div className="text-[9px] font-mono text-[var(--color-text-muted)] opacity-70">
                  {formatActualTime(sub.actualDurationSeconds)} / {formatMins(sub.plannedDurationMinutes)}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleTimer(sub.id, 'subtask'); }}
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${activeTimer?.id === sub.id && activeTimer?.type === 'subtask' ? 'bg-red-500/20 text-red-500' : 'bg-[var(--color-bg-panel-hover)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel-hover)]'}`}
                >
                  {activeTimer?.id === sub.id && activeTimer?.type === 'subtask' ? '⏹' : '▶'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-[var(--color-border)]">
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

        <div className={`text-[10px] font-mono px-2 py-0.5 rounded ${isOverTime ? 'bg-red-500/20 text-red-400' : 'bg-[var(--color-bg-panel)] text-[var(--color-text-muted)]'}`}>
          {actualFormatted} / {plannedFormatted}
        </div>
      </div>
    </div>
  );
}
