'use client';

import React, { useState } from 'react';
import { saveMomentaryCheckIn } from '@/app/actions/mood-actions';
import { Activity, Battery, Frown, Smile, Moon, CloudLightning } from 'lucide-react';

export default function MomentaryCheckInForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    valence: 0,
    arousal: 0,
    energyLevel: 5,
    anxietyLevel: 0,
    sleepHours: 7,
    sleepQuality: 3,
    tags: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Parse tags string into array
    const parsedTags = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const dataToSubmit = {
      ...formData,
      valence: parseInt(formData.valence),
      arousal: parseInt(formData.arousal),
      energyLevel: parseInt(formData.energyLevel),
      anxietyLevel: parseInt(formData.anxietyLevel),
      sleepHours: parseFloat(formData.sleepHours),
      sleepQuality: parseInt(formData.sleepQuality),
      tags: parsedTags
    };

    const res = await saveMomentaryCheckIn(dataToSubmit);
    setLoading(false);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      alert("Error saving: " + res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
        <h3 className="text-lg font-semibold text-[var(--color-text-main)] flex items-center gap-2">
          <Activity className="w-5 h-5 text-[var(--color-accent)]" />
          Daily Check-in
        </h3>
        {success && <span className="text-sm font-medium border border-green-500/50 text-green-400 bg-green-500/10 px-2 py-1 rounded">Saved successfully!</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Circumplex Core */}
        <div className="space-y-6">
          <h4 className="font-medium text-[var(--color-text-main)] mb-2">Core State (Circumplex)</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1"><Frown className="w-4 h-4"/> Negative (Valence)</span>
              <span className="flex items-center gap-1">Positive <Smile className="w-4 h-4"/></span>
            </div>
            <input 
              type="range" name="valence" min="-5" max="5" 
              value={formData.valence} onChange={handleChange}
              className="w-full"
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <div className="text-center text-xs font-medium text-[var(--color-accent)]">{formData.valence > 0 ? '+' : ''}{formData.valence}</div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1"><Battery className="w-4 h-4 opacity-50"/> Low (Arousal)</span>
              <span className="flex items-center gap-1">High <Battery className="w-4 h-4"/></span>
            </div>
            <input 
              type="range" name="arousal" min="-5" max="5" 
              value={formData.arousal} onChange={handleChange}
              className="w-full"
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <div className="text-center text-xs font-medium text-[var(--color-accent)]">{formData.arousal > 0 ? '+' : ''}{formData.arousal}</div>
          </div>
        </div>

        {/* Specific Metrics */}
        <div className="space-y-6">
          <h4 className="font-medium text-[var(--color-text-main)] mb-2">Subjective Metrics</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
              <span>Energy Level (1-10)</span>
              <span className="font-medium text-[var(--color-text-main)]">{formData.energyLevel}</span>
            </div>
            <input 
              type="range" name="energyLevel" min="1" max="10" 
              value={formData.energyLevel} onChange={handleChange}
              className="w-full"
              style={{ accentColor: 'var(--color-accent)' }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1"><CloudLightning className="w-4 h-4"/> Anxiety/Tension (0-10)</span>
              <span className="font-medium text-[var(--color-text-main)]">{formData.anxietyLevel}</span>
            </div>
            <input 
              type="range" name="anxietyLevel" min="0" max="10" 
              value={formData.anxietyLevel} onChange={handleChange}
              className="w-full"
              style={{ accentColor: 'var(--color-accent)' }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[var(--color-border)] pt-6">
        {/* Sleep */}
        <div className="space-y-4">
          <h4 className="font-medium text-[var(--color-text-main)] flex items-center gap-2">
            <Moon className="w-4 h-4 text-[var(--color-accent)]" />
            Subjective Sleep
          </h4>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Hours</label>
              <input 
                type="number" step="0.5" name="sleepHours" 
                value={formData.sleepHours} onChange={handleChange}
                className="w-full p-2 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-bg-dark)] text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[var(--color-text-muted)] mb-1">Quality (1-5)</label>
              <input 
                type="number" min="1" max="5" name="sleepQuality" 
                value={formData.sleepQuality} onChange={handleChange}
                className="w-full p-2 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-bg-dark)] text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)]"
              />
            </div>
          </div>
        </div>

        {/* Context */}
        <div className="space-y-4">
          <h4 className="font-medium text-[var(--color-text-main)]">Context & Triggers</h4>
          <div>
            <label className="block text-xs text-[var(--color-text-muted)] mb-1">Tags (comma separated)</label>
            <input 
              type="text" name="tags" placeholder="e.g. deep_work, social" 
              value={formData.tags} onChange={handleChange}
              className="w-full p-2 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-bg-dark)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)]"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Optional Notes</label>
        <textarea 
          name="notes" rows="2" 
          value={formData.notes} onChange={handleChange}
          className="w-full p-2 border border-[var(--color-border)] rounded-md text-sm bg-[var(--color-bg-dark)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] resize-none outline-none focus:border-[var(--color-accent)]"
          placeholder="Any specific triggers or breakthroughs today?"
        ></textarea>
      </div>

      <div className="flex justify-end pt-2">
        <button 
          type="submit" 
          disabled={loading}
          className="text-[#f0f0f0] font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {loading ? 'Saving...' : 'Save Check-in'}
        </button>
      </div>
    </form>
  );
}
