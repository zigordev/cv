import React from 'react';
import { injectOnce } from '../_shared/injectStyle.js';

injectOnce(
  'ds-textarea',
  `
.ds-textarea{display:block;box-sizing:border-box;width:100%;min-height:112px;padding:10px 12px;background:var(--ds-color-surface);border:1px solid var(--ds-color-border);border-radius:var(--ds-radius-md);font-family:var(--ds-font-sans);font-size:var(--ds-text-base);line-height:1.55;color:var(--ds-color-fg);resize:vertical;transition:border-color var(--ds-duration-fast) var(--ds-ease-out),box-shadow var(--ds-duration-fast) var(--ds-ease-out);}
.ds-textarea::placeholder{color:var(--ds-color-fg-faint);}
.ds-textarea:hover:not(:disabled):not(:focus){border-color:var(--ds-color-border-strong);}
.ds-textarea:focus{outline:none;border-color:var(--ds-color-accent);box-shadow:0 0 0 3px var(--ds-color-accent-soft);}
.ds-textarea:disabled{background:var(--ds-color-surface-2);color:var(--ds-color-fg-faint);cursor:not-allowed;}
.ds-textarea-invalid{border-color:var(--ds-color-danger) !important;box-shadow:0 0 0 3px var(--ds-color-danger-soft);}
.ds-textarea-attention{border-color:var(--ds-color-warning) !important;box-shadow:0 0 0 3px var(--ds-color-warning-soft);}
`
);

/** The multi-line sibling of Input, sharing its states verbatim.
 *
 * `resize: vertical` rather than `both` — horizontal resize lets a user drag
 * the control wider than its container and break the surrounding layout,
 * which is never what they were reaching for. */
export function Textarea({ invalid = false, attention = false, className = '', ...props }) {
  const cls = [
    'ds-textarea',
    invalid && 'ds-textarea-invalid',
    attention && !invalid && 'ds-textarea-attention',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return <textarea className={cls} aria-invalid={invalid || undefined} {...props} />;
}
