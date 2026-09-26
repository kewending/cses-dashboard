import React from 'react';

export default function HabitHeatmap({ habits }) {
  // Generate last 30 dates (YYYY-MM-DD)
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    // Offset to get correct local date string
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - (offset * 60 * 1000));
    local.setDate(local.getDate() - i);
    dates.push(local.toISOString().split('T')[0]);
  }

  const getHeatmapColor = (habit, log) => {
    if (!log) return 'bg-[var(--color-bg-dark)] border border-[var(--color-border)]/50'; // 0
    const net = log.countPositive - log.countNegative;
    if (net === 0) {
      if (log.countPositive > 0) return 'bg-yellow-500/30 border border-yellow-500/50'; // Mixed neutral
      return 'bg-[var(--color-bg-dark)] border border-[var(--color-border)]/50';
    }
    
    if (net > 0) {
       if (net === 1) return 'bg-teal-500/30 border border-teal-500/40';
       if (net === 2) return 'bg-teal-500/60 border border-teal-500/70';
       return 'bg-teal-500 border border-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.5)] text-teal-900 font-bold flex items-center justify-center text-[10px]';
    } else {
       if (net === -1) return 'bg-orange-500/30 border border-orange-500/40';
       if (net === -2) return 'bg-orange-500/60 border border-orange-500/70';
       return 'bg-orange-500 border border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)] text-orange-900 font-bold flex items-center justify-center text-[10px]';
    }
  };

  return (
    <div className="w-full overflow-x-auto custom-scrollbar pb-2">
       <div className="min-w-max flex flex-col gap-3">
          {/* Header Row (Dates) */}
          <div className="flex items-center gap-1.5 mb-2 pl-[130px]">
             {dates.map((date, i) => {
                const dayObj = new Date(date);
                // Only show day number if it's Monday (1) or the first day of the month, or every 5th day, for less clutter
                const showLabel = i % 5 === 0 || i === 29;
                return (
                  <div key={date} className="w-6 flex flex-col items-center">
                     {showLabel && (
                       <span className="text-[10px] text-[var(--color-text-muted)] font-mono mb-1">{date.split('-')[2]}</span>
                     )}
                  </div>
                );
             })}
          </div>

          {/* Habit Rows */}
          {habits.map(habit => (
             <div key={habit.id} className="flex items-center gap-1.5 h-6">
                <div className="w-[120px] text-xs font-semibold text-[var(--color-text-main)] truncate pr-4 text-right" title={habit.title}>
                   {habit.title}
                </div>
                {dates.map(date => {
                   const log = habit.logs?.find(l => l.date === date);
                   const colorClass = getHeatmapColor(habit, log);
                   const isToday = date === dates[29];
                   const net = log ? log.countPositive - log.countNegative : 0;
                   return (
                      <div 
                         key={date} 
                         title={`${date}: +${log?.countPositive || 0} / -${log?.countNegative || 0}`}
                         className={`w-6 h-6 rounded ${colorClass} ${isToday ? 'ring-2 ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg-panel)]' : ''} transition-all hover:scale-110`}
                      >
                        {(net > 2 || net < -2) ? Math.abs(net) : ''}
                      </div>
                   );
                })}
             </div>
          ))}
       </div>
    </div>
  );
}
