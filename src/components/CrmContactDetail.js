'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import {
  updateContact, deleteContact, updateContactNotes,
  createContactMethod, deleteContactMethod,
  createBackgroundHistory, deleteBackgroundHistory,
  createInteraction, deleteInteraction,
  addContactRelation, removeContactRelation,
} from '@/app/crm/serverActions';
import CrmContactModal from './CrmContactModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  0: { label: 'T0 · Core', color: '#ff3366', bg: 'rgba(255,51,102,0.15)' },
  1: { label: 'T1 · Key', color: '#ff8c42', bg: 'rgba(255,140,66,0.15)' },
  2: { label: 'T2 · Network', color: '#4ecdc4', bg: 'rgba(78,205,196,0.15)' },
  3: { label: 'T3 · Contact', color: '#888899', bg: 'rgba(136,136,153,0.15)' },
};

const METHOD_ICONS = {
  email: '✉️', phone: '📞', wechat: '💬', linkedin: '🔗',
  twitter: '🐦', github: '⌨️', scholar: '🎓', other: '🌐',
};

const METHOD_TYPES = ['email', 'phone', 'wechat', 'linkedin', 'twitter', 'github', 'scholar', 'other'];

const INTERACTION_TYPES = ['meeting', 'call', 'email', 'event', 'other'];

const INTERACTION_ICONS = {
  meeting: '🤝', call: '📞', email: '✉️', event: '🎉', other: '💬',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getZodiacSign(birthday) {
  if (!birthday) return null;
  const [, m, d] = birthday.split('-').map(Number);
  const signs = [
    [1, 20, '♑ Capricorn'], [2, 19, '♒ Aquarius'], [3, 20, '♓ Pisces'],
    [4, 20, '♈ Aries'], [5, 21, '♉ Taurus'], [6, 21, '♊ Gemini'],
    [7, 23, '♋ Cancer'], [8, 23, '♌ Leo'], [9, 23, '♍ Virgo'],
    [10, 23, '♎ Libra'], [11, 22, '♏ Scorpio'], [12, 22, '♐ Sagittarius'],
    [12, 31, '♑ Capricorn'],
  ];
  for (const [sm, sd, name] of signs) {
    if (m < sm || (m === sm && d <= sd)) return name;
  }
  return null;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ contact, size = 80, onUpload }) {
  const fileRef = useRef();
  const initials = (() => {
    const cn = contact.chineseName || '';
    const en = contact.fullName || '';
    if (cn) return cn.slice(0, 2);
    const parts = en.trim().split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : en.slice(0, 2).toUpperCase();
  })();
  const tier = TIER_CONFIG[contact.tier] ?? TIER_CONFIG[3];
  const [hovering, setHovering] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('contactId', contact.id);
      const res = await fetch('/api/crm/upload-avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.avatarUrl) onUpload?.(data.avatarUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={() => fileRef.current?.click()}
        style={{
          width: size, height: size, borderRadius: '50%', cursor: 'pointer',
          overflow: 'hidden', position: 'relative',
          border: `3px solid ${tier.color}`, boxSizing: 'border-box',
        }}
      >
        {contact.avatarUrl ? (
          <img src={contact.avatarUrl} alt={contact.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: tier.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size * 0.3, fontWeight: 800, color: tier.color,
          }}>
            {initials}
          </div>
        )}
        {/* Hover overlay */}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hovering ? 1 : 0, transition: 'opacity 0.2s',
          fontSize: 20,
        }}>
          {uploading ? '⏳' : '📷'}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#888899', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {children}
      </h3>
      {action}
    </div>
  );
}

function AddButton({ onClick, label = '+ Add' }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: '1px dashed rgba(255,255,255,0.15)',
        borderRadius: 8, color: '#888899', cursor: 'pointer', padding: '6px 12px',
        fontSize: 12, fontWeight: 600, width: '100%', marginTop: 8,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff3366'; e.currentTarget.style.color = '#ff3366'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#888899'; }}
    >
      {label}
    </button>
  );
}

function DeleteBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer', color: '#555566',
        fontSize: 14, padding: '2px 6px', borderRadius: 4, transition: 'color 0.15s',
        opacity: 0, // revealed via group hover in parent
      }}
      className="delete-btn"
    >✕</button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CrmContactDetail({ initialContact }) {
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);

  // ── Contact method form ──
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethod, setNewMethod] = useState({ type: 'email', label: '', value: '' });

  // ── Background history form ──
  const [showAddHistory, setShowAddHistory] = useState(false);
  const [newHistory, setNewHistory] = useState({ category: 'work', organization: '', titleOrMajor: '', startDate: '', endDate: '', description: '' });

  // ── Interaction form ──
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [newInteraction, setNewInteraction] = useState({ date: new Date().toISOString().slice(0, 10), type: 'meeting', summary: '' });

  // ── Relation form ──
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [relationSearch, setRelationSearch] = useState('');
  const [relationLabel, setRelationLabel] = useState('');

  // ── Notes auto-save ──
  const [notes, setNotes] = useState(contact.notes || '');

  // ── Tier cycle ──
  const cycleTier = async () => {
    const next = (contact.tier + 1) % 4;
    setContact(c => ({ ...c, tier: next }));
    await updateContact(contact.id, { ...contact, tier: next });
  };

  // ── Avatar upload ──
  const handleAvatarUpload = (url) => {
    setContact(c => ({ ...c, avatarUrl: url + '?t=' + Date.now() }));
  };

  // ── Add contact method ──
  const handleAddMethod = async () => {
    if (!newMethod.value.trim()) return;
    const method = await createContactMethod({ contactId: contact.id, ...newMethod });
    setContact(c => ({ ...c, contactMethods: [...(c.contactMethods || []), method] }));
    setNewMethod({ type: 'email', label: '', value: '' });
    setShowAddMethod(false);
  };

  const handleDeleteMethod = async (id) => {
    await deleteContactMethod(id, contact.id);
    setContact(c => ({ ...c, contactMethods: c.contactMethods.filter(m => m.id !== id) }));
  };

  // ── Add history ──
  const handleAddHistory = async () => {
    if (!newHistory.organization.trim()) return;
    const entry = await createBackgroundHistory({ contactId: contact.id, ...newHistory });
    setContact(c => ({ ...c, backgroundHistory: [entry, ...(c.backgroundHistory || [])] }));
    setNewHistory({ category: 'work', organization: '', titleOrMajor: '', startDate: '', endDate: '', description: '' });
    setShowAddHistory(false);
  };

  const handleDeleteHistory = async (id) => {
    await deleteBackgroundHistory(id, contact.id);
    setContact(c => ({ ...c, backgroundHistory: c.backgroundHistory.filter(h => h.id !== id) }));
  };

  // ── Add interaction ──
  const handleAddInteraction = async () => {
    if (!newInteraction.summary.trim()) return;
    const interaction = await createInteraction({ contactId: contact.id, ...newInteraction });
    setContact(c => ({ ...c, interactions: [interaction, ...(c.interactions || [])] }));
    setNewInteraction({ date: new Date().toISOString().slice(0, 10), type: 'meeting', summary: '' });
    setShowAddInteraction(false);
  };

  const handleDeleteInteraction = async (id) => {
    await deleteInteraction(id, contact.id);
    setContact(c => ({ ...c, interactions: c.interactions.filter(i => i.id !== id) }));
  };

  // ── Add relation ──
  const handleAddRelation = async (toContact, label) => {
    await addContactRelation(contact.id, toContact.id, label);
    // Refresh relation display — optimistic add to relatedTo
    const newRel = { id: `temp_${Date.now()}`, toId: toContact.id, label, to: toContact };
    setContact(c => ({ ...c, relatedTo: [...(c.relatedTo || []), newRel] }));
    setShowAddRelation(false);
    setRelationSearch('');
    setRelationLabel('');
  };

  const handleDeleteRelation = async (rel) => {
    await removeContactRelation(rel.id, contact.id);
    setContact(c => ({
      ...c,
      relatedTo: c.relatedTo.filter(r => r.id !== rel.id),
      relatedFrom: c.relatedFrom.filter(r => r.id !== rel.id),
    }));
  };

  // ── Notes save (called on blur from Tiptap, or debounced from textarea) ──
  const handleNotesChange = useCallback((val) => {
    setNotes(val);
    // Save immediately since Tiptap fires this on blur
    updateContactNotes(contact.id, val);
  }, [contact.id]);

  // ── Delete contact ──
  const handleDelete = async () => {
    if (!confirm(`Delete ${contact.fullName}? This cannot be undone.`)) return;
    await deleteContact(contact.id);
    router.push('/crm');
  };

  // ── Edit saved ──
  const handleEditSaved = (updated) => {
    setContact(c => ({ ...c, ...updated }));
    setShowEditModal(false);
  };

  const tier = TIER_CONFIG[contact.tier] ?? TIER_CONFIG[3];

  // ── All relations (both directions) ──
  const allRelations = [
    ...(contact.relatedTo || []).map(r => ({ ...r, person: r.to, direction: 'to' })),
    ...(contact.relatedFrom || []).map(r => ({ ...r, person: r.from, direction: 'from' })),
  ];

  const workHistory = (contact.backgroundHistory || []).filter(h => h.category === 'work');
  const educationHistory = (contact.backgroundHistory || []).filter(h => h.category === 'education');

  const TABS = [
    { key: 'overview', label: '📋 Overview' },
    { key: 'background', label: '💼 Background' },
    { key: 'network', label: `🤝 Network${allRelations.length ? ` (${allRelations.length})` : ''}` },
    { key: 'interactions', label: `📅 Interactions${contact.interactions?.length ? ` (${contact.interactions.length})` : ''}` },
    { key: 'notes', label: '📝 Notes' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#888899' }}>
        <Link href="/crm" style={{ color: '#888899', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#ff3366'}
          onMouseLeave={e => e.currentTarget.style.color = '#888899'}
        >
          🤝 Network CRM
        </Link>
        <span>›</span>
        <span style={{ color: '#f0f0f0' }}>
          {contact.chineseName || contact.fullName}
        </span>
      </div>

      {/* Main two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ──────────── LEFT COLUMN ──────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Identity card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 20, padding: 24, position: 'relative', overflow: 'hidden',
          }}>
            {/* Tier color strip */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: `linear-gradient(90deg, ${tier.color}66, ${tier.color})`,
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 8 }}>
              <Avatar contact={contact} size={88} onUpload={handleAvatarUpload} />

              <div style={{ textAlign: 'center' }}>
                {contact.chineseName && (
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f0', lineHeight: 1.2 }}>{contact.chineseName}</div>
                )}
                <div style={{ fontSize: contact.chineseName ? 14 : 22, fontWeight: contact.chineseName ? 400 : 800, color: contact.chineseName ? '#888899' : '#f0f0f0' }}>
                  {contact.fullName}
                </div>
                {contact.displayName && (
                  <div style={{ fontSize: 12, color: '#666677', marginTop: 4, fontStyle: 'italic' }}>「{contact.displayName}」</div>
                )}
              </div>

              {/* Tier badge — clickable to cycle */}
              <button
                onClick={cycleTier}
                title="Click to change tier"
                style={{
                  padding: '5px 16px', borderRadius: 20, border: `1px solid ${tier.color}`,
                  background: tier.bg, color: tier.color, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {tier.label}
              </button>
            </div>
          </div>

          {/* Contact methods */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: 18,
          }}>
            <SectionTitle>Contact Methods</SectionTitle>

            {(contact.contactMethods || []).length === 0 && !showAddMethod && (
              <div style={{ fontSize: 12, color: '#555566', textAlign: 'center', padding: '8px 0' }}>No contact methods yet</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(contact.contactMethods || []).map(m => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    borderRadius: 10, background: 'rgba(255,255,255,0.03)',
                    transition: 'background 0.15s', cursor: 'default',
                  }}
                  className="method-row group"
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{METHOD_ICONS[m.type] || '🌐'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {m.label && <div style={{ fontSize: 10, color: '#666677', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>}
                    <div style={{ fontSize: 12, color: '#d0d0d8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.value}
                    </div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(m.value)}
                    title="Copy"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', color: '#888899' }}
                  >📋</button>
                  <button
                    onClick={() => handleDeleteMethod(m.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', color: '#555566' }}
                  >✕</button>
                </div>
              ))}

              {/* Add method form */}
              {showAddMethod && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={newMethod.type}
                      onChange={e => setNewMethod(m => ({ ...m, type: e.target.value }))}
                      style={selectStyle}
                    >
                      {METHOD_TYPES.map(t => <option key={t} value={t}>{METHOD_ICONS[t]} {t}</option>)}
                    </select>
                    <input
                      placeholder="Label (opt.)"
                      value={newMethod.label}
                      onChange={e => setNewMethod(m => ({ ...m, label: e.target.value }))}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  </div>
                  <input
                    placeholder="Value (email/username/number…)"
                    value={newMethod.value}
                    onChange={e => setNewMethod(m => ({ ...m, value: e.target.value }))}
                    style={inputStyle}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowAddMethod(false)} style={cancelBtnStyle}>Cancel</button>
                    <button onClick={handleAddMethod} style={saveBtnStyle}>Add</button>
                  </div>
                </div>
              )}
            </div>

            {!showAddMethod && <AddButton onClick={() => setShowAddMethod(true)} label="+ Add Contact Method" />}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                flex: 1, padding: '9px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                color: '#d0d0d8', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff3366'; e.currentTarget.style.color = '#ff3366'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#d0d0d8'; }}
            >
              ✏️ Edit Info
            </button>
            <button
              onClick={handleDelete}
              style={{
                flex: 1, padding: '9px', borderRadius: 10,
                border: '1px solid rgba(255,51,102,0.2)', background: 'rgba(255,51,102,0.06)',
                color: '#ff6688', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,51,102,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,51,102,0.06)'}
            >
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* ──────────── RIGHT COLUMN ──────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20, padding: 24, minHeight: 500,
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  borderRadius: '8px 8px 0 0', transition: 'all 0.15s',
                  background: activeTab === tab.key ? 'rgba(255,51,102,0.12)' : 'transparent',
                  color: activeTab === tab.key ? '#ff3366' : '#888899',
                  borderBottom: activeTab === tab.key ? '2px solid #ff3366' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Overview ── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Core info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['♂♀ Gender', contact.gender ? contact.gender.replace(/_/g, ' ') : null],
                  ['💍 Relationship', contact.relationshipStatus ? contact.relationshipStatus.replace(/_/g, ' ') : null],
                  ['💼 Occupation', contact.occupation],
                  ['🌍 Nation', contact.nation],
                  ['🏙️ City', contact.city],
                  ['🎂 Birthday', contact.birthday ? formatDateDisplay(contact.birthday) : null],
                  ['⭐ Zodiac', getZodiacSign(contact.birthday)],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#666677', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 13, color: '#f0f0f0', fontWeight: 500, textTransform: label === '♂♀ Gender' || label === '💍 Relationship' ? 'capitalize' : 'none' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {(() => {
                const tags = (() => { try { return contact.tags ? JSON.parse(contact.tags) : []; } catch { return []; } })();
                return tags.length > 0 ? (
                  <div style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#666677', marginBottom: 8 }}>🏷️ Tags</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tags.map(tag => (
                        <span key={tag} style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: 'rgba(255,51,102,0.12)', border: '1px solid rgba(255,51,102,0.25)', color: '#ff6688',
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {!contact.birthday && !contact.city && !contact.nation && !contact.occupation && !contact.gender && (
                <div style={{ textAlign: 'center', color: '#555566', fontSize: 13, padding: '32px 0' }}>
                  No overview data yet. Click <strong style={{ color: '#888899' }}>✏️ Edit Info</strong> to add details.
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Background ── */}
          {activeTab === 'background' && (
            <div>
              {['work', 'education'].map(cat => {
                const items = cat === 'work' ? workHistory : educationHistory;
                return (
                  <div key={cat} style={{ marginBottom: 28 }}>
                    <SectionTitle>{cat === 'work' ? '💼 Work Experience' : '🎓 Education'}</SectionTitle>
                    {items.length === 0 ? (
                      <div style={{ fontSize: 12, color: '#555566', padding: '8px 0' }}>No {cat} history added yet</div>
                    ) : (
                      <div style={{ position: 'relative', paddingLeft: 20 }}>
                        {/* Timeline line */}
                        <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'rgba(255,255,255,0.08)' }} />
                        {items.map((h, idx) => (
                          <div key={h.id} style={{ position: 'relative', marginBottom: 20 }}>
                            {/* Dot */}
                            <div style={{
                              position: 'absolute', left: -17, top: 6, width: 10, height: 10,
                              borderRadius: '50%', background: cat === 'work' ? '#ff8c42' : '#4ecdc4',
                              border: '2px solid #14141e',
                            }} />
                            <div style={{
                              padding: '12px 14px', background: 'rgba(255,255,255,0.03)',
                              borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)',
                            }}
                              className="group"
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f0f0f0' }}>{h.organization}</div>
                                  {h.titleOrMajor && <div style={{ fontSize: 12, color: '#888899', marginTop: 2 }}>{h.titleOrMajor}</div>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  <div style={{ fontSize: 11, color: '#666677', whiteSpace: 'nowrap' }}>
                                    {h.startDate || '?'} — {h.endDate || 'Present'}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteHistory(h.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555566', fontSize: 12, padding: '2px 4px' }}
                                  >✕</button>
                                </div>
                              </div>
                              {h.description && <div style={{ fontSize: 12, color: '#888899', marginTop: 8, lineHeight: 1.5 }}>{h.description}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add history form */}
              {showAddHistory ? (
                <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, color: '#888899' }}>Add Experience</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <select value={newHistory.category} onChange={e => setNewHistory(h => ({ ...h, category: e.target.value }))} style={selectStyle}>
                      <option value="work">💼 Work</option>
                      <option value="education">🎓 Education</option>
                    </select>
                    <input placeholder="Organization *" value={newHistory.organization} onChange={e => setNewHistory(h => ({ ...h, organization: e.target.value }))} style={{ ...inputStyle, flex: 2 }} />
                  </div>
                  <input placeholder="Title / Major" value={newHistory.titleOrMajor} onChange={e => setNewHistory(h => ({ ...h, titleOrMajor: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input placeholder="Start (YYYY or YYYY-MM)" value={newHistory.startDate} onChange={e => setNewHistory(h => ({ ...h, startDate: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                    <input placeholder="End (or 'present')" value={newHistory.endDate} onChange={e => setNewHistory(h => ({ ...h, endDate: e.target.value }))} style={{ ...inputStyle, flex: 1 }} />
                  </div>
                  <textarea placeholder="Description (optional)" value={newHistory.description} onChange={e => setNewHistory(h => ({ ...h, description: e.target.value }))}
                    rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowAddHistory(false)} style={cancelBtnStyle}>Cancel</button>
                    <button onClick={handleAddHistory} style={saveBtnStyle}>Add</button>
                  </div>
                </div>
              ) : (
                <AddButton onClick={() => setShowAddHistory(true)} label="+ Add Experience" />
              )}
            </div>
          )}

          {/* ── Tab: Network ── */}
          {activeTab === 'network' && (
            <div>
              <SectionTitle>Social Network</SectionTitle>
              {allRelations.length === 0 && !showAddRelation && (
                <div style={{ textAlign: 'center', color: '#555566', fontSize: 13, padding: '24px 0' }}>
                  No connections linked yet.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {allRelations.map(rel => {
                  const p = rel.person;
                  const relTier = TIER_CONFIG[p.tier] ?? TIER_CONFIG[3];
                  return (
                    <div key={rel.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}>
                      {/* Mini avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        background: relTier.bg, border: `2px solid ${relTier.color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color: relTier.color,
                      }}>
                        {(p.chineseName || p.fullName || '?').slice(0, 2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Link href={`/crm/${p.id}`} style={{
                          fontWeight: 600, fontSize: 14, color: '#f0f0f0', textDecoration: 'none',
                          transition: 'color 0.15s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ff3366'}
                          onMouseLeave={e => e.currentTarget.style.color = '#f0f0f0'}
                        >
                          {p.chineseName ? `${p.chineseName} (${p.fullName})` : p.fullName}
                        </Link>
                        {rel.label && <div style={{ fontSize: 11, color: '#888899' }}>{rel.label}</div>}
                      </div>
                      <button onClick={() => handleDeleteRelation(rel)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555566', fontSize: 12 }}>✕</button>
                    </div>
                  );
                })}
              </div>

              {/* Add relation */}
              {showAddRelation ? (
                <RelationPicker
                  contactId={contact.id}
                  onAdd={handleAddRelation}
                  onCancel={() => setShowAddRelation(false)}
                />
              ) : (
                <AddButton onClick={() => setShowAddRelation(true)} label="+ Link Contact" />
              )}
            </div>
          )}

          {/* ── Tab: Interactions ── */}
          {activeTab === 'interactions' && (
            <div>
              <SectionTitle>Interaction Log</SectionTitle>

              {(contact.interactions || []).length === 0 && !showAddInteraction && (
                <div style={{ textAlign: 'center', color: '#555566', fontSize: 13, padding: '24px 0' }}>
                  No interactions logged yet.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {(contact.interactions || []).map(i => (
                  <div key={i.id} style={{
                    display: 'flex', gap: 12, padding: '12px 14px',
                    background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ fontSize: 22, flexShrink: 0 }}>{INTERACTION_ICONS[i.type] || '💬'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 12, color: '#888899' }}>
                          {formatDateDisplay(i.date)}
                          {i.type && <span style={{ marginLeft: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#666677' }}>{i.type}</span>}
                        </div>
                        <button onClick={() => handleDeleteInteraction(i.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555566', fontSize: 12 }}>✕</button>
                      </div>
                      <div style={{ fontSize: 13, color: '#d0d0d8', marginTop: 4, lineHeight: 1.5 }}>{i.summary}</div>
                    </div>
                  </div>
                ))}
              </div>

              {showAddInteraction ? (
                <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input type="date" value={newInteraction.date} onChange={e => setNewInteraction(i => ({ ...i, date: e.target.value }))} style={{ ...inputStyle, flex: 1, colorScheme: 'dark' }} />
                    <select value={newInteraction.type} onChange={e => setNewInteraction(i => ({ ...i, type: e.target.value }))} style={selectStyle}>
                      {INTERACTION_TYPES.map(t => <option key={t} value={t}>{INTERACTION_ICONS[t]} {t}</option>)}
                    </select>
                  </div>
                  <textarea
                    placeholder="What happened? Key takeaways…"
                    value={newInteraction.summary}
                    onChange={e => setNewInteraction(i => ({ ...i, summary: e.target.value }))}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', marginBottom: 8 }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowAddInteraction(false)} style={cancelBtnStyle}>Cancel</button>
                    <button onClick={handleAddInteraction} style={saveBtnStyle}>Log Interaction</button>
                  </div>
                </div>
              ) : (
                <AddButton onClick={() => setShowAddInteraction(true)} label="+ Log Interaction" />
              )}
            </div>
          )}

          {/* ── Tab: Notes ── */}
          {activeTab === 'notes' && (
            <div>
              <SectionTitle>Personal Notes</SectionTitle>
              <CrmNotes initialNote={notes} onSave={handleNotesChange} />
              <div style={{ fontSize: 11, color: '#444455', marginTop: 8, textAlign: 'right' }}>Markdown · Auto-saves on blur</div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <CrmContactModal
          initialData={contact}
          onClose={() => setShowEditModal(false)}
          onCreated={handleEditSaved}
        />
      )}
    </div>
  );
}

// ─── Relation Picker Sub-component ────────────────────────────────────────────
function RelationPicker({ contactId, onAdd, onCancel }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState('');
  const [selected, setSelected] = useState(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      // Use client-side search via fetch to avoid importing server action directly in picker
      const res = await fetch(`/api/crm/search?q=${encodeURIComponent(q)}&exclude=${contactId}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  const handleQueryChange = (val) => {
    setQuery(val);
    clearTimeout(window._relSearch);
    window._relSearch = setTimeout(() => search(val), 300);
  };

  return (
    <div style={{ padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
      {!selected ? (
        <>
          <input
            autoFocus
            placeholder="Search contacts by name…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          {loading && <div style={{ fontSize: 12, color: '#888899' }}>Searching…</div>}
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {results.map(c => (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ fontSize: 13, color: '#f0f0f0', fontWeight: 600 }}>
                  {c.chineseName ? `${c.chineseName} (${c.fullName})` : c.fullName}
                </div>
              </div>
            ))}
            {!loading && query && results.length === 0 && (
              <div style={{ fontSize: 12, color: '#555566', padding: '8px 0' }}>No contacts found.</div>
            )}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#f0f0f0', marginBottom: 10 }}>
            Link with <strong>{selected.chineseName || selected.fullName}</strong>
          </div>
          <input
            placeholder="Relationship label (e.g. 同学, former colleague)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setSelected(null)} style={cancelBtnStyle}>← Back</button>
            <button onClick={() => onAdd(selected, label)} style={saveBtnStyle}>Link</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Shared Inline Styles ─────────────────────────────────────────────────────
const inputStyle = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, color: '#f0f0f0', fontSize: 12, padding: '7px 10px',
  outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
};

const selectStyle = {
  ...{
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: '#f0f0f0', fontSize: 12, padding: '7px 10px',
    outline: 'none', cursor: 'pointer', colorScheme: 'dark', fontFamily: 'inherit',
  },
};

const cancelBtnStyle = {
  flex: 1, padding: '7px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent', color: '#888899', cursor: 'pointer', fontSize: 12, fontWeight: 600,
};

const saveBtnStyle = {
  flex: 2, padding: '7px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #ff3366, #ff6b8a)',
  color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700,
};

// ─── CrmNotes ─ Dark-mode Tiptap Markdown Editor ────────────────────────────────
function CrmNotes({ initialNote, onSave }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Markdown,
      Placeholder.configure({
        placeholder: 'Record impressions, preferences, context, how you know them… (Markdown supported)',
        emptyEditorClass: 'crm-is-empty',
      }),
    ],
    content: initialNote || '',
    editorProps: {
      attributes: {
        class: 'crm-notes-editor',
      },
    },
    onBlur: ({ editor }) => {
      const markdown = editor.storage.markdown.getMarkdown();
      if (markdown !== initialNote) {
        onSave(markdown);
      }
    },
  });

  useEffect(() => {
    if (editor && initialNote !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(initialNote || '');
    }
  }, [initialNote, editor]);

  return (
    <>
      <style>{`
        .crm-notes-editor {
          min-height: 280px;
          color: #d0d0e0;
          font-size: 14px;
          line-height: 1.75;
          padding: 14px;
          outline: none;
          font-family: inherit;
        }
        .crm-notes-editor p { margin: 0.4em 0; }
        .crm-notes-editor h1 { font-size: 1.4em; font-weight: 700; color: #f0f0f0; margin: 0.8em 0 0.4em; }
        .crm-notes-editor h2 { font-size: 1.2em; font-weight: 700; color: #f0f0f0; margin: 0.7em 0 0.3em; }
        .crm-notes-editor h3 { font-size: 1.05em; font-weight: 600; color: #e0e0ee; margin: 0.6em 0 0.3em; }
        .crm-notes-editor strong { color: #ffffff; font-weight: 700; }
        .crm-notes-editor em { color: #b0b0cc; }
        .crm-notes-editor code { background: rgba(255,255,255,0.1); border-radius: 4px; padding: 0.1em 0.4em; font-size: 0.9em; color: #4ecdc4; font-family: monospace; }
        .crm-notes-editor pre { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; margin: 8px 0; overflow-x: auto; }
        .crm-notes-editor pre code { background: none; padding: 0; color: #d0d0e0; }
        .crm-notes-editor ul { list-style: disc; padding-left: 1.4em; margin: 0.4em 0; }
        .crm-notes-editor ol { list-style: decimal; padding-left: 1.4em; margin: 0.4em 0; }
        .crm-notes-editor li { margin: 0.2em 0; }
        .crm-notes-editor blockquote { border-left: 3px solid rgba(255,51,102,0.5); padding-left: 1em; margin: 0.6em 0; color: #888899; font-style: italic; }
        .crm-notes-editor a { color: #4ecdc4; text-decoration: underline; }
        .crm-notes-editor hr { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 1em 0; }
        .crm-is-empty::before { color: #444455; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
      `}</style>
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, transition: 'border-color 0.2s', cursor: 'text',
      }}
        onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,51,102,0.4)'}
        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
      >
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
