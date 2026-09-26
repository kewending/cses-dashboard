"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { formatActualTime } from '@/lib/utils';
import KanbanColumn from './KanbanColumn';
import { useRouter } from 'next/navigation';

export default function ShutdownView({
  dateStr,
  tasks,
  sessions,
  onAddTaskClick,
  activeTimer,
  onToggleTimer,
  onOpenDetail,
  onToggleComplete,
  onToggleSubtaskComplete,
  onDeleteTask
}) {
  const shutdownTasks = tasks.filter(t => t.startDate === dateStr);
  const router = useRouter();

  const formatHrsMins = (secs) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const totalActualSeconds = shutdownTasks.reduce((acc, t) => {
    let tSec = t.actualDurationSeconds || 0;
    if (t.subtasks) {
      tSec += t.subtasks.reduce((sAcc, sub) => sAcc + (sub.actualDurationSeconds || 0), 0);
    }
    return acc + tSec;
  }, 0);

  const totalPlannedMinutes = shutdownTasks.reduce((acc, t) => acc + (t.plannedDurationMinutes || 0), 0);

  // Group by tag for pie chart
  const tagDataMap = {};
  shutdownTasks.forEach(t => {
    let tSec = t.actualDurationSeconds || 0;
    if (t.subtasks) {
      tSec += t.subtasks.reduce((sAcc, sub) => sAcc + (sub.actualDurationSeconds || 0), 0);
    }
    if (tSec > 0) {
      const tag = t.tag || 'untagged';
      tagDataMap[tag] = (tagDataMap[tag] || 0) + tSec;
    }
  });

  const pieData = Object.keys(tagDataMap).map(tag => ({
    name: tag,
    value: tagDataMap[tag]
  }));

  const COLORS = ['#f39c12', '#3498db', '#e74c3c', '#9b59b6', '#2ecc71', '#1abc9c', '#34495e'];

  const workedOnTasks = shutdownTasks.filter(t => {
    let tSec = t.actualDurationSeconds || 0;
    let anySubtaskCompleted = false;
    if (t.subtasks) {
      tSec += t.subtasks.reduce((sAcc, sub) => sAcc + (sub.actualDurationSeconds || 0), 0);
      anySubtaskCompleted = t.subtasks.some(s => s.isCompleted);
    }
    return tSec > 0 || t.isCompleted || anySubtaskCompleted;
  });

  const missedTasks = shutdownTasks.filter(t => {
    let tSec = t.actualDurationSeconds || 0;
    let anySubtaskCompleted = false;
    if (t.subtasks) {
      tSec += t.subtasks.reduce((sAcc, sub) => sAcc + (sub.actualDurationSeconds || 0), 0);
      anySubtaskCompleted = t.subtasks.some(s => s.isCompleted);
    }
    return tSec === 0 && !t.isCompleted && !anySubtaskCompleted;
  });

  // Calculate bar progress
  const sixHoursSecs = 6 * 3600;
  const eightHoursSecs = 8 * 3600;
  const maxScale = Math.max(eightHoursSecs + 3600, totalActualSeconds, totalPlannedMinutes * 60);
  const actualPercent = (totalActualSeconds / maxScale) * 100;
  const plannedPercent = ((totalPlannedMinutes * 60) / maxScale) * 100;
  const sixHrPercent = (sixHoursSecs / maxScale) * 100;
  const eightHrPercent = (eightHoursSecs / maxScale) * 100;

  return (
    <div className="flex-1 flex gap-4 min-h-0">
      {/* Date In Review Panel */}
      <div className="w-[350px] flex-shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar p-2">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-1">Date in review</h2>
          <p className="text-sm text-[var(--color-text-muted)]">How you spent your time on {dateStr} in total</p>
        </div>

        <div className="bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col gap-8">
          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-6">Total time</h3>

            <div className="relative mt-8 mb-12">
              {/* Tooltip Actual */}
              <div
                className="absolute -top-8 -translate-x-1/2 bg-green-500 text-[var(--color-text-main)] text-xs font-bold py-1 px-2 rounded whitespace-nowrap"
                style={{ left: `${Math.min(100, actualPercent)}%` }}
              >
                {formatHrsMins(totalActualSeconds)}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-green-500"></div>
              </div>

              {/* Progress Bar Background */}
              <div className="h-1.5 w-full bg-[var(--color-bg-panel-hover)] rounded-full relative">
                {/* 6hr marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-bg-panel-hover)]" style={{ left: `${sixHrPercent}%` }}>
                  <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">6 hr</span>
                </div>
                {/* 8hr marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-bg-panel-hover)]" style={{ left: `${eightHrPercent}%` }}>
                  <span className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] text-[var(--color-text-muted)] whitespace-nowrap">8 hr</span>
                </div>

                {/* Actual Bar */}
                <div
                  className="absolute top-0 left-0 bottom-0 bg-green-500 rounded-full"
                  style={{ width: `${Math.min(100, actualPercent)}%` }}
                ></div>
              </div>

              {/* Tooltip Planned */}
              <div
                className="absolute top-6 -translate-x-1/2 bg-[var(--color-bg-panel)] text-[var(--color-text-main)] text-[10px] font-bold py-1 px-2 rounded flex flex-col items-center whitespace-nowrap"
                style={{ left: `${Math.min(100, plannedPercent)}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-500"></div>
                <span>{formatHrsMins(totalPlannedMinutes * 60)}</span>
                <span>planned</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] mb-4">How you spent your time</h3>
            <div className="h-[200px] w-full relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value) => formatHrsMins(value)}
                      contentStyle={{ backgroundColor: '#222', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
                  No tracked time
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                  <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  {entry.name}
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={() => router.push(`/diary/${dateStr}?from=shutdown`)}
            className="w-full mt-4 py-3 bg-[var(--color-accent)]/10 hover:bg-[var(--color-accent)] text-[var(--color-accent)] hover:text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            📔 Begin Daily Reflection
          </button>
        </div>
      </div>

      {/* Worked On Panel */}
      <div className="w-[280px] flex-shrink-0 flex flex-col gap-4">
        <KanbanColumn
          id="worked_on"
          title="Worked on"
          tasks={workedOnTasks}
          sessions={sessions}
          onAddTaskClick={onAddTaskClick}
          activeTimer={activeTimer}
          onToggleTimer={onToggleTimer}
          onOpenDetail={onOpenDetail}
          onToggleComplete={onToggleComplete}
          onToggleSubtaskComplete={onToggleSubtaskComplete}
          onDeleteTask={onDeleteTask}
          showAdd={false}
        />
      </div>

      {/* Didn't Get To Panel */}
      <div className="w-[280px] flex-shrink-0 flex flex-col gap-4">
        <KanbanColumn
          id="didnt_get_to"
          title="Didn't get to"
          tasks={missedTasks}
          sessions={sessions}
          onAddTaskClick={onAddTaskClick}
          activeTimer={activeTimer}
          onToggleTimer={onToggleTimer}
          onOpenDetail={onOpenDetail}
          onToggleComplete={onToggleComplete}
          onToggleSubtaskComplete={onToggleSubtaskComplete}
          onDeleteTask={onDeleteTask}
          showAdd={false}
        />
      </div>
    </div>
  );
}
