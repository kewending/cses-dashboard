'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSettings } from '@/lib/SettingsContext';
import CrmAvatar from './CrmAvatar';
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

function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
        borderRadius: 8, color: 'var(--color-text-muted)', cursor: 'pointer', padding: '6px 12px',
        fontSize: 12, fontWeight: 600, width: '100%', marginTop: 8,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
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
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
        fontSize: 14, padding: '2px 6px', borderRadius: 4, transition: 'color 0.15s',
        opacity: 0, // revealed via group hover in parent
      }}
      className="delete-btn"
    >✕</button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CrmContactDetail({ initialContact }) {
  const { settings: { crmTiers } } = useSettings();
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

  const tier = crmTiers[contact.tier] ?? crmTiers[3];

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
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
        <Link href="/crm" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
        >
          🤝 Network CRM
        </Link>
        <span>›</span>
        <span style={{ color: 'var(--color-text-main)' }}>
          {contact.chineseName || contact.fullName}
        </span>
      </div>

      {/* Main two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ──────────── LEFT COLUMN ──────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Identity card */}
          <div style={{
            background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)',
            borderRadius: 20, padding: 24, position: 'relative', overflow: 'hidden',
          }}>
            {/* Tier color strip */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 4,
              background: `linear-gradient(90deg, ${tier.color}66, ${tier.color})`,
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 8 }}>
              <CrmAvatar contact={contact} size={90} onUpload={handleAvatarUpload} />

              <div style={{ textAlign: 'center' }}>
                {contact.chineseName && (
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-main)', lineHeight: 1.2 }}>{contact.chineseName}</div>
                )}
                <div style={{ fontSize: contact.chineseName ? 14 : 22, fontWeight: contact.chineseName ? 400 : 800, color: contact.chineseName ? 'var(--color-text-muted)' : 'var(--color-text-main)' }}>
                  {contact.fullName}
                </div>
                {contact.displayName && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>「{contact.displayName}」</div>
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
            background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)',
            borderRadius: 16, padding: 18,
          }}>
            <SectionTitle>Contact Methods</SectionTitle>

            {(contact.contactMethods || []).length === 0 && !showAddMethod && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0' }}>No contact methods yet</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(contact.contactMethods || []).map(m => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    borderRadius: 10, background: 'var(--color-bg-panel)',
                    transition: 'background 0.15s', cursor: 'default',
                  }}
                  className="method-row group"
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{METHOD_ICONS[m.type] || '🌐'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {m.label && <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>}
                    <div style={{ fontSize: 12, color: 'var(--color-text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.value}
                    </div>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(m.value)}
                    title="Copy"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', color: 'var(--color-text-muted)' }}
                  >📋</button>
                  <button
                    onClick={() => handleDeleteMethod(m.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', color: 'var(--color-text-muted)' }}
                  >✕</button>
                </div>
              ))}

              {/* Add method form */}
              {showAddMethod && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, background: 'var(--color-bg-panel)', borderRadius: 10 }}>
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
                border: '1px solid var(--color-border)', background: 'transparent',
                color: 'var(--color-text-main)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#d0d0d8'; }}
            >
              ✏️ Edit Info
            </button>
            <button
              onClick={handleDelete}
              style={{
                flex: 1, padding: '9px', borderRadius: 10,
                border: '1px solid rgba(255,51,102,0.2)', background: 'rgba(255,51,102,0.06)',
                color: 'var(--color-accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
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
          background: 'var(--color-bg-panel)', border: '1px solid var(--color-border)',
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
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--color-accent)' : '2px solid transparent',
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
                  <div key={label} style={{ padding: '12px 14px', background: 'var(--color-bg-panel)', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-main)', fontWeight: 500, textTransform: label === '♂♀ Gender' || label === '💍 Relationship' ? 'capitalize' : 'none' }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {(() => {
                const tags = (() => { try { const parsed = contact.tags ? JSON.parse(contact.tags) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } })();
                return tags.length > 0 ? (
                  <div style={{ padding: '12px 14px', background: 'var(--color-bg-panel)', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>🏷️ Tags</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {tags.map(tag => (
                        <span key={tag} style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          background: 'var(--color-bg-panel-hover)', border: '1px solid var(--color-border)', color: 'var(--color-accent)',
                        }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {!contact.birthday && !contact.city && !contact.nation && !contact.occupation && !contact.gender && (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, padding: '32px 0' }}>
                  No overview data yet. Click <strong style={{ color: 'var(--color-text-muted)' }}>✏️ Edit Info</strong> to add details.
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
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>No {cat} history added yet</div>
                    ) : (
                      <div style={{ position: 'relative', paddingLeft: 20 }}>
                        {/* Timeline line */}
                        <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, background: 'var(--color-glass-bg)' }} />
                        {items.map((h, idx) => (
                          <div key={h.id} style={{ position: 'relative', marginBottom: 20 }}>
                            {/* Dot */}
                            <div style={{
                              position: 'absolute', left: -17, top: 6, width: 10, height: 10,
                              borderRadius: '50%', background: cat === 'work' ? '#ff8c42' : '#4ecdc4',
                              border: '2px solid #14141e',
                            }} />
                            <div style={{
                              padding: '12px 14px', background: 'var(--color-bg-panel)',
                              borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)',
                            }}
                              className="group"
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-main)' }}>{h.organization}</div>
                                  {h.titleOrMajor && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{h.titleOrMajor}</div>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                    {h.startDate || '?'} — {h.endDate || 'Present'}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteHistory(h.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, padding: '2px 4px' }}
                                  >✕</button>
                                </div>
                              </div>
                              {h.description && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.5 }}>{h.description}</div>}
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
                <div style={{ padding: 16, background: 'var(--color-bg-panel)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>Add Experience</div>
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
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, padding: '24px 0' }}>
                  No connections linked yet.
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {allRelations.map(rel => {
                  const p = rel.person;
                  const relTier = crmTiers[p.tier] ?? crmTiers[3];
                  return (
                    <div key={rel.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      background: 'var(--color-bg-panel)', borderRadius: 10,
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
                          fontWeight: 600, fontSize: 14, color: 'var(--color-text-main)', textDecoration: 'none',
                          transition: 'color 0.15s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-main)'}
                        >
                          {p.chineseName ? `${p.chineseName} (${p.fullName})` : p.fullName}
                        </Link>
                        {rel.label && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{rel.label}</div>}
                      </div>
                      <button onClick={() => handleDeleteRelation(rel)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12 }}>✕</button>
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
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, padding: '24px 0' }}>
                  No interactions logged yet.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                {(contact.interactions || []).map(i => (
                  <div key={i.id} style={{
                    display: 'flex', gap: 12, padding: '12px 14px',
                    background: 'var(--color-bg-panel)', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ fontSize: 22, flexShrink: 0 }}>{INTERACTION_ICONS[i.type] || '💬'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                          {formatDateDisplay(i.date)}
                          {i.type && <span style={{ marginLeft: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-muted)' }}>{i.type}</span>}
                        </div>
                        <button onClick={() => handleDeleteInteraction(i.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12 }}>✕</button>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-main)', marginTop: 4, lineHeight: 1.5 }}>{i.summary}</div>
                    </div>
                  </div>
                ))}
              </div>

              {showAddInteraction ? (
                <div style={{ padding: 16, background: 'var(--color-bg-panel)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
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
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8, textAlign: 'right' }}>Markdown · Auto-saves on blur</div>
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
    <div style={{ padding: 14, background: 'var(--color-bg-panel)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
      {!selected ? (
        <>
          <input
            autoFocus
            placeholder="Search contacts by name…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            style={{ ...inputStyle, marginBottom: 8 }}
          />
          {loading && <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Searching…</div>}
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
                <div style={{ fontSize: 13, color: 'var(--color-text-main)', fontWeight: 600 }}>
                  {c.chineseName ? `${c.chineseName} (${c.fullName})` : c.fullName}
                </div>
              </div>
            ))}
            {!loading && query && results.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: '8px 0' }}>No contacts found.</div>
            )}
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--color-text-main)', marginBottom: 10 }}>
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
  background: 'var(--color-bg-panel-hover)', border: '1px solid var(--color-border)',
  borderRadius: 8, color: 'var(--color-text-main)', fontSize: 12, padding: '7px 10px',
  outline: 'none', width: '100%', boxSizing: 'border-box',
  fontFamily: 'inherit', transition: 'border-color 0.2s',
};

const selectStyle = {
  ...{
    background: 'var(--color-bg-panel-hover)', border: '1px solid var(--color-border)',
    borderRadius: 8, color: 'var(--color-text-main)', fontSize: 12, padding: '7px 10px',
    outline: 'none', cursor: 'pointer', colorScheme: 'dark', fontFamily: 'inherit',
  },
};

const cancelBtnStyle = {
  flex: 1, padding: '7px', borderRadius: 8, border: '1px solid var(--color-border)',
  background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
};

const saveBtnStyle = {
  flex: 2, padding: '7px', borderRadius: 8, border: 'none',
  background: 'var(--color-accent)',
  color: '#fff',
  border: 'none', fontSize: 12, fontWeight: 700,
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
        .crm-notes-editor h1 { font-size: 1.4em; font-weight: 700; color: var(--color-text-main); margin: 0.8em 0 0.4em; }
        .crm-notes-editor h2 { font-size: 1.2em; font-weight: 700; color: var(--color-text-main); margin: 0.7em 0 0.3em; }
        .crm-notes-editor h3 { font-size: 1.05em; font-weight: 600; color: var(--color-text-main); margin: 0.6em 0 0.3em; }
        .crm-notes-editor strong { color: var(--color-text-main); font-weight: 700; }
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
        background: 'var(--color-bg-panel)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, transition: 'border-color 0.2s', cursor: 'text',
      }}
        onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,51,102,0.4)'}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--color-glass-bg)'}
      >
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
