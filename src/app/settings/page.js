'use client';

import React, { useState } from 'react';
import { useSettings } from '../../lib/SettingsContext';

export default function SettingsPage() {
  const { settings, updateSettings, isLoaded } = useSettings();
  const [activeTab, setActiveTab] = useState('general');

  if (!isLoaded) return <div className="p-8 text-[var(--color-text-muted)]">Loading settings...</div>;

  const tabs = [
    { id: 'general', label: '🎨 Appearance & General' },
    { id: 'finance', label: '💰 Finance' },
    { id: 'crm', label: '👥 CRM (Relationships)' },
    { id: 'tasks', label: '⏱️ Tasks & Timeline' },
  ];

  const handleCrmTierChange = (index, field, value) => {
    const newTiers = [...settings.crmTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    
    // Automatically update the background color based on the selected color (adding 15% opacity)
    if (field === 'color') {
      // Basic hex to rgba converter for 0.15 opacity
      try {
        let hex = value.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        newTiers[index].bg = `rgba(${r},${g},${b},0.15)`;
      } catch (e) {
        // Ignore parsing errors, keep existing bg
      }
    }
    
    updateSettings('crmTiers', newTiers);
  };

  const handlePomodoroChange = (field, value) => {
    updateSettings('pomodoro', { ...settings.pomodoro, [field]: parseInt(value) || 0 });
  };

  const handleFinanceChange = (field, value) => {
    updateSettings('finance', { ...settings.finance, [field]: value });
  };

  return (
    <div className="max-w-4xl mx-auto text-[var(--color-text-main)]">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="flex gap-8">
        {/* Sidebar Tabs */}
        <div className="w-64 flex flex-col gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-3 rounded-xl text-left font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20' 
                  : 'hover:bg-[var(--color-bg-panel)] text-[var(--color-text-muted)] border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-2xl p-8 shadow-xl backdrop-blur-md">
          {activeTab === 'general' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold border-b border-[var(--color-border)] pb-4">Appearance</h2>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--color-text-muted)]">Theme Mode</label>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => updateSettings('theme', 'dark')}
                      className={`px-4 py-2 rounded-lg font-medium border ${settings.theme === 'dark' ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'}`}
                    >
                      Dark Mode
                    </button>
                    <button 
                      onClick={() => updateSettings('theme', 'light')}
                      className={`px-4 py-2 rounded-lg font-medium border ${settings.theme === 'light' ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'}`}
                    >
                      Light Mode
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--color-text-muted)]">Accent Color</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" 
                      value={settings.accentColor} 
                      onChange={(e) => updateSettings('accentColor', e.target.value)}
                      className="w-12 h-12 rounded cursor-pointer bg-transparent border-0 p-0"
                    />
                    <span className="font-mono text-sm">{settings.accentColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold border-b border-[var(--color-border)] pb-4">Finance Preferences</h2>
              
              <div className="space-y-3">
                <label className="text-sm font-semibold text-[var(--color-text-muted)]">Base Currency Symbol</label>
                <input 
                  type="text" 
                  value={settings.finance.baseCurrency}
                  onChange={(e) => handleFinanceChange('baseCurrency', e.target.value)}
                  className="w-full max-w-xs bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg p-3 text-[var(--color-text-main)] outline-none focus:border-[var(--color-accent)] transition-colors"
                  placeholder="e.g. $, €, £, ¥"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">This symbol will be used throughout the finance module.</p>
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold border-b border-[var(--color-border)] pb-4">Contact Tiers</h2>
              <p className="text-sm text-[var(--color-text-muted)] -mt-4">Customize the 4 relationship tiers used in your CRM.</p>
              
              <div className="space-y-6">
                {settings.crmTiers.map((tier, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-panel)]">
                    <div className="text-2xl font-black text-[var(--color-text-muted)] opacity-50 w-8">T{index}</div>
                    
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Tier Label</label>
                      <input 
                        type="text" 
                        value={tier.label}
                        onChange={(e) => handleCrmTierChange(index, 'label', e.target.value)}
                        className="w-full bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg p-2 text-sm outline-none focus:border-[var(--color-accent)] transition-colors"
                      />
                    </div>
                    
                    <div className="w-32 space-y-2">
                      <label className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Tier Color</label>
                      <div className="flex items-center gap-2 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg p-1.5">
                        <input 
                          type="color" 
                          value={tier.color}
                          onChange={(e) => handleCrmTierChange(index, 'color', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="font-mono text-xs truncate">{tier.color}</span>
                      </div>
                    </div>

                    <div className="w-24 flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ color: tier.color, backgroundColor: tier.bg }}>
                        Preview
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold border-b border-[var(--color-border)] pb-4">Focus & Pomodoro Timer</h2>
              
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--color-text-muted)]">Focus Session (mins)</label>
                  <input 
                    type="number" 
                    value={settings.pomodoro.focus}
                    onChange={(e) => handlePomodoroChange('focus', e.target.value)}
                    className="w-full bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg p-3 text-lg font-mono outline-none focus:border-[var(--color-accent)] transition-colors text-center"
                    min="1" max="120"
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--color-text-muted)]">Short Break (mins)</label>
                  <input 
                    type="number" 
                    value={settings.pomodoro.shortBreak}
                    onChange={(e) => handlePomodoroChange('shortBreak', e.target.value)}
                    className="w-full bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg p-3 text-lg font-mono outline-none focus:border-[var(--color-accent)] transition-colors text-center"
                    min="1" max="60"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-[var(--color-text-muted)]">Long Break (mins)</label>
                  <input 
                    type="number" 
                    value={settings.pomodoro.longBreak}
                    onChange={(e) => handlePomodoroChange('longBreak', e.target.value)}
                    className="w-full bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg p-3 text-lg font-mono outline-none focus:border-[var(--color-accent)] transition-colors text-center"
                    min="1" max="60"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
