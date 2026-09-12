'use client';

import type { ReactNode } from 'react';

/**
 * Shared parts of the project architecture diagrams.
 *
 * Each diagram is hand-laid-out SVG rather than a chart library: they are
 * six fixed pictures, not data, and a layout engine would cost more than it
 * saves. What is shared here is only what would otherwise be copied verbatim
 * six times — the text treatments, the box, the arrow, and the frame.
 *
 * SVG text takes presentation attributes rather than the `mono()`/`display()`
 * helpers in `lib/type`, which return CSS for HTML elements. `fill` is the one
 * that matters: `color` on an SVG <text> silently does nothing.
 */

export const svgName = {
  fontFamily: 'var(--cv-font-mono)',
  fontSize: 13,
  fill: 'var(--ds-color-fg)',
} as const;

export const svgNote = {
  fontFamily: 'var(--cv-font-mono)',
  fontSize: 10,
  fill: 'var(--ds-color-fg-faint)',
} as const;

export const svgLane = {
  fontFamily: 'var(--cv-font-mono)',
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  fill: 'var(--ds-color-fg-muted)',
} as const;

/**
 * The frame: a scrolling panel, the drawing, and a caption.
 *
 * `minWidth` keeps the drawing legible on a phone by letting the panel scroll
 * rather than squeezing 13px mono down to nothing. Only one diagram is mounted
 * at a time (the modal renders a single project), so the arrow markers can use
 * fixed ids without colliding.
 */
export function DiagramFigure({
  alt,
  caption,
  viewBox,
  minWidth = 600,
  children,
}: Readonly<{
  alt: string;
  caption: string;
  viewBox: string;
  minWidth?: number;
  children: ReactNode;
}>) {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 'var(--ds-space-3)' }}>
      <div
        style={{
          overflowX: 'auto',
          border: '1px solid var(--ds-color-border)',
          borderRadius: 6,
          background: 'var(--ds-color-surface)',
          padding: '20px 18px',
        }}
      >
        <svg
          viewBox={viewBox}
          role="img"
          aria-label={alt}
          style={{ display: 'block', width: '100%', minWidth, height: 'auto' }}
        >
          <defs>
            <marker
              id="cv-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ds-color-border-strong)" />
            </marker>
            <marker
              id="cv-arrow-accent"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ds-color-accent)" />
            </marker>
          </defs>
          {children}
        </svg>
      </div>

      <figcaption
        style={{
          fontSize: 'var(--ds-text-sm)',
          lineHeight: 1.6,
          color: 'var(--ds-color-fg-muted)',
          maxWidth: '74ch',
        }}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

/** A labelled box. `note` sits inside, under the name. */
export function Node({
  x,
  y,
  w,
  h = 46,
  label,
  note,
  accent = false,
}: Readonly<{
  x: number;
  y: number;
  w: number;
  h?: number;
  label: string;
  note?: string;
  accent?: boolean;
}>) {
  const mid = x + w / 2;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={accent ? 'var(--ds-color-accent-soft)' : 'var(--ds-color-surface-2)'}
        stroke={accent ? 'var(--ds-color-accent)' : 'var(--ds-color-border-strong)'}
        strokeWidth={accent ? 1.25 : 1}
      />
      <text
        x={mid}
        y={note ? y + h / 2 - 2 : y + h / 2 + 4}
        textAnchor="middle"
        style={accent ? { ...svgName, fill: 'var(--ds-color-accent)' } : svgName}
      >
        {label}
      </text>
      {note ? (
        <text x={mid} y={y + h / 2 + 14} textAnchor="middle" style={svgNote}>
          {note}
        </text>
      ) : null}
    </g>
  );
}

/** A connector. Set `arrow` when direction carries meaning. */
export function Link({
  x1,
  y1,
  x2,
  y2,
  arrow = true,
  accent = false,
  dashed = false,
}: Readonly<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  arrow?: boolean;
  accent?: boolean;
  dashed?: boolean;
}>) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={accent ? 'var(--ds-color-accent)' : 'var(--ds-color-border-strong)'}
      strokeWidth={1.4}
      strokeDasharray={dashed ? '4 3' : undefined}
      markerEnd={arrow ? `url(#${accent ? 'cv-arrow-accent' : 'cv-arrow'})` : undefined}
    />
  );
}

/** A left-aligned name with its one-line purpose underneath. */
export function Entry({
  x,
  y,
  name,
  note,
}: Readonly<{ x: number; y: number; name: string; note: string }>) {
  return (
    <>
      <text x={x} y={y} style={svgName}>
        {name}
      </text>
      <text x={x} y={y + 16} style={svgNote}>
        {note}
      </text>
    </>
  );
}
