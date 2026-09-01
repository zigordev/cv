import React from 'react';

const SIZES = { sm: 28, md: 40, lg: 68 };

export function Avatar({ name, src, size = 'md', className = '', style }) {
  const px = SIZES[size] ?? size;
  const initials = (name || '?').trim().slice(0, 1).toUpperCase();
  return (
    <span
      className={`ds-avatar ${className}`.trim()}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        width: px, height: px, borderRadius: '50%', background: 'var(--ds-color-accent)',
        color: 'var(--ds-color-accent-fg)', fontFamily: 'var(--ds-font-sans)', fontWeight: 'var(--ds-weight-bold)',
        fontSize: px * 0.42, flexShrink: 0, ...style,
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : initials}
    </span>
  );
}
