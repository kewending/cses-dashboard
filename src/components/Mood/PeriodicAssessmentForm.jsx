'use client';

import React, { useState } from 'react';
import { savePeriodicAssessment } from '@/app/actions/mood-actions';
import { FileText } from 'lucide-react';

const PHQ9_SCHEMA = {
  instrumentId: "PHQ-9",
  title: "Patient Health Questionnaire-9",
  recallPeriod: "Past 14 days",
  prompt: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
  options: [
    { value: 0, label: "Not at all" },
    { value: 1, label: "Several days" },
    { value: 2, label: "More than half the days" },
    { value: 3, label: "Nearly every day" }
  ],
  items: [
    { id: "phq9_q1", prompt: "Little interest or pleasure in doing things" },
    { id: "phq9_q2", prompt: "Feeling down, depressed, or hopeless" },
    { id: "phq9_q3", prompt: "Trouble falling or staying asleep, or sleeping too much" },
    { id: "phq9_q4", prompt: "Feeling tired or having little energy" },
    { id: "phq9_q5", prompt: "Poor appetite or overeating" },
    { id: "phq9_q6", prompt: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down" },
    { id: "phq9_q7", prompt: "Trouble concentrating on things, such as reading the newspaper or watching television" },
    { id: "phq9_q8", prompt: "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual" },
    { id: "phq9_q9", prompt: "Thoughts that you would be better off dead or of hurting yourself in some way", criticalFlag: true }
  ]
};

const GAD7_SCHEMA = {
  instrumentId: "GAD-7",
  title: "Generalized Anxiety Disorder-7",
  recallPeriod: "Past 14 days",
  prompt: "Over the last 2 weeks, how often have you been bothered by the following problems?",
  options: [
    { value: 0, label: "Not at all" },
    { value: 1, label: "Several days" },
    { value: 2, label: "More than half the days" },
    { value: 3, label: "Nearly every day" }
  ],
  items: [
    { id: "gad7_q1", prompt: "Feeling nervous, anxious, or on edge" },
    { id: "gad7_q2", prompt: "Not being able to stop or control worrying" },
    { id: "gad7_q3", prompt: "Worrying too much about different things" },
    { id: "gad7_q4", prompt: "Trouble relaxing" },
    { id: "gad7_q5", prompt: "Being so restless that it's hard to sit still" },
    { id: "gad7_q6", prompt: "Becoming easily annoyed or irritable" },
    { id: "gad7_q7", prompt: "Feeling afraid, as if something awful might happen" }
  ]
};

export default function PeriodicAssessmentForm({ instrument = "PHQ-9", onComplete }) {
  const schema = instrument === "PHQ-9" ? PHQ9_SCHEMA : GAD7_SCHEMA;
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSelect = (itemId, value) => {
    setResponses(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(responses).length < schema.items.length) {
      alert("Please answer all questions before submitting.");
      return;
    }

    setLoading(true);
    const res = await savePeriodicAssessment(instrument, responses);
    setLoading(false);

    if (res.success) {
      setResult(res.evaluation);
      if (onComplete) onComplete(res.evaluation);
    } else {
      alert("Error saving assessment: " + res.error);
    }
  };

  if (result) {
    return (
      <div className="glass-panel p-8 text-center">
        <div className="w-16 h-16 bg-[var(--color-glass-bg)] border border-[var(--color-border)] text-[var(--color-accent)] rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[var(--color-text-main)] mb-2">Assessment Complete</h3>
        <p className="text-[var(--color-text-muted)] mb-6">Your responses have been recorded.</p>
        
        <div className="bg-[var(--color-bg-dark)] border border-[var(--color-border)] p-4 rounded-lg mb-6 max-w-sm mx-auto text-left space-y-2">
          <div className="flex justify-between border-b border-[var(--color-border)] pb-2">
            <span className="text-[var(--color-text-muted)]">Total Score:</span>
            <span className="font-medium text-[var(--color-text-main)]">{result.totalScore}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-text-muted)]">Severity:</span>
            <span className={`font-medium ${result.requiresCrisisIntervention || result.severity.includes('Severe') ? 'text-red-400' : 'text-[var(--color-text-main)]'}`}>
              {result.severity}
            </span>
          </div>
        </div>

        {result.requiresCrisisIntervention && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg text-sm mb-6 max-w-md mx-auto text-left">
            <strong>Note:</strong> You indicated thoughts of self-harm. Please consider reaching out to a professional or a crisis helpline in your area. You are not alone.
          </div>
        )}

        <button onClick={() => {setResult(null); setResponses({});}} className="font-medium hover:underline" style={{ color: 'var(--color-accent)' }}>
          Take another assessment
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[var(--color-text-main)]">{schema.title}</h2>
        <p className="text-[var(--color-text-muted)] mt-1">{schema.prompt}</p>
      </div>

      <div className="space-y-6">
        {schema.items.map((item, index) => {
          const isSelected = responses[item.id] !== undefined;
          return (
            <div key={item.id} className={`p-4 rounded-lg border ${isSelected ? 'bg-[var(--color-glass-bg)] border-[var(--color-accent)]' : 'border-[var(--color-border)] bg-[var(--color-bg-dark)]'}`}>
              <p className="font-medium text-[var(--color-text-main)] mb-3">{index + 1}. {item.prompt}</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                {schema.options.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(item.id, opt.value)}
                    className={`py-2 px-3 text-sm rounded-md border transition-colors ${
                      responses[item.id] === opt.value
                        ? 'text-[#f0f0f0]'
                        : 'text-[var(--color-text-muted)] border-[var(--color-border)] bg-[var(--color-bg-panel)] hover:bg-[var(--color-bg-panel-hover)]'
                    }`}
                    style={responses[item.id] === opt.value ? { backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-accent)' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button 
          type="submit" 
          disabled={loading}
          className="text-[#f0f0f0] font-medium py-3 px-8 rounded-lg transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {loading ? 'Submitting...' : 'Submit Assessment'}
        </button>
      </div>
    </form>
  );
}
