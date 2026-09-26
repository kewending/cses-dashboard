'use client';
import { useState, useEffect } from 'react';
import { getHabits, createHabit, updateHabit, deleteHabit, logHabit } from '@/app/actions/habitActions';
import HabitCard from './HabitCard';
import EditHabitModal from './EditHabitModal';
import HabitHeatmap from './HabitHeatmap';

export default function HabitsView() {
  const [habits, setHabits] = useState([]);
  const [editingHabit, setEditingHabit] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    setLoading(true);
    const res = await getHabits();
    if (res.success) setHabits(res.habits);
    setLoading(false);
  };

  return (
    <div className="flex w-full h-full gap-6 p-2 animate-in fade-in duration-300">
      {/* Left Column: List */}
      <div className="w-[450px] flex flex-col gap-4 bg-[var(--color-bg-panel)] rounded-2xl border border-[var(--color-border)] p-6 shadow-sm h-full overflow-y-auto custom-scrollbar">
         <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-[var(--color-text-main)]">Habits</h2>
            <button onClick={() => setIsCreating(true)} className="w-8 h-8 flex items-center justify-center bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)] text-[var(--color-accent)] hover:text-white rounded-lg text-lg font-bold transition-colors">
              +
            </button>
         </div>
         {loading ? (
            <div className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading habits...</div>
         ) : habits.length === 0 ? (
            <div className="text-sm text-[var(--color-text-muted)] text-center py-8">No habits tracked yet. Create one!</div>
         ) : (
           <div className="flex flex-col gap-3">
             {habits.map(h => (
               <HabitCard 
                 key={h.id} 
                 habit={h} 
                 onEdit={() => setEditingHabit(h)} 
                 onLog={async (type) => {
                    const res = await logHabit(h.id, type);
                    if (res.success) loadHabits();
                 }} 
               />
             ))}
           </div>
         )}
      </div>
      
      {/* Right Column: Heatmap Grid */}
      <div className="flex-1 bg-[var(--color-bg-panel)] rounded-2xl border border-[var(--color-border)] p-6 shadow-sm h-full overflow-y-auto custom-scrollbar">
         <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-6">30-Day Performance</h2>
         {!loading && habits.length > 0 && <HabitHeatmap habits={habits} />}
      </div>

      {(editingHabit || isCreating) && (
        <EditHabitModal 
           habit={editingHabit} 
           onClose={() => { setEditingHabit(null); setIsCreating(false); }}
           onSave={async (data) => {
              if (isCreating) await createHabit(data);
              else await updateHabit(editingHabit.id, data);
              loadHabits();
              setEditingHabit(null);
              setIsCreating(false);
           }}
           onDelete={async (id) => {
              await deleteHabit(id);
              loadHabits();
              setEditingHabit(null);
           }}
        />
      )}
    </div>
  )
}
