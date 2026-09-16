'use client';

import { useState } from 'react';
import { createContact, updateContact } from '@/app/crm/serverActions';

const TIER_CONFIG = {
  0: { label: 'T0 · Core', color: '#ff3366' },
  1: { label: 'T1 · Key', color: '#ff8c42' },
  2: { label: 'T2 · Network', color: '#4ecdc4' },
  3: { label: 'T3 · Contact', color: '#888899' },
};

const GENDER_OPTIONS = [
  { value: '', label: '— Not specified —' },
  { value: 'male', label: '♂ Male' },
  { value: 'female', label: '♀ Female' },
  { value: 'other', label: '⚧ Other' },
  { value: 'prefer_not_to_say', label: '🔒 Prefer not to say' },
];

const RELATIONSHIP_OPTIONS = [
  { value: '', label: '— Not specified —' },
  { value: 'single', label: '🙋 Single' },
  { value: 'in_relationship', label: '💑 In a relationship' },
  { value: 'married', label: '💍 Married' },
  { value: 'divorced', label: '📃 Divorced' },
  { value: 'widowed', label: '🕊️ Widowed' },
  { value: 'prefer_not_to_say', label: '🔒 Prefer not to say' },
];

// Predefined tag suggestions
const TAG_SUGGESTIONS = [
  'education', 'work', 'university', 'high school', 'colleague', 'former colleague',
  'industry', 'conference', 'online', 'friend', 'family', 'mentor', 'mentee',
  'investor', 'partner', 'client', 'vendor',
];

export default function CrmContactModal({ onClose, onCreated, initialData }) {
  const isEdit = !!initialData;

  // Parse existing tags from JSON string
  const parsedInitialTags = (() => {
    try { const parsed = initialData?.tags ? JSON.parse(initialData.tags) : []; return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  })();

  const [form, setForm] = useState({
    fullName: initialData?.fullName || '',
    chineseName: initialData?.chineseName || '',
    displayName: initialData?.displayName || '',
    tier: initialData?.tier ?? 3,
    gender: initialData?.gender || '',
    birthday: initialData?.birthday || '',
    city: initialData?.city || '',
    nation: initialData?.nation || '',
    occupation: initialData?.occupation || '',
    relationshipStatus: initialData?.relationshipStatus || '',
  });
  const [tags, setTags] = useState(parsedInitialTags);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  // Tag management
  const addTag = (tag) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };
  const removeTag = (tag) => setTags(prev => prev.filter(t => t !== tag));
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
    if (e.key === 'Backspace' && !tagInput && tags.length) setTags(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim()) { setError('Full name is required'); return; }
    setSaving(true);
    setError('');
    try {
      let contact;
      if (isEdit) {
        contact = await updateContact(initialData.id, { ...form, tags });
      } else {
        contact = await createContact({ ...form, tags });
      }
      onCreated?.(contact);
    } catch (e) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'fadeIn 0.15s ease',
        overflowY: 'auto',
      }}
    >
      <div style={{
        background: '#14141e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: 32, width: '100%', maxWidth: 560,
        boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.2s ease', margin: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f0f0f0' }}>
              {isEdit ? 'Edit Contact' : 'New Contact'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888899' }}>
              {isEdit ? 'Update contact information' : 'Add someone to your network'}
            </p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── Tier ── */}
          <div>
            <FieldLabel>Tier / Circle</FieldLabel>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[0, 1, 2, 3].map(t => {
                const cfg = TIER_CONFIG[t];
                const active = form.tier === t;
                return (
                  <button key={t} onClick={() => set('tier', t)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                    background: active ? `${cfg.color}22` : 'rgba(255,255,255,0.04)',
                    color: active ? cfg.color : '#555566',
                    border: active ? `1px solid ${cfg.color}` : '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Names ── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <FormField label="Full Name (EN) *" value={form.fullName} onChange={v => set('fullName', v)} placeholder="e.g. John Smith" flex={3} />
            <FormField label="中文名" value={form.chineseName} onChange={v => set('chineseName', v)} placeholder="张三" flex={2} />
          </div>

          <FormField label="Nickname / 尊称" value={form.displayName} onChange={v => set('displayName', v)} placeholder="e.g. Dr. Zhang" />

          {/* ── Personal: gender + relationship status ── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <FieldLabel>Gender</FieldLabel>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} style={{ ...selectStyle, marginTop: 6 }}>
                {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <FieldLabel>Relationship Status</FieldLabel>
              <select value={form.relationshipStatus} onChange={e => set('relationshipStatus', e.target.value)} style={{ ...selectStyle, marginTop: 6 }}>
                {RELATIONSHIP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Occupation ── */}
          <FormField label="Occupation" value={form.occupation} onChange={v => set('occupation', v)} placeholder="e.g. Software Engineer, Researcher…" />

          {/* ── Location: city + nation ── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <FormField label="City" value={form.city} onChange={v => set('city', v)} placeholder="Beijing" flex={1} />
            <FormField label="Country / Nation" value={form.nation} onChange={v => set('nation', v)} placeholder="China" flex={1} />
          </div>

          {/* ── Birthday ── */}
          <FormField label="Birthday" value={form.birthday} onChange={v => set('birthday', v)} placeholder="YYYY-MM-DD" type="date" />

          {/* ── Tags ── */}
          <div>
            <FieldLabel>Tags</FieldLabel>
            <div style={{
              marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
              minHeight: 38, padding: '6px 10px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
            }}>
              {tags.map(tag => (
                <span key={tag} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(255,51,102,0.15)', border: '1px solid rgba(255,51,102,0.3)',
                  color: '#ff6688', fontSize: 11, fontWeight: 600,
                }}>
                  {tag}
                  <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff6688', fontSize: 10, padding: 0, lineHeight: 1 }}>✕</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? 'Type tag + Enter (e.g. education, work…)' : '+ tag'}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: '#f0f0f0', fontSize: 12, minWidth: 120, flex: 1,
                  fontFamily: 'inherit',
                }}
              />
            </div>
            {/* Suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {TAG_SUGGESTIONS.filter(s => !tags.includes(s) && s.includes(tagInput.toLowerCase())).slice(0, 8).map(s => (
                <button key={s} onClick={() => addTag(s)} style={{
                  padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: '#666677', cursor: 'pointer', fontSize: 11,
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff3366'; e.currentTarget.style.color = '#ff3366'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#666677'; }}
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#ff3366', padding: '8px 12px', background: 'rgba(255,51,102,0.1)', borderRadius: 8 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#888899', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{
            flex: 2, padding: '10px', borderRadius: 10, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: saving ? 'rgba(255,51,102,0.4)' : 'linear-gradient(135deg, #ff3366, #ff6b8a)',
            color: '#fff', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
            boxShadow: saving ? 'none' : '0 4px 16px rgba(255,51,102,0.3)',
          }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add to Network'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}

// ─── Shared sub-components & styles ──────────────────────────────────────────

function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, color: '#888899', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
      {children}
    </label>
  );
}

function FormField({ label, value, onChange, placeholder, type = 'text', flex = 1 }) {
  return (
    <div style={{ flex, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, color: '#f0f0f0', fontSize: 13, padding: '9px 12px',
          outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s',
          colorScheme: 'dark', fontFamily: 'inherit',
        }}
        onFocus={e => e.target.style.borderColor = 'rgba(255,51,102,0.5)'}
        onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
      />
    </div>
  );
}

const closeBtn = {
  background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
  width: 32, height: 32, cursor: 'pointer', color: '#888899', fontSize: 16,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const selectStyle = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, color: '#f0f0f0', fontSize: 13, padding: '9px 12px',
  outline: 'none', cursor: 'pointer', colorScheme: 'dark', fontFamily: 'inherit',
  boxSizing: 'border-box',
};
