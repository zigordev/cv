import React from 'react';
import { injectOnce } from '../_shared/injectStyle.js';

injectOnce('ds-toast', `
.ds-toast-region{position:fixed;z-index:1000;right:20px;bottom:20px;display:grid;gap:8px;width:min(360px,calc(100vw - 40px));}
.ds-toast{display:flex;align-items:flex-start;gap:10px;padding:13px 16px;border:1px solid transparent;border-radius:var(--ds-radius-md);box-shadow:var(--ds-shadow-lg);font-family:var(--ds-font-sans);font-size:var(--ds-text-sm);font-weight:var(--ds-weight-semibold);text-align:left;animation:ds-toast-in var(--ds-duration-base) var(--ds-ease-out) both;}
@keyframes ds-toast-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.ds-toast-success{background:var(--ds-color-success-bg);color:var(--ds-color-success-fg);border-color:var(--ds-color-success-border);}
.ds-toast-warning{background:var(--ds-color-warning-bg);color:var(--ds-color-warning-fg);border-color:var(--ds-color-warning-border);}
.ds-toast-danger{background:var(--ds-color-danger-bg);color:var(--ds-color-danger-fg);border-color:var(--ds-color-danger-border);}
.ds-toast-info{background:var(--ds-color-info-bg);color:var(--ds-color-info-fg);border-color:var(--ds-color-info-border);}
`);

export function Toast({ kind = 'info', children, onDismiss, className = '', ...props }) {
  return (
    <div className={`ds-toast ds-toast-${kind} ${className}`.trim()} role="status" {...props}>
      <span style={{ flex: 1 }}>{children}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{ background: 'none', border: 'none', color: 'var(--ds-color-fg-subtle)', cursor: 'pointer', fontSize: 'var(--ds-text-base)', lineHeight: 1, padding: 0 }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export function ToastRegion({ children }) {
  return (
    <div className="ds-toast-region" aria-live="polite" aria-atomic="true">
      {children}
    </div>
  );
}
