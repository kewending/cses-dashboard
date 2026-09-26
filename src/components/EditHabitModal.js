'use client';
import { useState } from 'react';

export default function EditHabitModal({ habit, onClose, onSave, onDelete }) {
  const isEditing = !!habit;
  const [title, setTitle] = useState(habit?.title || '');
  const [notes, setNotes] = useState(habit?.notes || '');
  const [isPositive, setIsPositive] = useState(habit?.isPositive ?? true);
  const [isNegative, setIsNegative] = useState(habit?.isNegative ?? false);
  const [difficulty, setDifficulty] = useState(habit?.difficulty || 'Medium');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (!isPositive && !isNegative) return; // Must pick at least one
    onSave({ title, notes, isPositive, isNegative, difficulty });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-2xl p-6 w-[400px] shadow-2xl relative animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-6">
          {isEditing ? 'Edit Habit' : 'Create Habit'}
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Drink Water"
              className="w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Notes</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="Optional details..."
              className="w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)] transition-colors h-20 custom-scrollbar resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-2">Type (Select at least one)</label>
            <div className="flex gap-4">
               <button 
                 type="button"
                 onClick={() => setIsPositive(!isPositive)}
                 className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all ${isPositive ? 'border-teal-500 bg-teal-500/10' : 'border-[var(--color-border)] bg-[var(--color-bg-dark)] opacity-50'}`}
               >
                  <span className={`text-2xl font-light ${isPositive ? 'text-teal-400' : 'text-[var(--color-text-muted)]'}`}>+</span>
                  <span className={`text-xs font-bold mt-1 ${isPositive ? 'text-teal-400' : 'text-[var(--color-text-muted)]'}`}>Positive</span>
               </button>
               <button 
                 type="button"
                 onClick={() => setIsNegative(!isNegative)}
                 className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl border-2 transition-all ${isNegative ? 'border-orange-500 bg-orange-500/10' : 'border-[var(--color-border)] bg-[var(--color-bg-dark)] opacity-50'}`}
               >
                  <span className={`text-2xl font-light ${isNegative ? 'text-orange-400' : 'text-[var(--color-text-muted)]'}`}>-</span>
                  <span className={`text-xs font-bold mt-1 ${isNegative ? 'text-orange-400' : 'text-[var(--color-text-muted)]'}`}>Negative</span>
               </button>
            </div>
            {!isPositive && !isNegative && <p className="text-red-400 text-xs mt-2">Please select at least one type.</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">Difficulty</label>
            <select 
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-[var(--color-accent)]"
            >
               <option value="Trivial">Trivial (0.1 / 0.2)</option>
               <option value="Easy">Easy (0.25 / 0.5)</option>
               <option value="Medium">Medium (0.5 / 1.0)</option>
               <option value="Hard">Hard (1.0 / 2.0)</option>
               <option value="Very Hard">Very Hard (2.0 / 4.0)</option>
            </select>
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--color-border)]">
             {isEditing ? (
                <button type="button" onClick={() => onDelete(habit.id)} className="text-red-400 hover:text-red-300 text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors">
                  Delete
                </button>
             ) : (
                <div></div>
             )}
             <div className="flex gap-3">
               <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel-hover)] transition-colors">
                 Cancel
               </button>
               <button 
                 type="submit" 
                 disabled={!title.trim() || (!isPositive && !isNegative)}
                 className="px-6 py-2 bg-[var(--color-accent)] text-white rounded-xl text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all"
               >
                 Save
               </button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
}
