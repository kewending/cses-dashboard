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
import ShutdownView from '@/components/ShutdownView';
import KanbanColumn from '@/components/KanbanColumn';
import ProjectsView from '@/components/ProjectsView';
import { HOURS, DAYS_OF_WEEK, formatRelativeDate, formatAbsoluteDate, getProjectionDays, formatActualTime, formatMins, formatSessionTime, isNextFewDays } from '@/lib/utils';

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
    <div ref={setNodeRef} style={style} className={`flex items-center py-2 group ${isDragging ? 'bg-white rounded-lg shadow-xl' : ''}`}>
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 mr-1 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity -ml-7 w-6 flex items-center justify-center">
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
        className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors mr-3 ${sub.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-green-400'}`}
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
            if (t.id !== detailTaskId) return t;
            return { ...t, subtasks: t.subtasks.map(s => s.id === sub.id ? { ...s, plannedDurationMinutes: parseInt(e.target.value) || 0 } : s) };
          }))}
          onBlur={(e) => updateTask(sub.id, { plannedDurationMinutes: parseInt(e.target.value) || 0 })}
          className="font-mono text-sm text-gray-400 w-12 text-right bg-transparent focus:outline-none hover:bg-gray-100 rounded"
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
    await toggleTaskComplete(taskId, newIsCompleted);
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          isCompleted: newIsCompleted,
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


  // ---- RENDERERS ----

  const renderDetailContent = () => {
    if (!detailTask) return null;
    const totalActualSeconds = detailTask.actualDurationSeconds + (detailTask.subtasks?.reduce((acc, sub) => acc + sub.actualDurationSeconds, 0) || 0);
    const detailSession = sessions.find(s => s.taskId === detailTask.id);
    const isMainTimerActive = (activeTimer?.type === 'task' && activeTimer?.id === detailTask.id) || (activeTimer?.type === 'subtask' && detailTask.subtasks?.some(s => s.id === activeTimer.id));
    
    const detailTaskProject = detailTask.projectId ? projects.find(p => p.id === detailTask.projectId) : null;
    const detailTaskObjective = detailTaskProject?.objectiveId ? objectives.find(o => o.id === detailTaskProject.objectiveId) : null;

    return (
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full pt-6 relative text-[#333]">
        {/* Unified Top Header Bar */}
        <div className="flex items-center justify-between w-full mb-8 text-xs font-semibold text-gray-400 relative z-[90]">
          
          {/* Left Side: Tag / Channel */}
          <div className="flex flex-col items-start gap-1">
            <span className="text-[9px] uppercase tracking-widest text-gray-400 pl-1">Channel</span>
            <div className="flex items-center gap-2 hover:bg-gray-100 px-1 py-0.5 rounded transition-colors -ml-1">
              <span className="text-[#f2a950] font-bold text-lg leading-none">#</span>
              <input
                type="text"
                value={detailTask.tag || ''}
                onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, tag: e.target.value } : t))}
                onBlur={(e) => updateTask(detailTask.id, { tag: e.target.value })}
                placeholder="work"
                className="bg-transparent border-none focus:outline-none text-gray-800 text-[13px] w-24"
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
            <div className="flex gap-1 items-center hover:bg-gray-100 px-2 py-1.5 rounded transition-colors shrink-0">
              <span className="text-gray-400">🚩</span>
              <select
                value={detailTask.priority}
                onChange={(e) => {
                  setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, priority: e.target.value } : t));
                  updateTask(detailTask.id, { priority: e.target.value });
                }}
                className="bg-transparent border-none focus:outline-none cursor-pointer text-gray-600 text-[13px]"
              >
                <option>None</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            
            <div className="flex flex-col items-start leading-none gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors -mt-1 shrink-0">
              <span className="text-[9px] uppercase tracking-widest text-gray-400">Start</span>
              <input
                type="date"
                value={detailTask.startDate}
                onChange={(e) => {
                  setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, startDate: e.target.value } : t));
                  updateTask(detailTask.id, { startDate: e.target.value || null });
                }}
                className="bg-transparent border-none focus:outline-none text-gray-800 w-[105px] text-[13px] cursor-pointer"
              />
            </div>

            <div className="flex flex-col items-start leading-none gap-1 hover:bg-gray-100 px-2 py-1 rounded transition-colors -mt-1 shrink-0">
              <span className="text-[9px] uppercase tracking-widest text-gray-400">Due</span>
              <input
                type="date"
                value={detailTask.dueDate}
                onChange={(e) => {
                  setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, dueDate: e.target.value } : t));
                  updateTask(detailTask.id, { dueDate: e.target.value || null });
                }}
                className="bg-transparent border-none focus:outline-none text-gray-800 w-[105px] text-[13px] cursor-pointer"
              />
            </div>
            
            <button onClick={() => handleAddSubtask(detailTask.id)} className="flex items-center gap-1.5 hover:bg-gray-100 px-2 py-1.5 rounded transition-colors text-gray-500 font-medium text-[13px]">
              <span className="text-lg leading-none mb-0.5 text-gray-400">+</span> Subtasks
            </button>

            <MoreActionsDropdown onDelete={() => handleDeleteTask(detailTask.id)} />

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
        {(detailTaskObjective || detailTaskProject) && (
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mt-2 mb-[-1.5rem] px-1">
            {detailTaskObjective && (
              <>
                <span 
                  className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
                  onClick={() => {
                    setDetailTaskId(null);
                    setDetailObjectiveId(detailTaskObjective.id);
                    setViewMode('projects');
                  }}
                >
                  🎯 {detailTaskObjective.title}
                </span>
                <span className="text-gray-300">/</span>
              </>
            )}
            {detailTaskProject && (
              <>
                <span 
                  className="text-gray-400 cursor-pointer hover:text-gray-600 transition-colors"
                  onClick={() => {
                    setDetailTaskId(null);
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
              className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${detailTask.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent hover:border-green-400'}`}
            >
              <span className="text-sm font-bold">✓</span>
            </button>
            <input
              type="text"
              value={detailTask.title}
              onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, title: e.target.value } : t))}
              onBlur={(e) => updateTask(detailTask.id, { title: e.target.value })}
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
                  onChange={(e) => setTasks(prev => prev.map(t => t.id === detailTask.id ? { ...t, plannedDurationMinutes: parseInt(e.target.value) || 0 } : t))}
                  onBlur={(e) => updateTask(detailTask.id, { plannedDurationMinutes: parseInt(e.target.value) || 0 })}
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
            className="flex items-center gap-3 text-gray-400 hover:text-gray-600 transition-colors mt-2 py-1 w-max"
          >
            <span className="w-4 h-4 flex items-center justify-center border border-gray-300 rounded-full text-[10px]">+</span>
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
  };

  const projectionDays = getProjectionDays(baseDate);
  const allTags = [...new Set(tasks.map(t => t.tag).filter(Boolean))];
  const filteredTasks = tasks.filter(t => (taskFilter === 'all' || t.tag === taskFilter) && t.showInKanban !== false);

  return (
    <div className="absolute inset-0 flex flex-col p-8 pt-6 overflow-hidden bg-[var(--color-bg-dark)]">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          {viewMode !== 'projects' && (
            <DateSelectorDropdown baseDate={baseDate} setBaseDate={setBaseDate} />
          )}
          
          {viewMode === 'projects' ? (
            <div className="relative z-50 group">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-dark)] text-white/90 rounded border border-white/10 hover:bg-white/10 text-sm font-semibold shadow-sm transition-colors">
                <span className="text-[12px]">≡</span> Filter
              </button>
              <div className="absolute top-full mt-2 left-0 w-64 bg-[#232323] rounded-lg shadow-2xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-2">
                <div className="px-4 pb-2 text-xs text-white/40 font-semibold border-b border-white/10 mb-2 mt-1">
                  Filter by objective:
                </div>
                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                  <button onClick={() => setObjectiveFilter('all')} className="w-full text-left px-4 py-1.5 hover:bg-white/5 text-sm text-white/80 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="text-green-500 text-lg">🎯</span> all
                    </span>
                    {objectiveFilter === 'all' && <span className="text-white/50 text-xs">✓</span>}
                  </button>
                  {objectives.map(obj => (
                    <button key={obj.id} onClick={() => setObjectiveFilter(obj.id)} className="w-full text-left px-4 py-1.5 hover:bg-white/5 text-sm text-white/80 flex items-center justify-between">
                      <span className="flex items-center gap-2 pl-4">
                        <span className="text-[#f2a950] text-lg">🎯</span> {obj.title}
                      </span>
                      {objectiveFilter === obj.id && <span className="text-white/50 text-xs">✓</span>}
                    </button>
                  ))}
                  <button onClick={() => setObjectiveFilter('unassigned')} className="w-full text-left px-4 py-1.5 hover:bg-white/5 text-sm text-white/80 flex items-center justify-between">
                    <span className="flex items-center gap-2 pl-4">
                      <span className="text-gray-500 text-lg">📥</span> unassigned
                    </span>
                    {objectiveFilter === 'unassigned' && <span className="text-white/50 text-xs">✓</span>}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <FilterDropdown taskFilter={taskFilter} setTaskFilter={setTaskFilter} allTags={allTags} />
          )}
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
          <button
            onClick={() => setViewMode('projects')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${viewMode === 'projects' ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-text-muted)] hover:text-white'}`}
          >
            Projects
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

          {viewMode === 'projects' ? (
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
