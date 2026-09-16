'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSettings } from '../lib/SettingsContext';
import CrmAvatar from './CrmAvatar';
import { createContact } from '@/app/crm/serverActions';
import CrmContactModal from './CrmContactModal';

const METHOD_ICONS = {
  email: '✉️', phone: '📞', wechat: '💬', linkedin: '🔗',
  twitter: '🐦', github: '⌨️', scholar: '🎓', other: '🌐',
};

// ─── Tier Badge ───────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const { settings: { crmTiers } } = useSettings();
  const t = crmTiers[tier] ?? crmTiers[3];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: t.bg, color: t.color, border: `1px solid ${t.color}`,
      letterSpacing: '0.5px', whiteSpace: 'nowrap',
    }}>
      {t.label}
    </span>
  );
}

// ─── Compact List Row ─────────────────────────────────────────────────────────
function ListRow({ contact }) {
  const [hovering, setHovering] = useState(false);
  const primaryOrg = contact.backgroundHistory?.[0];
  const primaryMethods = (contact.contactMethods || []).slice(0, 3);

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px',
        borderRadius: 12, transition: 'all 0.2s',
        background: hovering ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <CrmAvatar contact={contact} size={40} />

      {/* Name block */}
      <div style={{ minWidth: 0, flex: '0 0 220px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {contact.chineseName && (
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-main)' }}>{contact.chineseName}</span>
          )}
          <span style={{
            fontWeight: contact.chineseName ? 400 : 700,
            fontSize: 14,
            color: contact.chineseName ? 'var(--color-text-muted)' : 'var(--color-text-main)',
          }}>
            {contact.chineseName ? `(${contact.fullName})` : contact.fullName}
          </span>
          {contact.displayName && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              「{contact.displayName}」
            </span>
          )}
        </div>
        {primaryOrg && (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {primaryOrg.titleOrMajor && `${primaryOrg.titleOrMajor} @ `}{primaryOrg.organization}
          </div>
        )}
      </div>

      <TierBadge tier={contact.tier} />

      {/* Contact method quick icons */}
      <div style={{ display: 'flex', gap: 6, flex: 1, opacity: hovering ? 1 : 0.4, transition: 'opacity 0.2s' }}>
        {primaryMethods.map(m => (
          <button
            key={m.id}
            title={`${m.type}: ${m.value}`}
            onClick={() => navigator.clipboard.writeText(m.value)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 15, padding: '2px 4px', borderRadius: 6,
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {METHOD_ICONS[m.type] || '🌐'}
          </button>
        ))}
      </div>

      {/* Enter detail */}
      <Link
        href={`/crm/${contact.id}`}
        style={{
          fontSize: 12, color: hovering ? 'var(--color-accent)' : '#555566',
          textDecoration: 'none', padding: '4px 10px', borderRadius: 8,
          border: `1px solid ${hovering ? 'var(--color-accent)' : 'transparent'}`,
          transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        View →
      </Link>
    </div>
  );
}

// ─── Card Wall Card ───────────────────────────────────────────────────────────
function ContactCard({ contact }) {
  const [hovering, setHovering] = useState(false);
  const primaryOrg = contact.backgroundHistory?.[0];
  const primaryMethods = (contact.contactMethods || []).slice(0, 3);
  const { settings: { crmTiers } } = useSettings();
  const tier = crmTiers[contact.tier] ?? crmTiers[3];

  return (
    <Link href={`/crm/${contact.id}`} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        style={{
          background: 'var(--color-bg-panel)',
          border: `1px solid ${hovering ? tier.color : 'rgba(255,255,255,0.06)'}`,
          borderRadius: 16, padding: '20px 16px', cursor: 'pointer',
          transition: 'all 0.25s',
          transform: hovering ? 'translateY(-3px)' : 'none',
          boxShadow: hovering ? `0 12px 40px rgba(0,0,0,0.4), 0 0 20px ${tier.color}22` : '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Tier glow strip */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${tier.color}88, ${tier.color})`,
          opacity: hovering ? 1 : 0.5, transition: 'opacity 0.25s',
        }} />

        <CrmAvatar contact={contact} size={70} />

        <div>
          {contact.chineseName && (
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text-main)' }}>{contact.chineseName}</div>
          )}
          <div style={{
            fontSize: contact.chineseName ? 12 : 14,
            fontWeight: contact.chineseName ? 400 : 700,
            color: contact.chineseName ? 'var(--color-text-muted)' : 'var(--color-text-main)',
          }}>
            {contact.fullName}
          </div>
          {contact.displayName && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: 2 }}>「{contact.displayName}」</div>
          )}
        </div>

        <TierBadge tier={contact.tier} />

        {primaryOrg && (
          <div style={{
            fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4, maxWidth: '100%',
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {primaryOrg.titleOrMajor && `${primaryOrg.titleOrMajor} · `}{primaryOrg.organization}
          </div>
        )}

        {/* Contact method icons */}
        {primaryMethods.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            {primaryMethods.map(m => (
              <span key={m.id} title={`${m.type}: ${m.value}`} style={{ fontSize: 14 }}>
                {METHOD_ICONS[m.type] || '🌐'}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ contacts }) {
  const total = contacts.length;
  const byCounts = [0, 1, 2, 3].map(t => ({
    tier: t,
    count: contacts.filter(c => c.tier === t).length,
  }));

  const { settings: { crmTiers } } = useSettings();
  
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      padding: '14px 20px', borderRadius: 14,
      background: 'var(--color-bg-panel)', border: '1px solid rgba(255,255,255,0.06)',
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-main)', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>contacts</span>
      </div>
      <div style={{ width: 1, height: 32, background: 'var(--color-glass-bg)' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        {byCounts.map(({ tier, count }) => {
          const t = crmTiers[tier];
          return (
            <div key={tier} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              borderRadius: 20, background: t.bg, border: `1px solid ${t.color}44`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.color }}>{t.label}</span>
              <span style={{
                fontSize: 18, fontWeight: 800, color: t.color, lineHeight: 1,
                minWidth: 20, textAlign: 'center',
              }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── A-Z Nav ──────────────────────────────────────────────────────────────────
function AlphaNav({ letters, onJump }) {
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 12,
    }}>
      {allLetters.map(l => (
        <button
          key={l}
          onClick={() => letters.has(l) && onJump(l)}
          style={{
            width: 26, height: 26, borderRadius: 6, border: 'none', cursor: letters.has(l) ? 'pointer' : 'default',
            background: letters.has(l) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
            color: letters.has(l) ? 'var(--color-accent)' : '#444455',
            fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
          }}
          onMouseEnter={e => letters.has(l) && (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          onMouseLeave={e => letters.has(l) && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CrmDirectory({ initialContacts }) {
  const { settings: { crmTiers } } = useSettings();
  const [contacts, setContacts] = useState(initialContacts || []);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [view, setView] = useState('list'); // 'list' | 'grid'
  const [showModal, setShowModal] = useState(false);
  const letterRefs = useRef({});

  const filtered = useMemo(() => {
    let result = contacts.filter(c => c.status === 'active');
    if (tierFilter !== 'all') result = result.filter(c => c.tier === Number(tierFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(c =>
        c.fullName?.toLowerCase().includes(q) ||
        c.chineseName?.toLowerCase().includes(q) ||
        c.displayName?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.backgroundHistory?.some(h => h.organization?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [contacts, search, tierFilter]);

  // Group by first letter (use fullName for sorting)
  const grouped = useMemo(() => {
    const map = {};
    for (const c of filtered) {
      const letter = (c.fullName || c.chineseName || '?')[0].toUpperCase();
      const key = /[A-Z]/.test(letter) ? letter : '#';
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const existingLetters = useMemo(
    () => new Set(grouped.map(([l]) => l).filter(l => l !== '#')),
    [grouped]
  );

  const jumpToLetter = useCallback((letter) => {
    letterRefs.current[letter]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleContactCreated = (newContact) => {
    setContacts(prev => [newContact, ...prev]);
    setShowModal(false);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text-main)', margin: 0, letterSpacing: '-0.5px' }}>
          Network CRM
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Your personal relationship network · Tier 0–3 同心圆管理
        </p>
      </div>

      {/* Stats Bar */}
      <StatsBar contacts={contacts.filter(c => c.status === 'active')} />

      {/* Controls */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-muted)' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, org, city…"
            style={{
              width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, color: 'var(--color-text-main)', fontSize: 13, padding: '9px 12px 9px 34px',
              outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--color-accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-glass-bg)'}
          />
        </div>

        {/* Tier filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', '0', '1', '2', '3'].map(t => {
            const active = tierFilter === t;
            const config = t === 'all' ? null : crmTiers[Number(t)];
            return (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                style={{
                  padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
                  background: active
                    ? (config ? config.bg : 'rgba(255,255,255,0.1)')
                    : 'rgba(255,255,255,0.04)',
                  color: active
                    ? (config ? config.color : 'var(--color-text-main)')
                    : '#666677',
                  border: active
                    ? `1px solid ${config ? config.color : 'rgba(255,255,255,0.2)'}`
                    : '1px solid transparent',
                }}
              >
                {t === 'all' ? 'All' : `T${t}`}
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, gap: 2 }}>
          {[['list', '≡ List'], ['grid', '⊞ Grid']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                background: view === v ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: view === v ? 'var(--color-accent)' : '#666677',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* New contact button */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'var(--color-accent)',
            color: '#fff', fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
          <span style={{ fontSize: 16 }}>+</span> New Contact
        </button>
      </div>

      {/* A-Z Nav — list view only */}
      {view === 'list' && (
        <AlphaNav letters={existingLetters} onJump={jumpToLetter} />
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 20px', color: 'var(--color-text-muted)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No contacts found</div>
          <div style={{ fontSize: 13 }}>Try adjusting your search or filters.</div>
        </div>
      ) : view === 'list' ? (
        /* ── Compact List ── */
        <div style={{
          background: 'var(--color-glass-bg)', border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: 16, overflow: 'hidden',
        }}>
          {grouped.map(([letter, group]) => (
            <div key={letter} ref={el => letterRefs.current[letter] = el}>
              {/* Letter divider */}
              <div style={{
                padding: '6px 16px', fontSize: 11, fontWeight: 800, color: 'var(--color-accent)',
                letterSpacing: '1.5px', background: 'var(--color-glass-bg)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                {letter}
              </div>
              {group.map(c => <ListRow key={c.id} contact={c} />)}
            </div>
          ))}
        </div>
      ) : (
        /* ── Card Wall Grid ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 14,
        }}>
          {filtered.map(c => <ContactCard key={c.id} contact={c} />)}
        </div>
      )}

      {/* Results count */}
      {filtered.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--color-text-muted)' }}>
          Showing {filtered.length} of {contacts.filter(c => c.status === 'active').length} contacts
        </div>
      )}

      {/* New Contact Modal */}
      {showModal && (
        <CrmContactModal
          onClose={() => setShowModal(false)}
          onCreated={handleContactCreated}
        />
      )}
    </div>
  );
}
