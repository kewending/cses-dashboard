'use client';

import React, { useState, useEffect } from 'react';
import SecondBrainEditor from '@/components/Editor/SecondBrainEditor';
import BacklinkPanel from '@/components/KnowledgeGraph/BacklinkPanel';
import { useSettings } from '@/lib/SettingsContext';
import { castVote } from '../actions/identityActions';

export default function DiaryClientWrapper({ initialContent, dateStr, isShutdown, dailyLogId, weather, onSaveAction }) {
  const { settings } = useSettings();
  const [content, setContent] = useState(initialContent);
  const [hasInjectedTemplate, setHasInjectedTemplate] = useState(false);
  const [voteCasted, setVoteCasted] = useState(false);

  useEffect(() => {
    if (isShutdown && !hasInjectedTemplate && settings?.diary?.shutdownTemplate) {
      if (!initialContent.includes(settings.diary.shutdownTemplate)) {
        setContent(prev => prev + '<br><hr><br>' + settings.diary.shutdownTemplate);
      }
      setHasInjectedTemplate(true);
    }
  }, [isShutdown, hasInjectedTemplate, settings, initialContent]);

  const handleVerifyIdentity = async () => {
    if (voteCasted) return;
    const res = await castVote({
      logOddsValue: 1.0,
      description: 'Completed Evening Shutdown Reflection',
      dailyLogId: dailyLogId
    });
    if (res.success) {
      setVoteCasted(true);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-12 flex flex-col gap-6">
      <SecondBrainEditor
        initialContent={content}
        onSave={onSaveAction}
        onExtract={async (text) => {
          // Future extract logic
        }}
      />

      <BacklinkPanel
        backlinks={[]}
        dailyLogMentions={[]}
      />

      {isShutdown && (
        <div className="mt-8 bg-[var(--color-bg-panel)] p-6 rounded-2xl border border-[var(--color-border)] shadow-lg animate-in fade-in zoom-in duration-500">
          <h3 className="text-xl font-bold text-[var(--color-accent)] mb-2">Identity Verification</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            By completing this shutdown routine and answering the reflection questions honestly, you are proving to yourself that you are the Sovereign Creator. 
          </p>
          <button 
            disabled={voteCasted}
            onClick={handleVerifyIdentity}
            className={`w-full py-3 rounded-xl font-bold transition-colors ${
              voteCasted 
                ? 'bg-green-900/30 text-green-500 border border-green-900/50 cursor-not-allowed'
                : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white border border-[var(--color-accent)]/30'
            }`}
          >
            {voteCasted ? '✅ +1.0 Vote Casted' : 'Submit as Identity Evidence (+1.0 Vote)'}
          </button>
        </div>
      )}
    </div>
  );
}
