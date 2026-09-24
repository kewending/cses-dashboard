'use client';

import React, { useState, useEffect } from 'react';
import MomentaryCheckInForm from '@/components/Mood/MomentaryCheckInForm';
import PeriodicAssessmentForm from '@/components/Mood/PeriodicAssessmentForm';
import { getRecentCheckIns, getRecentAssessments } from '@/app/actions/mood-actions';
import { BrainCircuit, History } from 'lucide-react';

export default function MoodDashboard() {
  const [activeTab, setActiveTab] = useState('daily');
  const [assessmentType, setAssessmentType] = useState('PHQ-9');
  
  const [checkIns, setCheckIns] = useState([]);
  const [assessments, setAssessments] = useState([]);
  
  const fetchData = async () => {
    const c = await getRecentCheckIns(5);
    const a = await getRecentAssessments(3);
    setCheckIns(c || []);
    setAssessments(a || []);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-main)] flex items-center gap-3">
            <BrainCircuit className="w-8 h-8 text-[var(--color-accent)]" />
            Psychology & Emotion
          </h1>
          <p className="text-[var(--color-text-muted)] mt-1">Track your mental state, energy, and clinical wellness.</p>
        </div>
        
        <div className="flex bg-[var(--color-bg-panel)] border border-[var(--color-border)] p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'daily' ? 'bg-[var(--color-bg-panel-hover)] text-[var(--color-text-main)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
          >
            Daily Check-in
          </button>
          <button 
            onClick={() => setActiveTab('clinical')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'clinical' ? 'bg-[var(--color-bg-panel-hover)] text-[var(--color-text-main)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
          >
            Clinical Assessment
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Forms */}
        <div className="lg:col-span-2">
          {activeTab === 'daily' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MomentaryCheckInForm />
            </div>
          )}

          {activeTab === 'clinical' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex gap-4">
                <button 
                  onClick={() => setAssessmentType('PHQ-9')}
                  className={`flex-1 p-4 rounded-xl border transition-all ${assessmentType === 'PHQ-9' ? 'border-[var(--color-accent)] bg-[var(--color-glass-bg)]' : 'border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-bg-panel)]'}`}
                >
                  <h3 className="font-bold text-[var(--color-text-main)]">PHQ-9</h3>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">Depression Screening</p>
                </button>
                <button 
                  onClick={() => setAssessmentType('GAD-7')}
                  className={`flex-1 p-4 rounded-xl border transition-all ${assessmentType === 'GAD-7' ? 'border-[var(--color-accent)] bg-[var(--color-glass-bg)]' : 'border-[var(--color-border)] hover:border-[var(--color-accent)] bg-[var(--color-bg-panel)]'}`}
                >
                  <h3 className="font-bold text-[var(--color-text-main)]">GAD-7</h3>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">Anxiety Screening</p>
                </button>
              </div>
              
              <PeriodicAssessmentForm instrument={assessmentType} onComplete={fetchData} />
            </div>
          )}
        </div>

        {/* Right Column - History Sidebar */}
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-main)] flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-[var(--color-text-muted)]" />
              Recent Logs
            </h3>
            
            {activeTab === 'daily' ? (
              <div className="space-y-4">
                {checkIns.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] italic">No recent check-ins.</p>
                ) : (
                  checkIns.map(log => (
                    <div key={log.id} className="bg-[var(--color-bg-panel)] p-3 rounded-lg shadow-sm border border-[var(--color-border)] flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text-main)]">{new Date(log.timestamp).toLocaleDateString()}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs bg-[var(--color-glass-bg)] text-[var(--color-text-main)] px-2 py-0.5 rounded border border-[var(--color-border)]">V: {log.valence}</span>
                          <span className="text-xs bg-[var(--color-glass-bg)] text-[var(--color-text-main)] px-2 py-0.5 rounded border border-[var(--color-border)]">A: {log.arousal}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs text-[var(--color-text-muted)]">Energy</span>
                        <span className="font-bold text-[var(--color-accent)]">{log.energyLevel}/10</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)] italic">No recent assessments.</p>
                ) : (
                  assessments.map(log => (
                    <div key={log.id} className="bg-[var(--color-bg-panel)] p-3 rounded-lg shadow-sm border border-[var(--color-border)]">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-[var(--color-text-main)]">{log.instrument}</span>
                        <span className="text-xs text-[var(--color-text-muted)]">{new Date(log.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">Score: <span className="font-bold text-[var(--color-text-main)]">{log.totalScore}</span></p>
                      <span className={`text-xs inline-block mt-1 px-2 py-1 rounded-full border ${
                        log.severityLabel.includes('Severe') || log.requiresCrisisIntervention 
                        ? 'border-red-500/50 text-red-400 bg-red-500/10' 
                        : 'border-green-500/50 text-green-400 bg-green-500/10'
                      }`}>
                        {log.severityLabel}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
