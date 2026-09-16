import React, { useMemo, useRef, useState } from 'react';
import { useSettings } from '@/lib/SettingsContext';

export default function CrmAvatar({ contact, size = 40, onUpload }) {
  const fileRef = useRef();
  
  const initials = useMemo(() => {
    const cn = contact.chineseName || '';
    const en = contact.fullName || '';
    if (cn) return cn.slice(0, 2);
    const parts = en.trim().split(' ');
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : en.slice(0, 2).toUpperCase();
  }, [contact]);

  const { settings: { crmTiers } } = useSettings();
  const tier = crmTiers[contact.tier] ?? crmTiers[3];
  
  const [hovering, setHovering] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fontSize = size <= 36 ? size * 0.38 : size * 0.35;

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

  if (!onUpload) {
    if (contact.avatarUrl) {
      return (
        <img
          src={contact.avatarUrl}
          alt={contact.fullName}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
        />
      );
    }
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: tier.bg, border: `2px solid ${tier.color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize, fontWeight: 700, color: tier.color, letterSpacing: '-0.5px',
        textTransform: 'uppercase', boxSizing: 'border-box'
      }}>
        {initials}
      </div>
    );
  }

  // Editable version
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
        
        {hovering && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 12, fontWeight: 600,
            backdropFilter: 'blur(2px)'
          }}>
            {uploading ? '...' : 'Upload'}
          </div>
        )}
      </div>
      <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}
