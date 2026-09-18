import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, parseISO, isToday
} from 'date-fns';

export default function CalendarPicker({ selectedDate, onSelectDate, availableDates = [], theme = 'indigo' }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate || new Date()));

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Map theme colors
  const themeStyles = {
    indigo: {
      bg: 'bg-indigo-500',
      shadow: 'shadow-indigo-500/30',
      text: 'text-indigo-400',
      border: 'border-indigo-400',
      dot: 'bg-indigo-400'
    },
    orange: {
      bg: 'bg-orange-500',
      shadow: 'shadow-orange-500/30',
      text: 'text-orange-400',
      border: 'border-orange-400',
      dot: 'bg-orange-400'
    },
    pink: {
      bg: 'bg-pink-500',
      shadow: 'shadow-pink-500/30',
      text: 'text-pink-400',
      border: 'border-pink-400',
      dot: 'bg-pink-400'
    },
    emerald: {
      bg: 'bg-emerald-500',
      shadow: 'shadow-emerald-500/30',
      text: 'text-emerald-400',
      border: 'border-emerald-400',
      dot: 'bg-emerald-400'
    }
  };

  const t = themeStyles[theme] || themeStyles.indigo;

  return (
    <div className="bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <button onClick={prevMonth} className="p-2 hover:bg-[var(--color-bg-panel-hover)] rounded-full transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold tracking-wide">{format(currentMonth, 'MMMM yyyy')}</h2>
        <button onClick={nextMonth} className="p-2 hover:bg-[var(--color-bg-panel-hover)] rounded-full transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-4 text-center text-xs opacity-50 font-bold tracking-wider uppercase">
        {weekDays.map(day => <div key={day}>{day}</div>)}
      </div>
      
      <div className="grid grid-cols-7 gap-2 text-sm">
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = selectedDate === dateStr;
          const hasData = availableDates.includes(dateStr);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          
          return (
            <button
              key={i}
              onClick={() => hasData && onSelectDate(dateStr)}
              disabled={!hasData && !isSelected}
              className={`
                aspect-square rounded-2xl flex items-center justify-center transition-all relative font-medium
                ${!isCurrentMonth ? 'opacity-20' : 'opacity-100'}
                ${isSelected ? `${t.bg} text-white shadow-lg ${t.shadow} scale-105` : ''}
                ${!isSelected && hasData ? 'hover:bg-[var(--color-bg-panel-hover)] cursor-pointer text-[var(--color-text-main)]' : ''}
                ${!hasData && !isSelected ? 'cursor-not-allowed opacity-30 text-[var(--color-text-muted)]' : ''}
                ${today && !isSelected ? `border border-[var(--color-border-hover)] ${t.text}` : ''}
              `}
            >
              {format(day, 'd')}
              {hasData && !isSelected && (
                <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${t.dot}`}></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
