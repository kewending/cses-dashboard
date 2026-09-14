import React, { useState } from 'react';
import { DndContext, closestCenter, DragOverlay, defaultDropAnimationSideEffects, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskNotes from './TaskNotes';
import ProjectCreatorModal from './ProjectCreatorModal';

const STATUSES = ['BACKLOG', 'PLANNING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'];
const STATUS_LABELS = {
  BACKLOG: 'Backlog',
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  PAUSED: 'Paused',
  COMPLETED: 'Completed'
};

function SortableProjectCard({ project, allProjects, allTasks, onDelete, onOpenDetail }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    data: { type: 'Project', project }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const liveSubprojects = allProjects.filter(p => p.parentProjectId === project.id);
  const liveTasks = allTasks?.filter(t => t.projectId === project.id) || [];
  const isParent = liveSubprojects.length > 0;
  
  let completedCount = 0;
  let totalCount = 0;
  
  if (isParent) {
    totalCount = liveSubprojects.length;
    completedCount = liveSubprojects.filter(s => s.status === 'COMPLETED').length;
  } else {
    totalCount = liveTasks.length;
    completedCount = liveTasks.filter(t => t.isCompleted).length;
  }
  
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const progressLabel = isParent ? 'Projects Done' : 'Tasks Done';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-[var(--color-bg-panel)] border border-white/10 p-4 rounded-xl flex flex-col gap-3 hover:border-white/20 transition-colors mb-3 relative group`}
    >
      {project.objective && (
        <div className="absolute -top-2 left-2 z-10 bg-gray-800 text-[10px] px-2 py-0.5 rounded-md border border-gray-600 text-gray-300 shadow-sm">
          🎯 {project.objective.title}
        </div>
      )}
      <div className="flex justify-between items-start gap-2 relative">
        <div className="flex-1 flex items-start cursor-grab active:cursor-grabbing mr-2 pb-1" {...attributes} {...listeners} onClick={() => onOpenDetail(project.id)}>
          <h4 className="text-white font-medium text-[15px] leading-tight">{project.title}</h4>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
          className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
          title="Delete Project"
        >
          🗑️
        </button>
      </div>

      <div className="flex flex-col gap-1 mt-auto">
        <div className="flex justify-between text-[11px] text-gray-500 font-bold uppercase tracking-wider">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
          <div className="bg-green-500 h-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          {completedCount} / {totalCount} {progressLabel}
        </div>
      </div>
    </div>
  );
}

function ObjectiveCard({ objective, projects, onDelete, onOpenDetail }) {
  return (
    <div onClick={() => onOpenDetail && onOpenDetail(objective.id)} className="border border-white/10 bg-black/20 px-4 py-3 rounded-xl flex justify-between items-center hover:border-white/20 transition-colors group cursor-pointer">
      <h3 className="font-bold text-white/90 text-[14px]">{objective.title}</h3>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-gray-500 font-mono bg-white/5 px-2 py-1 rounded">{projects.length} Proj</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(objective.id); }}
          className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="Delete Objective"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

function SortableColumn({ status, title, projects, allProjects, allTasks, addUI, onDeleteProject, onOpenDetail }) {
  const { setNodeRef } = useSortable({
    id: status,
    data: { type: 'Status', status }
  });

  return (
    <div className="flex-1 min-w-[200px] bg-[rgba(255,255,255,0.02)] border border-white/5 rounded-2xl flex flex-col overflow-hidden p-2">
      <div className="px-3 py-3 flex items-center justify-between font-semibold text-white/90">
        <div className="text-[15px]">{title}</div>
        <div className="text-[11px] font-mono px-2 py-1 rounded bg-white/10 text-white/60">
          {projects.length}
        </div>
      </div>
      
      {addUI && (
        <div className="px-2">
          {addUI}
        </div>
      )}

      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col min-h-[100px] rounded-xl transition-colors"
      >
        <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map(p => (
            <SortableProjectCard key={p.id} project={p} allProjects={allProjects} allTasks={allTasks} onDelete={onDeleteProject} onOpenDetail={onOpenDetail} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function ProjectsView({ 
  projects, allProjects, objectives, tasks = [], setTasks, setProjects, setObjectives, 
  createProject, updateProject, deleteProject, 
  createObjective, updateObjective, deleteObjective, 
  reorderProjects, objectiveFilter, onAddTaskClick,
  onOpenTask, toggleTaskComplete, deleteTask,
  detailProjectId, setDetailProjectId,
  detailObjectiveId, setDetailObjectiveId
}) {
  const [newObjectiveTitle, setNewObjectiveTitle] = useState('');
  
  const [isFocusMode, setIsFocusMode] = useState(false);

  const handleDeleteObjective = (id) => {
    setObjectives(prev => prev.filter(o => o.id !== id));
    setProjects(prev => prev.map(p => p.objectiveId === id ? { ...p, objectiveId: null } : p));
    deleteObjective(id);
  };

  const handleDeleteProject = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    deleteProject(id);
  };

  const [isAddingObjective, setIsAddingObjective] = useState(false);
  const [showProjectCreator, setShowProjectCreator] = useState(false);
  const [projectCreatorConfig, setProjectCreatorConfig] = useState(null);
  
  const [activeProject, setActiveProject] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = (e) => {
    const { active } = e;
    const project = projects.find(p => p.id === active.id);
    setActiveProject(project);
  };

  const handleDragEnd = (e) => {
    const { active, over } = e;
    setActiveProject(null);
    if (!over) return;

    const activeProject = projects.find(p => p.id === active.id);
    if (!activeProject) return;

    const isOverColumn = STATUSES.includes(over.id);
    let targetStatus = null;

    if (isOverColumn) {
      targetStatus = over.id;
    } else {
      const overProject = projects.find(p => p.id === over.id);
      if (overProject) targetStatus = overProject.status;
    }

    if (targetStatus) {
      let updated = [...projects];
      const activeIndex = updated.findIndex(p => p.id === active.id);
      let needsStatusUpdate = false;
      
      if (activeProject.status !== targetStatus) {
        updated[activeIndex] = { ...updated[activeIndex], status: targetStatus };
        needsStatusUpdate = true;
      }
      
      let newIndex = updated.length - 1;
      if (!isOverColumn) {
        newIndex = updated.findIndex(p => p.id === over.id);
      } else {
        const columnProjects = updated.filter(p => p.status === targetStatus);
        if (columnProjects.length > 0) {
          newIndex = updated.findIndex(p => p.id === columnProjects[columnProjects.length - 1].id);
        }
      }
      
      if (activeIndex === newIndex && !needsStatusUpdate) {
        return;
      }
      
      if (activeIndex !== newIndex) {
        updated = arrayMove(updated, activeIndex, newIndex);
      }

      const reordered = updated.map((p, i) => ({ ...p, order: i }));
      
      setProjects(reordered);

      if (needsStatusUpdate) {
        updateProject(activeProject.id, { status: targetStatus });
      }
      
      const projectIds = reordered.map(p => p.id);
      if (reorderProjects) reorderProjects(projectIds);
    }
  };

  const renderProjectDetail = () => {
    const detailProject = projects.find(p => p.id === detailProjectId);
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
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full pt-6 relative text-[#333]">
        <div className="flex items-center justify-between w-full mb-8 text-xs font-semibold text-gray-400 relative z-[90]">
          <div className="flex flex-col items-start gap-1">
            <span className="text-[9px] uppercase tracking-widest text-gray-400 pl-1">Objective</span>
            <select
              value={detailProject.objectiveId || ''}
              disabled={isSub}
              onChange={(e) => {
                setProjects(prev => prev.map(p => p.id === detailProject.id ? { ...p, objectiveId: e.target.value || null } : p));
                updateProject(detailProject.id, { objectiveId: e.target.value || null });
              }}
              className="bg-transparent border-none focus:outline-none text-gray-800 text-[13px] w-32 truncate"
            >
              <option value="">None</option>
              {objectives.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
            </select>
          </div>
          
          <div className="flex gap-2 items-center shrink-0">
            <div className="flex gap-1 items-center hover:bg-gray-100 px-2 py-1.5 rounded transition-colors shrink-0">
              <select
                value={detailProject.status}
                onChange={(e) => {
                  setProjects(prev => prev.map(p => p.id === detailProject.id ? { ...p, status: e.target.value } : p));
                  updateProject(detailProject.id, { status: e.target.value });
                }}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-gray-600 text-[13px]"
              >
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col items-start leading-none gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors -mt-1 shrink-0">
              <span className="text-[9px] uppercase tracking-widest text-gray-400">Start</span>
              <input
                type="date"
                value={detailProject.startDate || ''}
                onChange={(e) => {
                  setProjects(prev => prev.map(p => p.id === detailProject.id ? { ...p, startDate: e.target.value } : p));
                  updateProject(detailProject.id, { startDate: e.target.value || null });
                }}
                className="bg-transparent border-none focus:outline-none text-gray-800 w-[105px] text-[13px] cursor-pointer"
              />
            </div>
            
            <div className="flex flex-col items-start leading-none gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors -mt-1 shrink-0">
              <span className="text-[9px] uppercase tracking-widest text-gray-400">End</span>
              <input
                type="date"
                value={detailProject.endDate || ''}
                onChange={(e) => {
                  setProjects(prev => prev.map(p => p.id === detailProject.id ? { ...p, endDate: e.target.value } : p));
                  updateProject(detailProject.id, { endDate: e.target.value || null });
                }}
                className="bg-transparent border-none focus:outline-none text-gray-800 w-[105px] text-[13px] cursor-pointer"
              />
            </div>

            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors text-lg ${isFocusMode ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100'}`}
              title="Focus Mode"
            >
              ⤢
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        {(detailProjectObjective || detailProjectParent) && (
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mt-2 mb-[-1.5rem] px-1">
            {detailProjectObjective && (
              <>
                <span 
                  className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
                  onClick={() => {
                    setDetailProjectId(null);
                    setDetailObjectiveId(detailProjectObjective.id);
                  }}
                >
                  🎯 {detailProjectObjective.title}
                </span>
                {detailProjectParent && <span className="text-gray-300">/</span>}
              </>
            )}
            {detailProjectParent && (
              <>
                <span 
                  className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
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
            className="bg-transparent text-4xl font-bold focus:outline-none flex-1 min-w-0 text-gray-800"
            placeholder="Project Title"
          />
          
          <div className="flex items-center gap-3 ml-4 shrink-0">
            <div className="flex flex-col items-end gap-1 text-sm font-semibold text-gray-500">
              <span>{progressStr}</span>
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                 <div className="h-full bg-green-500 transition-all" style={{width: `${progressPercent}%`}} />
              </div>
            </div>
            <button
              onClick={() => handleDeleteProject(detailProject.id)}
              className="w-8 h-8 rounded-md flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete Project"
            >
              🗑️
            </button>
          </div>
        </div>
        
        <div className="mb-8">
           { (isParent || (!isParent && !isSub && liveTasks.length === 0)) && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-600 mb-2">Subprojects</h3>
                <div className="flex flex-col gap-1.5">
                  {liveSubprojects.map(sub => (
                    <div key={sub.id} className="group flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 transition-colors">
                      {/* Drag handle */}
                      <span className="cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 flex-shrink-0 select-none text-lg leading-none">⠿</span>

                      {/* Title — clickable to drill in */}
                      <span
                        className="flex-1 font-medium text-[14px] text-gray-800 hover:text-gray-600 cursor-pointer"
                        onClick={() => setDetailProjectId(sub.id)}
                      >
                        {sub.title}
                      </span>

                      {/* Status badge */}
                      <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0">
                        {sub.status}
                      </span>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteProject(sub.id)}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
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
                    className="mt-2 text-sm font-semibold text-gray-400 hover:text-gray-800 hover:border-gray-400 border-2 border-dashed border-gray-200 rounded-lg p-2 text-center transition-colors"
                  >
                    + Add Subproject
                  </button>
                </div>
              </div>
           )}
           
           { (isSub || (!isParent && !isSub && liveSubprojects.length === 0)) && (
              <div>
                <h3 className="font-bold text-gray-600 mb-2">Tasks</h3>
                <div className="flex flex-col gap-1.5">
                  {liveTasks.map(task => {
                    const allSubsDone = task.subtasks?.length > 0 && task.subtasks.every(s => s.isCompleted);
                    return (
                      <div key={task.id} className="group flex items-center gap-2 p-2.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-gray-300 transition-colors">
                        {/* Drag handle */}
                        <span className="cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 flex-shrink-0 select-none text-lg leading-none">⠿</span>

                        {/* Checkbox */}
                        <button
                          onClick={async () => {
                            const newVal = !task.isCompleted;
                            // Cascade to subtasks
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
                            task.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {task.isCompleted && <span className="text-[10px] font-bold">✓</span>}
                        </button>

                        {/* Task title — clickable */}
                        <span
                          className={`flex-1 font-medium text-[14px] cursor-pointer ${
                            task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 hover:text-gray-600'
                          }`}
                          onClick={() => onOpenTask && onOpenTask(task.id)}
                        >
                          {task.title}
                        </span>

                        {/* Subtask count badge */}
                        {task.subtasks?.length > 0 && (
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                          </span>
                        )}

                        {/* Delete button */}
                        <button
                          onClick={() => {
                            if (deleteTask) deleteTask(task.id);
                            if (setTasks) setTasks(prev => prev.filter(t => t.id !== task.id));
                          }}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
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
                    className="mt-2 text-sm font-semibold text-gray-400 hover:text-gray-800 hover:border-gray-400 border-2 border-dashed border-gray-200 rounded-lg p-2 text-center transition-colors"
                  >
                    + Add Task
                  </button>
                </div>
              </div>
           )}
        </div>
        
        <div className="flex-1 min-h-0 flex flex-col mt-auto border-t border-gray-100 pt-6">
          <h3 className="font-bold text-gray-600 mb-2">Description</h3>
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

  const renderObjectiveDetail = () => {
    const detailObjective = objectives.find(o => o.id === detailObjectiveId);
    if (!detailObjective) return null;
    
    const liveProjects = projects.filter(p => p.objectiveId === detailObjective.id);
    const total = liveProjects.length;
    const completed = liveProjects.filter(s => s.status === 'COMPLETED').length;
    const progressStr = `${completed} / ${total} Projects Completed`;
    const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return (
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full pt-6 relative text-[#333]">
        {/* Top bar: focus + delete */}
        <div className="flex items-center justify-end gap-2 w-full mb-8 text-xs font-semibold text-gray-400 relative z-[90]">
          <button
            onClick={() => {
              handleDeleteObjective(detailObjective.id);
              setDetailObjectiveId(null);
            }}
            className="w-8 h-8 rounded-md flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete Objective"
          >
            🗑️
          </button>
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors text-lg ${isFocusMode ? 'bg-gray-200 text-gray-800' : 'text-gray-400 hover:bg-gray-100'}`}
            title="Focus Mode"
          >
            ⤢
          </button>
        </div>

        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-4 flex-1 min-w-0">
             <span className="text-4xl">🎯</span>
             <input
               type="text"
               value={detailObjective.title}
               onChange={(e) => setObjectives(prev => prev.map(o => o.id === detailObjective.id ? { ...o, title: e.target.value } : o))}
               onBlur={(e) => updateObjective && updateObjective(detailObjective.id, { title: e.target.value })}
               className="bg-transparent text-4xl font-bold focus:outline-none flex-1 min-w-0 text-gray-800"
               placeholder="Objective Title"
             />
          </div>
          
          <div className="flex flex-col items-end gap-1 ml-4 text-sm font-semibold text-gray-500 shrink-0">
            <span>{progressStr}</span>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
               <div className="h-full bg-green-500 transition-all" style={{width: `${progressPercent}%`}} />
            </div>
          </div>
        </div>
        
        <div className="mb-8">
            <h3 className="font-bold text-gray-600 mb-2">Projects</h3>
            <div className="flex flex-col gap-2">
              {liveProjects.map(proj => (
                <div key={proj.id} className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm flex justify-between items-center hover:border-gray-300 cursor-pointer" onClick={() => { setDetailObjectiveId(null); setDetailProjectId(proj.id); }}>
                  <span className="font-medium text-gray-800">{proj.title}</span>
                  <span className="text-xs text-gray-400 font-bold">{proj.status}</span>
                </div>
              ))}
              <button 
                onClick={async () => {
                  const title = prompt("New project title:");
                  if (title) {
                    const newP = await createProject({ title, status: 'BACKLOG', objectiveId: detailObjective.id, order: liveProjects.length });
                    setProjects(prev => [...prev, newP]);
                  }
                }}
                className="mt-2 text-sm font-semibold text-gray-400 hover:text-gray-800 hover:border-gray-400 border-2 border-dashed border-gray-200 rounded-lg p-2 text-center transition-colors"
              >
                + Add Project
              </button>
            </div>
        </div>
        
        <div className="flex-1 min-h-0 flex flex-col mt-auto border-t border-gray-100 pt-6">
          <h3 className="font-bold text-gray-600 mb-2">Description</h3>
          <TaskNotes
            initialNote={detailObjective.description}
            onSave={(note) => {
              setObjectives(prev => prev.map(o => o.id === detailObjective.id ? { ...o, description: note } : o));
              updateObjective && updateObjective(detailObjective.id, { description: note });
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-4 overflow-hidden h-full">

          <div className="flex-1 min-w-[220px] bg-[rgba(255,255,255,0.02)] border border-white/5 rounded-2xl flex flex-col overflow-hidden p-2">
            <div className="px-3 py-3 flex items-center justify-between font-semibold text-white/90">
              <div className="text-[15px] flex items-center gap-2">🎯 Objectives</div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-6">

              <div className="flex flex-col gap-2">
                {objectives.map(obj => (
                  <ObjectiveCard
                    key={obj.id}
                    objective={obj}
                    projects={projects.filter(p => p.objectiveId === obj.id)}
                    onDelete={handleDeleteObjective}
                    onOpenDetail={setDetailObjectiveId}
                  />
                ))}

                {!isAddingObjective ? (
                  <button
                    onClick={() => setIsAddingObjective(true)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-transparent hover:bg-white/5 text-[13px] text-white/50 hover:text-white/80 transition-colors flex items-center gap-2 mt-1"
                  >
                    <span className="text-lg leading-none">+</span> Add objective
                  </button>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newObjectiveTitle.trim()) {
                        setIsAddingObjective(false);
                        return;
                      }
                      const newO = await createObjective({ title: newObjectiveTitle });
                      setObjectives(prev => [...prev, newO]);
                      setNewObjectiveTitle('');
                      setIsAddingObjective(false);
                    }}
                    className="flex gap-2 mt-1"
                  >
                    <input
                      autoFocus
                      type="text"
                      placeholder="Objective title..."
                      value={newObjectiveTitle}
                      onChange={e => setNewObjectiveTitle(e.target.value)}
                      onBlur={() => {
                        if (!newObjectiveTitle.trim()) setIsAddingObjective(false);
                      }}
                      className="flex-1 bg-[#2d2d2d] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30"
                    />
                  </form>
                )}
              </div>

            </div>
          </div>

          {STATUSES.map(status => {
            const columnProjects = projects.filter(p => p.status === status).sort((a,b) => (a.order || 0) - (b.order || 0));
            return (
              <SortableColumn
                key={status}
                status={status}
                title={STATUS_LABELS[status]}
                projects={columnProjects}
                allProjects={projects}
                allTasks={tasks}
                onDeleteProject={handleDeleteProject}
                onOpenDetail={setDetailProjectId}
                addUI={
                  status === 'BACKLOG' ? (
                    <button
                      onClick={() => {
                        const actualObjectiveId = (objectiveFilter === 'all' || objectiveFilter === 'unassigned') ? null : objectiveFilter;
                        setProjectCreatorConfig({ status: 'BACKLOG', objectiveId: actualObjectiveId });
                        setShowProjectCreator(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg border border-transparent hover:bg-white/5 text-[13px] text-white/50 hover:text-white/80 transition-colors flex items-center gap-2 mb-2"
                    >
                      <span className="text-lg leading-none">+</span> Add Project
                    </button>
                  ) : null
                }
              />
            );
          })}

        </div>
        <DragOverlay dropAnimation={defaultDropAnimationSideEffects({ sideEffects: ['opacity'] })}>
          {activeProject ? <SortableProjectCard project={activeProject} allProjects={projects} allTasks={tasks} onOpenDetail={() => {}} onDelete={() => {}} /> : null}
        </DragOverlay>
      </DndContext>

      {/* PROJECT DETAIL OVERLAY */}
      {detailProjectId && !isFocusMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onPointerDown={() => setDetailProjectId(null)}>
          <div className="bg-[#fcfcfc] border border-gray-200 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative" onPointerDown={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-full bg-[#fcfcfc] flex">
              <div className="flex-1 p-10 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
                {renderProjectDetail()}
              </div>
              <button onClick={() => setDetailProjectId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800 text-xl font-bold">✕</button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN FOCUS MODE */}
      {detailProjectId && isFocusMode && (
        <div className="fixed inset-0 z-[200] bg-[#fcfcfc] flex items-start justify-center p-12 overflow-y-auto overflow-x-hidden animate-in zoom-in-95 duration-200 custom-scrollbar">
          {renderProjectDetail()}
        </div>
      )}

      {/* OBJECTIVE DETAIL OVERLAY */}
      {detailObjectiveId && !isFocusMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onPointerDown={() => setDetailObjectiveId(null)}>
          <div className="bg-[#fcfcfc] border border-gray-200 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative" onPointerDown={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-full bg-[#fcfcfc] flex">
              <div className="flex-1 p-10 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
                {renderObjectiveDetail()}
              </div>
              <button onClick={() => setDetailObjectiveId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800 text-xl font-bold">✕</button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN FOCUS MODE OBJECTIVE */}
      {detailObjectiveId && isFocusMode && (
        <div className="fixed inset-0 z-[200] bg-[#fcfcfc] flex items-start justify-center p-12 overflow-y-auto overflow-x-hidden animate-in zoom-in-95 duration-200 custom-scrollbar">
          {renderObjectiveDetail()}
        </div>
      )}

      {/* PROJECT CREATOR MODAL */}
      {showProjectCreator && (
        <ProjectCreatorModal
          config={projectCreatorConfig}
          objectives={objectives}
          onClose={() => { setShowProjectCreator(false); setProjectCreatorConfig(null); }}
          onCreate={async (data) => {
            const newP = await createProject({ ...data, order: projects.length });
            setProjects(prev => [...prev, newP]);
          }}
        />
      )}
    </>
  );
}
