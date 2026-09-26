import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskNotes from './TaskNotes';
import MoreActionsDropdown from './MoreActionsDropdown';
import { formatActualTime } from '@/lib/utils';

function SortableSubtaskItem({ sub, detailTaskId, activeTimer, onToggleSubtaskComplete, onToggleTimer, updateTask, setTasks, deleteTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sub.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : 1
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center py-2 group ${isDragging ? 'bg-[var(--color-bg-panel)] rounded-lg shadow-xl' : ''}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 mr-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity -ml-7 w-6 flex items-center justify-center">
        <svg width="12" height="20" viewBox="0 0 16 24" fill="currentColor">
          <circle cx="6" cy="4" r="2" />
          <circle cx="10" cy="4" r="2" />
          <circle cx="6" cy="12" r="2" />
          <circle cx="10" cy="12" r="2" />
          <circle cx="6" cy="20" r="2" />
          <circle cx="10" cy="20" r="2" />
        </svg>
      </button>

      <button
        onClick={() => onToggleSubtaskComplete(detailTaskId, sub.id)}
        className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors mr-3 ${sub.isCompleted ? 'bg-green-500 border-green-500 text-[var(--color-text-main)]' : 'border-[var(--color-border-hover)] text-transparent hover:border-green-400'}`}
      >
        <span className="text-[10px] font-bold">✓</span>
      </button>

      <input
        type="text"
        autoFocus={sub.title === ''}
        value={sub.title}
        onKeyDown={(e) => {
          if (e.key === 'Backspace' && !e.target.value) {
            setTasks(prev => prev.map(t => {
              if (t.id !== detailTaskId) return t;
              return { ...t, subtasks: t.subtasks.filter(s => s.id !== sub.id) };
            }));
            deleteTask(sub.id);
          }
        }}
        onChange={(e) => setTasks(prev => prev.map(t => {
          if (t.id !== detailTaskId) return t;
          return { ...t, subtasks: t.subtasks.map(s => s.id === sub.id ? { ...s, title: e.target.value } : s) };
        }))}
        onBlur={(e) => updateTask(sub.id, { title: e.target.value })}
        className={`flex-1 bg-transparent focus:outline-none text-[15px] min-w-0 ${sub.isCompleted ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-main)]'}`}
      />

      <div className="flex items-center gap-6 ml-auto pl-4">
        <span className={`font-mono text-sm w-16 text-right ${sub.actualDurationSeconds > 0 ? 'text-green-500' : 'text-[var(--color-text-muted)]'}`}>
          {formatActualTime(sub.actualDurationSeconds)}
        </span>
        <input
          type="number"
          value={sub.plannedDurationMinutes}
          onChange={(e) => setTasks(prev => prev.map(t => {
            if (t.id !== detailTaskId) return t;
            return { ...t, subtasks: t.subtasks.map(s => s.id === sub.id ? { ...s, plannedDurationMinutes: parseInt(e.target.value) || 0 } : s) };
          }))}
          onBlur={(e) => updateTask(sub.id, { plannedDurationMinutes: parseInt(e.target.value) || 0 })}
          className="font-mono text-sm text-[var(--color-text-muted)] w-12 text-right bg-transparent focus:outline-none hover:bg-[var(--color-bg-panel-hover)] rounded"
        />
        <button
          onClick={() => onToggleTimer(sub.id, 'subtask')}
          className={`w-[72px] px-2 py-1 rounded font-bold text-[11px] flex items-center justify-center gap-1 transition-opacity ${activeTimer?.id === sub.id
            ? 'bg-transparent text-green-500 border border-green-400 opacity-100'
            : 'bg-transparent text-green-500 border border-green-400 opacity-0 group-hover:opacity-100'
            }`}
        >
          {activeTimer?.id === sub.id ? '⏸ STOP' : '▶ START'}
        </button>
      </div>
    </div>
  );
}

export default function TaskDetailModal({
  detailTaskId,
  isFocusMode,
  setIsFocusMode,
  tasks,
  sessions,
  projects,
  objectives,
  activeTimer,
  setTasks,
  updateTask,
  setSessions,
  toggleTimer,
  handleDeleteTask,
  handleToggleComplete,
  handleToggleSubtaskComplete,
  handleAddSubtask,
  deleteTask,
  setDetailProjectId,
  setDetailObjectiveId,
  setViewMode,
  reorderSubtasks,
  onClose
}) {
  if (!detailTaskId) return null;

  const detailTask = tasks.find(t => t.id === detailTaskId);
  if (!detailTask) return null;

  const totalActualSeconds = detailTask.actualDurationSeconds + (detailTask.subtasks?.reduce((acc, sub) => acc + sub.actualDurationSeconds, 0) || 0);
  const detailSession = sessions.find(s => s.taskId === detailTask.id);
  const isMainTimerActive = (activeTimer?.type === 'task' && activeTimer?.id === detailTask.id) || (activeTimer?.type === 'subtask' && detailTask.subtasks?.some(s => s.id === activeTimer.id));
  
  const detailTaskProject = detailTask.projectId ? projects.find(p => p.id === detailTask.projectId) : null;
  const detailTaskObjective = detailTaskProject?.objectiveId ? objectives.find(o => o.id === detailTaskProject.objectiveId) : null;

  const renderContent = () => (
    <div className="flex flex-col h-full max-w-4xl mx-auto w-full pt-6 relative text-[var(--color-text-main)]">
      {/* Unified Top Header Bar */}
      <div className="flex items-center justify-between w-full mb-8 text-xs font-semibold text-[var(--color-text-muted)] relative z-[90]">
        
        {/* Left Side: Tag / Channel */}
        <div className="flex flex-col items-start gap-1">
          <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] pl-1">Channel</span>
          <div className="flex items-center gap-2 hover:bg-[var(--color-bg-panel-hover)] px-1 py-0.5 rounded transition-colors -ml-1">
            <span className="text-[#f2a950] font-bold text-lg leading-none">#</span>
            <input
              type="text"
              value={detailTask.tag || ''}
              onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, tag: e.target.value } : t))}
              onBlur={(e) => updateTask(detailTask.id, { tag: e.target.value })}
              placeholder="work"
              className="bg-transparent border-none focus:outline-none text-[var(--color-text-main)] text-[13px] w-24"
            />
          </div>
        </div>

        {/* Right Side: Priority, Dates, Actions */}
        <div className="flex gap-2 items-center shrink-0">
          {detailSession && (
            <div className="flex gap-1.5 items-center text-[#f2a950] bg-[#f2a950]/10 px-2 py-1 rounded font-bold shrink-0">
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
          <div className="flex gap-1 items-center hover:bg-[var(--color-bg-panel-hover)] px-2 py-1.5 rounded transition-colors shrink-0">
            <span className="text-[var(--color-text-muted)]">🚩</span>
            <select
              value={detailTask.priority}
              onChange={(e) => {
                setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, priority: e.target.value } : t));
                updateTask(detailTask.id, { priority: e.target.value });
              }}
              className="bg-transparent border-none focus:outline-none cursor-pointer text-[var(--color-text-main)] text-[13px]"
            >
              <option value="None">Priority 4</option>
              <option value="Low">Priority 3</option>
              <option value="Medium">Priority 2</option>
              <option value="High">Priority 1</option>
            </select>
          </div>
          
          <div className="flex flex-col items-start leading-none gap-1 hover:bg-[var(--color-bg-panel-hover)] px-2 py-1 rounded transition-colors -mt-1 shrink-0">
            <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)]">Start</span>
            <input
              type="date"
              value={detailTask.startDate || ''}
              onChange={(e) => {
                setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, startDate: e.target.value } : t));
                updateTask(detailTask.id, { startDate: e.target.value || null });
              }}
              className="bg-transparent border-none focus:outline-none text-[var(--color-text-main)] w-[105px] text-[13px] cursor-pointer"
            />
          </div>

          <div className="flex flex-col items-start leading-none gap-1 hover:bg-[var(--color-bg-panel-hover)] px-2 py-1 rounded transition-colors -mt-1 shrink-0">
            <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)]">Due</span>
            <input
              type="date"
              value={detailTask.dueDate || ''}
              onChange={(e) => {
                setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, dueDate: e.target.value } : t));
                updateTask(detailTask.id, { dueDate: e.target.value || null });
              }}
              className="bg-transparent border-none focus:outline-none text-[var(--color-text-main)] w-[105px] text-[13px] cursor-pointer"
            />
          </div>
          
          <button onClick={() => handleAddSubtask(detailTask.id)} className="flex items-center gap-1.5 hover:bg-[var(--color-bg-panel-hover)] px-2 py-1.5 rounded transition-colors text-[var(--color-text-muted)] font-medium text-[13px]">
            <span className="text-lg leading-none mb-0.5 text-[var(--color-text-muted)]">+</span> Subtasks
          </button>

          <MoreActionsDropdown onDelete={() => handleDeleteTask(detailTask.id)} />

          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors text-lg ${isFocusMode ? 'bg-[var(--color-bg-panel-hover)] text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel-hover)]'}`}
            title="Focus Mode"
          >
            ⤢
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      {(detailTaskObjective || detailTaskProject) && (
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] mt-2 mb-[-1.5rem] px-1">
          {detailTaskObjective && (
            <>
              <span 
                className="text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-main)] transition-colors"
                onClick={() => {
                  onClose();
                  setDetailObjectiveId(detailTaskObjective.id);
                  setViewMode('projects');
                }}
              >
                🎯 {detailTaskObjective.title}
              </span>
              <span className="text-[var(--color-text-muted)]">/</span>
            </>
          )}
          {detailTaskProject && (
            <>
              <span 
                className="text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-main)] transition-colors"
                onClick={() => {
                  onClose();
                  setDetailProjectId(detailTaskProject.id);
                  setViewMode('projects');
                }}
              >
                📁 {detailTaskProject.title}
              </span>
            </>
          )}
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-start justify-between mt-12 mb-10">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={() => handleToggleComplete(detailTask.id)}
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${detailTask.isCompleted ? 'bg-green-500 border-green-500 text-[var(--color-text-main)]' : 'border-[var(--color-border-hover)] text-transparent hover:border-green-400'}`}
          >
            <span className="text-sm font-bold">✓</span>
          </button>
          <input
            type="text"
            value={detailTask.title}
            onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, title: e.target.value } : t))}
            onBlur={(e) => updateTask(detailTask.id, { title: e.target.value })}
            className={`bg-transparent text-4xl font-bold focus:outline-none flex-1 min-w-0 ${detailTask.isCompleted ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text-main)]'}`}
          />
        </div>

        <div className="flex gap-6 items-center text-center pl-8">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Actual</span>
            <span className={`text-[22px] font-mono ${totalActualSeconds > 0 ? 'text-green-500' : 'text-[var(--color-text-main)]'}`}>{formatActualTime(totalActualSeconds)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Planned</span>
            <div className="flex items-baseline">
              <input
                type="number"
                value={detailTask.plannedDurationMinutes || 0}
                onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, plannedDurationMinutes: parseInt(e.target.value) || 0 } : t))}
                onBlur={(e) => updateTask(detailTask.id, { plannedDurationMinutes: parseInt(e.target.value) || 0 })}
                className="bg-transparent text-[22px] font-mono text-[var(--color-text-main)] text-center w-16 focus:outline-none hover:bg-[var(--color-bg-panel-hover)] rounded"
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
              : 'bg-green-500 text-[var(--color-text-main)] hover:bg-green-600'
              }`}
          >
            {isMainTimerActive ? '⏸ STOP' : '▶ START'}
          </button>
        </div>
      </div>



      {/* Subtasks List */}
      <div className="flex flex-col gap-1 pl-11 mb-8">
        <DndContext
          id="subtasks-dnd"
          collisionDetection={closestCenter}
          onDragEnd={(e) => {
            const { active, over } = e;
            if (over && active.id !== over.id) {
              let updatedSubtasks = null;
              setTasks(prev => {
                return prev.map(t => {
                  if (t.id !== detailTask.id) return t;
                  const oldIndex = t.subtasks.findIndex(s => s.id === active.id);
                  const newIndex = t.subtasks.findIndex(s => s.id === over.id);
                  const newSubtasks = arrayMove(t.subtasks, oldIndex, newIndex);
                  updatedSubtasks = newSubtasks;
                  return { ...t, subtasks: newSubtasks };
                });
              });
              
              if (updatedSubtasks) {
                const taskOrders = updatedSubtasks.map((s, idx) => ({ id: s.id, order: idx }));
                reorderSubtasks(taskOrders);
              }
            }
          }}
        >
          <SortableContext items={detailTask.subtasks?.map(s => s.id) || []} strategy={verticalListSortingStrategy}>
            {detailTask.subtasks?.map(sub => (
              <SortableSubtaskItem 
                key={sub.id} 
                sub={sub} 
                detailTaskId={detailTask.id} 
                activeTimer={activeTimer} 
                onToggleSubtaskComplete={handleToggleSubtaskComplete} 
                onToggleTimer={toggleTimer} 
                updateTask={updateTask} 
                setTasks={setTasks} 
                deleteTask={deleteTask} 
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          onClick={() => handleAddSubtask(detailTask.id)}
          className="flex items-center gap-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors mt-2 py-1 w-max"
        >
          <span className="w-4 h-4 flex items-center justify-center border border-[var(--color-border-hover)] rounded-full text-[10px]">+</span>
          <span className="text-[15px]">Add subtask</span>
        </button>
      </div>

      {/* Task Notes */}
      <div className="pl-11 pr-4 mb-6 flex-1">
        <TaskNotes
          initialNote={detailTask.notes}
          onSave={(note) => {
            setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, notes: note } : t));
            updateTask(detailTask.id, { notes: note });
          }}
        />
      </div>
    </div>
  );

  return (
    <>
      {!isFocusMode ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
          <div className="bg-[var(--color-bg-panel)] border border-[var(--color-border)] w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-full bg-[var(--color-bg-panel)] flex">
              <div className="flex-1 p-10 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
                {renderContent()}
              </div>
              <button onClick={onClose} className="absolute top-6 right-6 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-xl font-bold">✕</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[200] bg-[var(--color-bg-panel)] flex items-start justify-center p-12 overflow-y-auto overflow-x-hidden animate-in zoom-in-95 duration-200 custom-scrollbar">
          {renderContent()}
        </div>
      )}
    </>
  );
}
