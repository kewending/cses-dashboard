import React, { useState } from 'react';
import { DndContext, closestCenter, DragOverlay, defaultDropAnimationSideEffects, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskNotes from './TaskNotes';
import ProjectCreatorModal from './ProjectCreatorModal';
import { formatActualTime, formatMins } from '@/lib/utils';

/**
 * Aggregates time for a project.
 * - Leaf project (no sub-projects): sums its own direct tasks' time only (main task, not subtasks per spec).
 * - Parent project: sums direct sub-projects' tasks' time (2-level deep only per spec).
 * Returns { actualSeconds, plannedMinutes }
 */
function calcProjectTime(projectId, allProjects, allTasks) {
  const directSubs = allProjects.filter(p => p.parentProjectId === projectId);

  if (directSubs.length > 0) {
    // Parent project: aggregate from each sub-project's direct tasks
    return directSubs.reduce((acc, sub) => {
      const subTasks = allTasks.filter(t => t.projectId === sub.id);
      subTasks.forEach(t => {
        acc.actualSeconds += (t.actualDurationSeconds || 0);
        acc.plannedMinutes += (t.plannedDurationMinutes || 0);
      });
      return acc;
    }, { actualSeconds: 0, plannedMinutes: 0 });
  } else {
    // Leaf project: sum own direct tasks only
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
      className={`bg-[var(--color-bg-panel)] border border-[var(--color-border)] p-4 rounded-xl flex flex-col gap-3 hover:border-[var(--color-border-hover)] transition-colors mb-3 relative group`}
    >
      {project.objective && (
        <div className="absolute -top-2 left-2 z-10 bg-[var(--color-bg-panel)] text-[10px] px-2 py-0.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] shadow-sm">
          🎯 {project.objective.title}
        </div>
      )}
      <div className="flex justify-between items-start gap-2 relative">
        <div className="flex-1 flex items-start cursor-grab active:cursor-grabbing mr-2 pb-1" {...attributes} {...listeners} onClick={() => onOpenDetail(project.id)}>
          <h4 className="text-[var(--color-text-main)] font-medium text-[15px] leading-tight">{project.title}</h4>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
          className="text-[var(--color-text-muted)] opacity-50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
          title="Delete Project"
        >
          🗑️
        </button>
      </div>

      <div className="flex flex-col gap-1 mt-auto">
        <div className="flex justify-between text-[11px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-[var(--color-bg-dark)] h-1.5 rounded-full overflow-hidden">
          <div className="bg-green-500 h-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
          {completedCount} / {totalCount} {progressLabel}
        </div>
      </div>
    </div>
  );
}

function ObjectiveCard({ objective, projects, onDelete, onOpenDetail }) {
  return (
    <div onClick={() => onOpenDetail && onOpenDetail(objective.id)} className="border border-[var(--color-border)] bg-[var(--color-bg-panel)] px-4 py-3 rounded-xl flex justify-between items-center hover:border-[var(--color-border-hover)] transition-colors group cursor-pointer">
      <h3 className="font-bold text-[var(--color-text-main)] text-[14px]">{objective.title}</h3>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[var(--color-text-muted)] font-mono bg-[var(--color-bg-panel)] px-2 py-1 rounded">{projects.length} Proj</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(objective.id); }}
          className="text-[var(--color-text-muted)] opacity-50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
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
    <div className="flex-1 min-w-[200px] bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-2xl flex flex-col overflow-hidden p-2">
      <div className="px-3 py-3 flex items-center justify-between font-semibold text-[var(--color-text-main)]">
        <div className="text-[15px]">{title}</div>
        <div className="text-[11px] font-mono px-2 py-1 rounded bg-[var(--color-bg-panel-hover)] text-[var(--color-text-muted)]">
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

  
  
  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-4 overflow-hidden h-full">

          <div className="flex-1 min-w-[220px] bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-2xl flex flex-col overflow-hidden p-2">
            <div className="px-3 py-3 flex items-center justify-between font-semibold text-[var(--color-text-main)]">
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
                    className="w-full text-left px-3 py-2 rounded-lg border border-transparent hover:bg-[var(--color-bg-panel)] text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]/80 transition-colors flex items-center gap-2 mt-1"
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
                      className="flex-1 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-border-hover)]"
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
                      className="w-full text-left px-3 py-2 rounded-lg border border-transparent hover:bg-[var(--color-bg-panel)] text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]/80 transition-colors flex items-center gap-2 mb-2"
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
