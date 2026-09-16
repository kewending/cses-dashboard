import React, { useState } from 'react';
import TaskNotes from './TaskNotes';
import ProjectCreatorModal from './ProjectCreatorModal';
import { formatActualTime, formatMins } from '@/lib/utils';

function calcProjectTime(projectId, allProjects, allTasks) {
  const directSubs = allProjects.filter(p => p.parentProjectId === projectId);

  if (directSubs.length > 0) {
    return directSubs.reduce((acc, sub) => {
      const subTasks = allTasks.filter(t => t.projectId === sub.id);
      subTasks.forEach(t => {
        acc.actualSeconds += (t.actualDurationSeconds || 0);
        acc.plannedMinutes += (t.plannedDurationMinutes || 0);
      });
      return acc;
    }, { actualSeconds: 0, plannedMinutes: 0 });
  } else {
    const directTasks = allTasks.filter(t => t.projectId === projectId);
    return directTasks.reduce((acc, t) => ({
      actualSeconds: acc.actualSeconds + (t.actualDurationSeconds || 0),
      plannedMinutes: acc.plannedMinutes + (t.plannedDurationMinutes || 0),
    }), { actualSeconds: 0, plannedMinutes: 0 });
  }
}

const STATUSES = ['BACKLOG', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'];
const STATUS_LABELS = {
  BACKLOG: 'Backlog',
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  PAUSED: 'Paused',
  COMPLETED: 'Completed'
};

export default function ProjectDetailModal({
  projectId,
  projects,
  tasks,
  objectives,
  setProjects,
  updateProject,
  setTasks,
  updateTask,
  toggleTaskComplete,
  deleteTask,
  handleDeleteProject,
  createProject,
  onOpenTask,
  onAddTaskClick,
  setDetailObjectiveId,
  setDetailProjectId,
  onClose
}) {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [projectCreatorConfig, setProjectCreatorConfig] = useState(null);

  const renderContent = () => {
    const detailProject = projects.find(p => p.id === projectId);
    if (!detailProject) return null;
    
    const liveSubprojects = projects.filter(p => p.parentProjectId === detailProject.id);
    const liveTasks = tasks.filter(t => t.projectId === detailProject.id);
    
    const isParent = liveSubprojects.length > 0;
    const isSub = !!detailProject.parentProjectId;

    let progressStr = '';
    let progressPercent = 0;
    
    if (isParent) {
      const total = liveSubprojects.length;
      const completed = liveSubprojects.filter(s => s.status === 'COMPLETED').length;
      progressStr = `${completed} / ${total} Projects Completed`;
      progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
    } else {
      const total = liveTasks.length;
      const completed = liveTasks.filter(t => t.isCompleted).length;
      progressStr = `${completed} / ${total} Tasks Completed`;
      progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
    }

    const detailProjectObjective = detailProject.objectiveId ? objectives.find(o => o.id === detailProject.objectiveId) : null;
    const detailProjectParent = detailProject.parentProjectId ? projects.find(p => p.id === detailProject.parentProjectId) : null;

    return (
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full pt-6 relative text-[var(--color-text-main)]">
        <div className="flex items-center justify-between w-full mb-8 text-xs font-semibold text-[var(--color-text-muted)] relative z-[90]">
          <div className="flex flex-col items-start gap-1">
            <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] pl-1">Objective</span>
            <select
              value={detailProject.objectiveId || ''}
              disabled={isSub}
              onChange={(e) => {
                setProjects(prev => prev.map(p => p.id === detailProject.id ? { ...p, objectiveId: e.target.value || null } : p));
                updateProject(detailProject.id, { objectiveId: e.target.value || null });
              }}
              className="bg-transparent border-none focus:outline-none text-[var(--color-text-main)] text-[13px] w-32 truncate"
            >
              <option value="">None</option>
              {objectives.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          
          <div className="flex gap-2 items-center shrink-0">
            <div className="flex gap-1 items-center hover:bg-[var(--color-bg-panel-hover)] px-2 py-1.5 rounded transition-colors shrink-0">
              <select
                value={detailProject.status}
                onChange={(e) => {
                  setProjects(prev => prev.map(p => p.id === detailProject.id ? { ...p, status: e.target.value } : p));
                  updateProject(detailProject.id, { status: e.target.value });
                }}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-[var(--color-text-main)] text-[13px]"
              >
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col items-start leading-none gap-1 hover:bg-[var(--color-bg-panel-hover)] px-2 py-1 rounded transition-colors -mt-1 shrink-0">
              <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)]">Start</span>
              <input
                type="date"
                value={detailProject.startDate || ''}
                onChange={(e) => {
                  setProjects(prev => prev.map(p => p.id === detailProject.id ? { ...p, startDate: e.target.value } : p));
                  updateProject(detailProject.id, { startDate: e.target.value || null });
                }}
                className="bg-transparent border-none focus:outline-none text-[var(--color-text-main)] w-[105px] text-[13px] cursor-pointer"
              />
            </div>
            
            <div className="flex flex-col items-start leading-none gap-1 hover:bg-[var(--color-bg-panel-hover)] px-2 py-1 rounded transition-colors -mt-1 shrink-0">
              <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)]">End</span>
              <input
                type="date"
                value={detailProject.endDate || ''}
                onChange={(e) => {
                  setProjects(prev => prev.map(p => p.id === detailProject.id ? { ...p, endDate: e.target.value } : p));
                  updateProject(detailProject.id, { endDate: e.target.value || null });
                }}
                className="bg-transparent border-none focus:outline-none text-[var(--color-text-main)] w-[105px] text-[13px] cursor-pointer"
              />
            </div>

            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors text-lg ${isFocusMode ? 'bg-[var(--color-bg-panel-hover)] text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel-hover)]'}`}
              title="Focus Mode"
            >
              ⤢
            </button>
          </div>
        </div>

        {/* Time Summary */}
        {(() => {
          const { actualSeconds, plannedMinutes } = calcProjectTime(detailProject.id, projects, tasks);
          const hasAny = actualSeconds > 0 || plannedMinutes > 0;
          if (!hasAny) return null;
          const efficiencyPct = plannedMinutes > 0
            ? Math.round((actualSeconds / (plannedMinutes * 60)) * 100)
            : null;
          return (
            <div className="flex items-center gap-5 mt-3 mb-1 px-1 py-2.5 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-xl">
              <div className="flex flex-col items-center flex-1">
                <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">Time Spent</span>
                <span className={`text-sm font-mono font-semibold ${actualSeconds > 0 ? 'text-green-600' : 'text-[var(--color-text-muted)]'}`}>
                  {actualSeconds > 0 ? formatActualTime(actualSeconds) : '--'}
                </span>
              </div>
              <div className="w-px h-6 bg-[var(--color-bg-panel-hover)]" />
              <div className="flex flex-col items-center flex-1">
                <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">Estimated</span>
                <span className="text-sm font-mono font-semibold text-[var(--color-text-muted)]">
                  {formatMins(plannedMinutes)}
                </span>
              </div>
              {efficiencyPct !== null && actualSeconds > 0 && (
                <>
                  <div className="w-px h-6 bg-[var(--color-bg-panel-hover)]" />
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">Used</span>
                    <span className={`text-sm font-mono font-semibold ${
                      efficiencyPct <= 100 ? 'text-green-600' : 'text-orange-500'
                    }`}>
                      {efficiencyPct}%
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Breadcrumb */}
        {(detailProjectObjective || detailProjectParent) && (
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] mt-2 mb-[-1.5rem] px-1">
            {detailProjectObjective && (
              <>
                <span 
                  className="text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-main)] transition-colors"
                  onClick={() => {
                    setDetailProjectId(null);
                    setDetailObjectiveId(detailProjectObjective.id);
                  }}
                >
                  🎯 {detailProjectObjective.title}
                </span>
                {detailProjectParent && <span className="text-[var(--color-text-muted)]">/</span>}
              </>
            )}
            {detailProjectParent && (
              <>
                <span 
                  className="text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-main)] transition-colors"
                  onClick={() => {
                    setDetailProjectId(detailProjectParent.id);
                  }}
                >
                  📁 {detailProjectParent.title}
                </span>
              </>
            )}
          </div>
        )}

        {/* Header: title + progress + delete */}
        <div className="flex items-start justify-between mt-12 mb-10">
          <input
            type="text"
            value={detailProject.title}
            onChange={(e) => setProjects(prev => prev.map(p => p.id === detailProject.id ? { ...p, title: e.target.value } : p))}
            onBlur={(e) => updateProject(detailProject.id, { title: e.target.value })}
            className="bg-transparent text-4xl font-bold focus:outline-none flex-1 min-w-0 text-[var(--color-text-main)]"
            placeholder="Project Title"
          />
          
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <div className="flex flex-col items-end gap-1 text-sm font-semibold text-[var(--color-text-muted)]">
              <span>{progressStr}</span>
              <div className="w-32 h-2 bg-[var(--color-bg-panel-hover)] rounded-full overflow-hidden mt-1">
                 <div className="h-full bg-green-500 transition-all" style={{width: `${progressPercent}%`}} />
              </div>
            </div>
            <button
              onClick={() => handleDeleteProject(detailProject.id)}
              className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete Project"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div className="mb-8">
           { (isParent || (!isParent && !isSub && liveTasks.length === 0)) && (
              <div className="mb-6">
                <h3 className="font-bold text-[var(--color-text-main)] mb-2">Subprojects</h3>
                <div className="flex flex-col gap-1.5">
                  {liveSubprojects.map(sub => (
                    <div key={sub.id} className="group flex items-center gap-2 p-2.5 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg shadow-sm hover:border-[var(--color-border-hover)] transition-colors">
                      {/* Drag handle */}
                      <span className="cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-muted)] flex-shrink-0 select-none text-lg leading-none">⠿</span>

                      {/* Title — clickable to drill in */}
                      <span
                        className="flex-1 font-medium text-[14px] text-[var(--color-text-main)] hover:text-[var(--color-text-main)] cursor-pointer"
                        onClick={() => setDetailProjectId(sub.id)}
                      >
                        {sub.title}
                      </span>

                      {/* Status badge */}
                      <span className="text-[10px] font-bold text-[var(--color-text-muted)] bg-[var(--color-bg-panel-hover)] px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0">
                        {sub.status}
                      </span>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteProject(sub.id)}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 transition-all flex-shrink-0"
                        title="Delete subproject"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      setProjectCreatorConfig({
                        parentProjectId: detailProject.id,
                        objectiveId: detailProject.objectiveId,
                      });
                      setShowProjectCreator(true);
                    }}
                    className="mt-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-hover)] border-2 border-dashed border-[var(--color-border)] rounded-lg p-2 text-center transition-colors"
                  >
                    + Add Subproject
                  </button>
                </div>
              </div>
           )}
           
           { (isSub || (!isParent && !isSub && liveSubprojects.length === 0)) && (
              <div>
                <h3 className="font-bold text-[var(--color-text-main)] mb-2">Tasks</h3>
                <div className="flex flex-col gap-1.5">
                  {liveTasks.map(task => {
                    const allSubsDone = task.subtasks?.length > 0 && task.subtasks.every(s => s.isCompleted);
                    return (
                      <div key={task.id} className="group flex items-center gap-2 p-2.5 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg shadow-sm hover:border-[var(--color-border-hover)] transition-colors">
                        {/* Drag handle */}
                        <span className="cursor-grab active:cursor-grabbing text-[var(--color-text-muted)] hover:text-[var(--color-text-muted)] flex-shrink-0 select-none text-lg leading-none">⠿</span>

                        {/* Checkbox */}
                        <button
                          onClick={async () => {
                            const newVal = !task.isCompleted;

                            // Auto-fill actual time when completing a task that has 0 actual time
                            if (newVal && (task.actualDurationSeconds || 0) === 0 && (task.plannedDurationMinutes || 0) > 0) {
                              const filled = task.plannedDurationMinutes * 60;
                              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, actualDurationSeconds: filled } : t));
                              updateTask(task.id, { actualDurationSeconds: filled }); // fire-and-forget
                            }

                            // Cascade completion to subtasks
                            setTasks(prev => prev.map(t => {
                              if (t.id !== task.id) return t;
                              return {
                                ...t,
                                isCompleted: newVal,
                                subtasks: t.subtasks ? t.subtasks.map(s => ({ ...s, isCompleted: newVal })) : []
                              };
                            }));
                            await toggleTaskComplete(task.id, newVal);
                            // Also cascade subtask DB updates
                            if (task.subtasks?.length) {
                              task.subtasks.forEach(s => toggleTaskComplete(s.id, newVal));
                            }
                          }}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            task.isCompleted ? 'bg-green-500 border-green-500 text-[var(--color-text-main)]' : 'border-[var(--color-border-hover)] hover:border-green-400'
                          }`}
                        >
                          {task.isCompleted && <span className="text-[10px] font-bold">✓</span>}
                        </button>

                        {/* Task title — clickable */}
                        <span
                          className={`flex-1 font-medium text-[14px] cursor-pointer ${
                            task.isCompleted ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-main)] hover:text-[var(--color-text-main)]'
                          }`}
                          onClick={() => onOpenTask && onOpenTask(task.id)}
                        >
                          {task.title}
                        </span>

                        {/* Subtask count badge */}
                        {task.subtasks?.length > 0 && (
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-bg-panel-hover)] px-1.5 py-0.5 rounded">
                            {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                          </span>
                        )}

                        {/* Delete button */}
                        <button
                          onClick={() => {
                            if (deleteTask) deleteTask(task.id);
                            if (setTasks) setTasks(prev => prev.filter(t => t.id !== task.id));
                          }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 transition-all flex-shrink-0"
                          title="Delete task"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  <button 
                    onClick={() => {
                      if (onAddTaskClick) onAddTaskClick({ projectId: detailProject.id, status: 'inbox', dateStr: null });
                    }}
                    className="mt-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-hover)] border-2 border-dashed border-[var(--color-border)] rounded-lg p-2 text-center transition-colors"
                  >
                    + Add Task
                  </button>
                </div>
              </div>
           )}
        </div>
        
        <div className="flex-1 min-h-0 flex flex-col mt-auto border-t border-[var(--color-border)] pt-6">
          <h3 className="font-bold text-[var(--color-text-main)] mb-2">Description</h3>
          <TaskNotes
            initialNote={detailProject.description}
            onSave={(note) => {
              setProjects(prev => prev.map(p => p.id === detailProject.id ? { ...p, description: note } : p));
              updateProject(detailProject.id, { description: note });
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {!isFocusMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onPointerDown={onClose}>
          <div className="bg-[var(--color-bg-panel)] border border-[var(--color-border)] w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative" onPointerDown={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-full bg-[var(--color-bg-panel)] flex">
              <div className="flex-1 p-10 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
                {renderContent()}
              </div>
              <button onClick={onClose} className="absolute top-6 right-6 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-xl font-bold">✕</button>
            </div>
          </div>
        </div>
      )}

      {isFocusMode && (
        <div className="fixed inset-0 z-[200] bg-[var(--color-bg-panel)] flex items-start justify-center p-12 overflow-y-auto overflow-x-hidden animate-in zoom-in-95 duration-200 custom-scrollbar">
          {renderContent()}
        </div>
      )}

      {showProjectCreator && (
        <ProjectCreatorModal
          config={projectCreatorConfig}
          objectives={objectives}
          onClose={() => { setShowProjectCreator(false); setProjectCreatorConfig(null); }}
          onCreate={async (data) => {
            const newP = await createProject(data);
            setProjects(prev => [...prev, newP]);
            setShowProjectCreator(false);
          }}
        />
      )}
    </>
  );
}
