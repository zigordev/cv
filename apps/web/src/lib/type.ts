import type { CSSProperties } from 'react';

/**
 * The design leans on three recurring text treatments. They are values rather
 * than classes so a section can spread and override one property without
 * inventing a modifier class for every variation.
 */

/** Mono, uppercase, wide-tracked. Eyebrows, section numbers, metadata, dates. */
export function mono(
  size = 11,
  tracking = '0.14em',
  color = 'var(--ds-color-fg-faint)'
): CSSProperties {
  return {
    fontFamily: 'var(--cv-font-mono)',
    fontSize: size,
    letterSpacing: tracking,
    textTransform: 'uppercase',
    color,
  };
}

/** Mono, but sentence-cased — dates, periods, stack lists that read as data. */
export function monoPlain(size = 12, color = 'var(--ds-color-fg-subtle)'): CSSProperties {
  return {
    fontFamily: 'var(--cv-font-mono)',
    fontSize: size,
    letterSpacing: '0.04em',
    color,
  };
}

/** Instrument Serif display. `size` accepts a clamp() string. */
export function display(
  size: string | number,
  lineHeight = 1.05,
  tracking = '-0.02em'
): CSSProperties {
  return {
    fontFamily: 'var(--cv-font-display)',
    fontWeight: 400,
    fontSize: typeof size === 'number' ? `${size}px` : size,
    lineHeight,
    letterSpacing: tracking,
    margin: 0,
  };
}
