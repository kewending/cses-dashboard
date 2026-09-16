'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const defaultSettings = {
  theme: 'dark',
  accentColor: '#ff3366',
  crmTiers: [
    { id: 0, label: 'T0 · Core', color: '#ff3366', bg: 'rgba(255,51,102,0.15)' },
    { id: 1, label: 'T1 · Key', color: '#ff8c42', bg: 'rgba(255,140,66,0.15)' },
    { id: 2, label: 'T2 · Network', color: '#4ecdc4', bg: 'rgba(78,205,196,0.15)' },
    { id: 3, label: 'T3 · Contact', color: '#888899', bg: 'rgba(136,136,153,0.15)' },
  ],
  pomodoro: {
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
  },
  finance: {
    baseCurrency: '$',
  }
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from local storage
    const stored = localStorage.getItem('cses-settings');
    if (stored) {
      try {
        setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = (key, value) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      localStorage.setItem('cses-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  // Apply CSS variables globally when settings change
  useEffect(() => {
    if (!isLoaded) return;
    
    const root = document.documentElement;
    root.style.setProperty('--color-accent', settings.accentColor);
    
    if (settings.theme === 'light') {
      root.style.setProperty('--color-bg-dark', '#f8f9fa');
      root.style.setProperty('--color-bg-panel', '#ffffff');
      root.style.setProperty('--color-bg-panel-hover', '#f0f0f0');
      root.style.setProperty('--color-border', 'rgba(0,0,0,0.1)');
      root.style.setProperty('--color-border-hover', 'rgba(0,0,0,0.2)');
      root.style.setProperty('--color-text-main', '#1a1a24');
      root.style.setProperty('--color-text-muted', '#666677');
      root.style.setProperty('--color-glass-bg', 'rgba(0,0,0,0.03)');
      root.style.setProperty('--color-glass-border', 'rgba(0,0,0,0.1)');
    } else {
      root.style.setProperty('--color-bg-dark', '#0a0a0f');
      root.style.setProperty('--color-bg-panel', '#14141e');
      root.style.setProperty('--color-bg-panel-hover', '#1f1f2e');
      root.style.setProperty('--color-border', 'rgba(255,255,255,0.1)');
      root.style.setProperty('--color-border-hover', 'rgba(255,255,255,0.2)');
      root.style.setProperty('--color-text-main', '#f0f0f0');
      root.style.setProperty('--color-text-muted', '#888899');
      root.style.setProperty('--color-glass-bg', 'rgba(255,255,255,0.03)');
      root.style.setProperty('--color-glass-border', 'rgba(255,255,255,0.05)');
    }
  }, [settings.theme, settings.accentColor, isLoaded]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
