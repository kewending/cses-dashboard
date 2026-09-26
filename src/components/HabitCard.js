export default function HabitCard({ habit, onEdit, onLog }) {
  const today = new Date().toISOString().split('T')[0];
  const todayLog = habit.logs?.find(l => l.date === today);
  const posCount = todayLog?.countPositive || 0;
  const negCount = todayLog?.countNegative || 0;

  return (
    <div className="flex bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-xl overflow-hidden h-[72px] shadow-sm transition-all hover:shadow-md hover:border-[var(--color-border-strong)]">
       {/* Positive Button */}
       {habit.isPositive ? (
         <button 
           onClick={() => onLog('positive')} 
           className="w-16 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 flex items-center justify-center text-3xl font-light transition-colors active:bg-teal-500/30 border-r border-[var(--color-border)]"
         >
            +
         </button>
       ) : (
         <div className="w-16 bg-[var(--color-bg-panel-hover)]/30 border-r border-[var(--color-border)]"></div>
       )}

       {/* Center (Edit & Info) */}
       <div onClick={onEdit} className="flex-1 flex flex-col justify-center px-4 cursor-pointer relative group">
          <h3 className="font-bold text-[var(--color-text-main)] truncate max-w-[220px] group-hover:text-[var(--color-accent)] transition-colors">{habit.title}</h3>
          {habit.notes && <p className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[200px] mt-0.5">{habit.notes}</p>}
          <div className="absolute bottom-2 right-3 text-xs font-mono font-bold flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
             {habit.isPositive && <span className="text-teal-400">+{posCount}</span>}
             {habit.isPositive && habit.isNegative && <span className="text-[var(--color-text-muted)] font-normal text-[10px]">|</span>}
             {habit.isNegative && <span className="text-orange-400">-{negCount}</span>}
          </div>
       </div>

       {/* Negative Button */}
       {habit.isNegative ? (
         <button 
           onClick={() => onLog('negative')} 
           className="w-16 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 flex items-center justify-center text-3xl font-light transition-colors active:bg-orange-500/30 border-l border-[var(--color-border)]"
         >
            -
         </button>
       ) : (
         <div className="w-16 bg-[var(--color-bg-panel-hover)]/30 border-l border-[var(--color-border)]"></div>
       )}
    </div>
  );
}
