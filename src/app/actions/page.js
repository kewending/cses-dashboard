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
import { getTasks, getSessions, getObjectives, createTask, updateTask, toggleTaskComplete, createSession, updateSession, deleteSession, createSubtask, deleteTask, reorderSubtasks, getProjects, createProject, updateProject, deleteProject, createObjective, deleteObjective, reorderProjects, updateObjective } from './serverActions';

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



import DateSelectorDropdown from '@/components/DateSelectorDropdown';
import FilterDropdown from '@/components/FilterDropdown';
import MoreActionsDropdown from '@/components/MoreActionsDropdown';
import TaskNotes from '@/components/TaskNotes';
import SortableTask from '@/components/SortableTask';
import DraggableSession from '@/components/DraggableSession';
import CurrentTimeLine from '@/components/CurrentTimeLine';
import CalendarGrid from '@/components/CalendarGrid';
import TaskCreatorModal from '@/components/TaskCreatorModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import ObjectiveDetailModal from '@/components/ObjectiveDetailModal';
import ShutdownView from '@/components/ShutdownView';
import KanbanColumn from '@/components/KanbanColumn';
import ProjectsView from '@/components/ProjectsView';
import GanttView from '@/components/GanttView';
import { HOURS, DAYS_OF_WEEK, formatRelativeDate, formatAbsoluteDate, getProjectionDays, formatActualTime, formatMins, formatSessionTime, isNextFewDays } from '@/lib/utils';



export default function ActionEngine() {
  const [tasks, setTasks] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    async function loadData() {
      const [t, s, o, p] = await Promise.all([getTasks(), getSessions(), getObjectives(), getProjects()]);
      setTasks(t);
      setSessions(s);
      setObjectives(o);
      setProjects(p);
    }
    loadData();
  }, []);

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
  const [objectiveFilter, setObjectiveFilter] = useState('all');

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
    d.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d - b) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
  };

  // Modal State
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [detailProjectId, setDetailProjectId] = useState(null);
  const [detailObjectiveId, setDetailObjectiveId] = useState(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusType, setFocusType] = useState('focus');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // --- TIME TRACKER ENGINE ---
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    if (!activeTimer) return;
    
    lastTickRef.current = Date.now();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastTickRef.current) / 1000);
      
      if (elapsedSeconds > 0) {
        lastTickRef.current += elapsedSeconds * 1000;
        
        setTasks(prev => prev.map(t => {
          if (activeTimer.type === 'task' && activeTimer.id === t.id) {
            return { ...t, actualDurationSeconds: t.actualDurationSeconds + elapsedSeconds };
          }
          if (activeTimer.type === 'subtask' && t.subtasks?.length) {
            if (t.subtasks.some(s => s.id === activeTimer.id)) {
              return {
                ...t,
                subtasks: t.subtasks.map(s => s.id === activeTimer.id ? { ...s, actualDurationSeconds: s.actualDurationSeconds + elapsedSeconds } : s)
              };
            }
          }
          return t;
        }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const toggleTimer = async (id, type) => {
    if (activeTimer?.id === id) {
      const task = tasks.find(t => t.id === id || t.subtasks?.some(s => s.id === id));
      if (task) {
        if (type === 'task') {
          await updateTask(id, { actualDurationSeconds: task.actualDurationSeconds });
        } else {
          const sub = task.subtasks.find(s => s.id === id);
          if (sub) await updateTask(id, { actualDurationSeconds: sub.actualDurationSeconds });
        }
      }
      setActiveTimer(null);
    }
    else setActiveTimer({ id, type });
  };

  const handleDeleteTask = async (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await deleteTask(taskId);
    if (detailTaskId === taskId) {
      setDetailTaskId(null);
    }
  };

  const handleAddTask = async (task) => {
    const newTask = await createTask(task);
    setTasks(prev => [...prev, newTask]);
    if (taskCreatorConfig?.startMinutes !== undefined) {
      const newSession = await createSession({
        taskId: newTask.id,
        startMinutes: taskCreatorConfig.startMinutes,
        date: taskCreatorConfig.dateStr || baseDate,
      });
      setSessions(prev => [...prev, newSession]);
    }
  };

  const handleToggleComplete = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newIsCompleted = !task.isCompleted;

    // Auto-fill actual time when completing a task that has 0 actual time tracked
    // (preserves real tracked time — only fills when actual is still 0)
    let actualUpdate = {};
    if (newIsCompleted && (task.actualDurationSeconds || 0) === 0 && (task.plannedDurationMinutes || 0) > 0) {
      actualUpdate = { actualDurationSeconds: task.plannedDurationMinutes * 60 };
      updateTask(taskId, actualUpdate); // fire-and-forget DB write
    }

    await toggleTaskComplete(taskId, newIsCompleted);
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          isCompleted: newIsCompleted,
          ...actualUpdate,
          subtasks: t.subtasks ? t.subtasks.map(s => ({ ...s, isCompleted: newIsCompleted })) : []
        };
      }
      return t;
    }));
  };


  const handleToggleSubtaskComplete = async (taskId, subtaskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const subtask = task.subtasks?.find(s => s.id === subtaskId);
    if (!subtask) return;

    await toggleTaskComplete(subtaskId, !subtask.isCompleted);

    const newSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, isCompleted: !s.isCompleted } : s);
    const allSubtasksCompleted = newSubtasks.length > 0 && newSubtasks.every(s => s.isCompleted);
    if (allSubtasksCompleted !== task.isCompleted) {
      toggleTaskComplete(taskId, allSubtasksCompleted); // fire-and-forget
    }

    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      return {
        ...t,
        isCompleted: allSubtasksCompleted,
        subtasks: newSubtasks
      };
    }));
  };

  const handleAddSubtask = async (taskId) => {
    const mainTask = tasks.find(t => t.id === taskId);
    if (!mainTask) return;

    const newSubData = {
      title: '',
      showInKanban: false,
      isCompleted: false,
      plannedDurationMinutes: 15,
      actualDurationSeconds: 0,
      status: mainTask.status,
      tag: mainTask.tag || '',
      priority: mainTask.priority || 'None',
      startDate: mainTask.startDate || null,
      dueDate: mainTask.dueDate || null,
    };
    const newSub = await createSubtask(taskId, newSubData);
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
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
        .sort((a, b) => a.start - b.start);

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
        const session = sessions.find(s => `session-${s.id}` === active.id);
        if (session) {
          const calendarTop = over.rect.top;
          const dropTop = active.rect.current.translated.top;
          const scrollTop = calendarScrollRef.current;

          const offsetPx = dropTop - calendarTop - 16 + scrollTop;
          let exactMins = (offsetPx * (60 / calendarZoom));
          exactMins = Math.round(exactMins / 10) * 10;
          const task = tasks.find(t => t.id === session.taskId);
          const duration = task ? task.plannedDurationMinutes : 60;
          exactMins = resolveOverlap(exactMins, duration, active.id);
          
          setSessions(prev => prev.map(s => s.id === session.id ? { ...s, startMinutes: exactMins } : s));
          updateSession(session.id, { startMinutes: exactMins, date: baseDate }); // fire-and-forget DB sync
        }
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

        const newSessionId = `s-${Date.now()}`;
        setSessions(prev => {
          const filtered = prev.filter(s => s.taskId !== active.id);
          return [...filtered, { id: newSessionId, taskId: active.id, startMinutes: exactMins }];
        });
        updateTask(active.id, { startDate: baseDate }); // fire-and-forget
        createSession({ taskId: active.id, startMinutes: exactMins, date: baseDate }).then(realSession => {
          if (realSession && realSession.id) {
            setSessions(prev => prev.map(s => s.id === newSessionId ? { ...s, id: realSession.id } : s));
          }
        }).catch(err => console.error("Failed to sync session creation", err));
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
        let updatedFields = {};
        if (finalStatus === 'inbox') {
          updatedFields = { status: finalStatus, startDate: null };
        } else if (finalStatus === 'next_few_days') {
          const b = new Date(baseDate);
          b.setDate(b.getDate() + 1);
          updatedFields = { startDate: b.toISOString().split('T')[0], status: finalStatus };
        } else if (finalStatus.toString().startsWith('backlog')) {
          updatedFields = { status: finalStatus, startDate: null };
        } else {
          updatedFields = { startDate: finalStatus, status: '' };
        }
        updateTask(active.id, updatedFields); // async fire and forget
        setTasks(prev => {
          const oldIndex = prev.findIndex(t => t.id === active.id);
          const newIndex = targetTask ? prev.findIndex(t => t.id === over.id) : prev.length;
          let next = [...prev];
          next[oldIndex].status = updatedFields.status !== undefined ? updatedFields.status : next[oldIndex].status;
          next[oldIndex].startDate = updatedFields.startDate === null ? '' : (updatedFields.startDate || next[oldIndex].startDate);
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




  const projectionDays = getProjectionDays(baseDate);
  const allTags = [...new Set(tasks.map(t => t.tag).filter(Boolean))];
  const filteredTasks = tasks.filter(t => (taskFilter === 'all' || t.tag === taskFilter) && t.showInKanban !== false);

  return (
    <div className="absolute inset-0 flex flex-col p-8 pt-6 overflow-hidden bg-[var(--color-bg-dark)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          {viewMode !== 'projects' && viewMode !== 'gantt' && (
            <DateSelectorDropdown baseDate={baseDate} setBaseDate={setBaseDate} />
          )}
          
          {viewMode === 'projects' ? (
            <div className="relative z-50 group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-dark)] text-[var(--color-text-main)] rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-panel-hover)] text-sm font-semibold shadow-sm transition-colors">
                <span className="text-[12px]">≡</span> Filter
              </button>
              <div className="absolute top-full mt-2 left-0 w-64 bg-[#232323] rounded-lg shadow-2xl border border-[var(--color-border)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-2">
                <div className="px-4 pb-2 text-xs text-[var(--color-text-muted)] opacity-70 font-semibold border-b border-[var(--color-border)] mb-2 mt-1">
                  Filter by objective:
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  <button onClick={() => setObjectiveFilter('all')} className="w-full text-left px-4 py-1.5 hover:bg-[var(--color-bg-panel)] text-sm text-[var(--color-text-main)] flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">🎯</span> all
                    </span>
                    {objectiveFilter === 'all' && <span className="text-[var(--color-text-muted)] text-xs">✓</span>}
                  </button>
                  {objectives.map(obj => (
                    <button key={obj.id} onClick={() => setObjectiveFilter(obj.id)} className="w-full text-left px-4 py-1.5 hover:bg-[var(--color-bg-panel)] text-sm text-[var(--color-text-main)] flex items-center justify-between">
                      <span className="flex items-center gap-2 pl-4">
                        <span className="text-[#f2a950] text-lg">🎯</span> {obj.title}
                      </span>
                      {objectiveFilter === obj.id && <span className="text-[var(--color-text-muted)] text-xs">✓</span>}
                    </button>
                  ))}
                  <button onClick={() => setObjectiveFilter('unassigned')} className="w-full text-left px-4 py-1.5 hover:bg-[var(--color-bg-panel)] text-sm text-[var(--color-text-main)] flex items-center justify-between">
                    <span className="flex items-center gap-2 pl-4">
                      <span className="text-[var(--color-text-muted)] text-lg">📥</span> unassigned
                    </span>
                    {objectiveFilter === 'unassigned' && <span className="text-[var(--color-text-muted)] text-xs">✓</span>}
                  </button>
                </div>
              </div>
            </div>
          ) : viewMode === 'gantt' ? null : (
            <FilterDropdown taskFilter={taskFilter} setTaskFilter={setTaskFilter} allTags={allTags} />
          )}
        </div>
        <div className="flex gap-2 bg-[var(--color-bg-dark)] p-1 rounded-full border border-[var(--color-border)]">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'daily' ? 'bg-[var(--color-accent)] text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
          >
            Daily Planning
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'weekly' ? 'bg-[var(--color-accent)] text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
          >
            Multi-Day Projection
          </button>
          <button
            onClick={() => setViewMode('projects')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'projects' ? 'bg-[var(--color-accent)] text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
          >
            Projects
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'gantt' ? 'bg-[var(--color-accent)] text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* Task Creator Modal */}
      {taskCreatorConfig && (
        <TaskCreatorModal
          config={taskCreatorConfig}
          onClose={() => setTaskCreatorConfig(null)}
          onAdd={handleAddTask}
          projects={projects}
        />
      )}

      {/* Main Layout */}
      <DndContext id="action-dnd" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-4 min-h-0 overflow-x-auto pb-4">

          {viewMode === 'gantt' ? (
            <GanttView
              objectives={objectives}
              projects={projects}
              tasks={tasks}
              updateProject={updateProject}
              updateTask={updateTask}
              setProjects={setProjects}
              setTasks={setTasks}
              onOpenTask={setDetailTaskId}
              onOpenProject={(id) => { setDetailProjectId(id); }}
              onOpenObjective={(id) => { setDetailObjectiveId(id); }}
            />
          ) : viewMode === 'projects' ? (
            <ProjectsView 
              projects={projects.filter(p => {
                if (objectiveFilter === 'all') return true;
                if (objectiveFilter === 'unassigned') return !p.objectiveId;
                return p.objectiveId === objectiveFilter;
              })} 
              allProjects={projects}
              objectives={objectives} 
              tasks={tasks}
              setTasks={setTasks}
              setProjects={setProjects}
              setObjectives={setObjectives}
              createProject={createProject}
              updateProject={updateProject}
              deleteProject={deleteProject}
              createObjective={createObjective}
              updateObjective={updateObjective}
              deleteObjective={deleteObjective}
              reorderProjects={reorderProjects}
              objectiveFilter={objectiveFilter}
              onAddTaskClick={setTaskCreatorConfig}
              onOpenTask={setDetailTaskId}
              toggleTaskComplete={toggleTaskComplete}
              deleteTask={deleteTask}
              detailProjectId={detailProjectId}
              setDetailProjectId={setDetailProjectId}
              detailObjectiveId={detailObjectiveId}
              setDetailObjectiveId={setDetailObjectiveId}
            />
          ) : viewMode === 'shutdown' ? (
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
              onDeleteTask={handleDeleteTask}
            />
          ) : (
            <>
              {/* DAILY MODE: INBOX AND NEXT FEW DAYS */}
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
                    onDeleteTask={handleDeleteTask}
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
                    onDeleteTask={handleDeleteTask}
                  />
                </div>
              )}

              {/* DYNAMIC PROJECTION COLUMNS */}
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
                  onDeleteTask={handleDeleteTask}
                />
              ))}

              {/* CALENDAR (ALWAYS VISIBLE IN DAILY/MULTI, RIGHT ALIGNED) */}
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
      <TaskDetailModal
        detailTaskId={detailTaskId}
        isFocusMode={isFocusMode}
        setIsFocusMode={setIsFocusMode}
        tasks={tasks}
        sessions={sessions}
        projects={projects}
        objectives={objectives}
        activeTimer={activeTimer}
        setTasks={setTasks}
        updateTask={updateTask}
        setSessions={setSessions}
        toggleTimer={toggleTimer}
        handleDeleteTask={handleDeleteTask}
        handleToggleComplete={handleToggleComplete}
        handleToggleSubtaskComplete={handleToggleSubtaskComplete}
        handleAddSubtask={handleAddSubtask}
        deleteTask={deleteTask}
        setDetailProjectId={setDetailProjectId}
        setDetailObjectiveId={setDetailObjectiveId}
        setViewMode={setViewMode}
        reorderSubtasks={reorderSubtasks}
        onClose={() => setDetailTaskId(null)}
      />

      {/* PROJECT DETAIL OVERLAY */}
      {detailProjectId && (
        <ProjectDetailModal
          projectId={detailProjectId}
          projects={projects}
          tasks={tasks}
          objectives={objectives}
          setProjects={setProjects}
          updateProject={updateProject}
          setTasks={setTasks}
          updateTask={updateTask}
          toggleTaskComplete={toggleTaskComplete}
          deleteTask={deleteTask}
          handleDeleteProject={(id) => {
            setProjects(prev => prev.filter(p => p.id !== id));
            deleteProject(id);
            setDetailProjectId(null);
          }}
          createProject={createProject}
          onOpenTask={setDetailTaskId}
          onAddTaskClick={() => {
             // Not supported easily without global TaskCreator config
          }}
          setDetailObjectiveId={setDetailObjectiveId}
          setDetailProjectId={setDetailProjectId}
          onClose={() => setDetailProjectId(null)}
        />
      )}

      {/* OBJECTIVE DETAIL OVERLAY */}
      {detailObjectiveId && (
        <ObjectiveDetailModal
          objectiveId={detailObjectiveId}
          objectives={objectives}
          projects={projects}
          setObjectives={setObjectives}
          updateObjective={updateObjective}
          setProjects={setProjects}
          createProject={createProject}
          handleDeleteObjective={(id) => {
            setObjectives(prev => prev.filter(o => o.id !== id));
            setProjects(prev => prev.map(p => p.objectiveId === id ? { ...p, objectiveId: null } : p));
            deleteObjective(id);
            setDetailObjectiveId(null);
          }}
          setDetailProjectId={setDetailProjectId}
          setDetailObjectiveId={setDetailObjectiveId}
          onClose={() => setDetailObjectiveId(null)}
        />
      )}

    </div>
  );
}
