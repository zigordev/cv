import React from 'react';

export function Card({ title, description, footer, children, interactive = false, className = '', style, ...props }) {
  return (
    <div
      className={`ds-card ${className}`.trim()}
      style={{
        background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)',
        borderRadius: 'var(--ds-radius-lg)', boxShadow: 'var(--ds-shadow-sm)', overflow: 'hidden',
        cursor: interactive ? 'pointer' : undefined,
        transition: interactive ? 'transform var(--ds-duration-base) var(--ds-ease-out), box-shadow var(--ds-duration-base) var(--ds-ease-out)' : undefined,
        fontFamily: 'var(--ds-font-sans)', ...style,
      }}
      {...props}
    >
      {(title || description) ? (
        <div style={{ padding: '18px 20px', borderBottom: children ? '1px solid var(--ds-color-border)' : undefined, display: 'grid', gap: 4 }}>
          {title ? <h3 style={{ margin: 0, fontSize: 'var(--ds-text-lg)', fontWeight: 'var(--ds-weight-bold)', color: 'var(--ds-color-fg)' }}>{title}</h3> : null}
          {description ? <p style={{ margin: 0, color: 'var(--ds-color-fg-muted)', fontSize: 'var(--ds-text-sm)' }}>{description}</p> : null}
        </div>
      ) : null}
      {children ? <div style={{ padding: '20px' }}>{children}</div> : null}
      {footer ? (
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--ds-color-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
