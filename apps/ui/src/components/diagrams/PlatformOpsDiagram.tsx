'use client';

import { PRODUCT_NAMES } from '@/content/cv';
import { useCv } from '@/content/useCv';
import { DiagramFigure, Entry, Link, svgLane, svgName } from './primitives';

/**
 * Five applications attached to one external Docker network, which fronts
 * three families of shared service.
 *
 * Service and application names are hardcoded for the same reason technology
 * names live in `content/cv.ts` rather than Tolgee — they are proper nouns, and
 * a translator handed `openbao` in a string table will eventually translate it.
 * Every word that is prose comes from `cv.diagrams.platformOps`.
 *
 * The uneven fill is the point rather than a layout accident: seven of the
 * eleven services are observability, and a panel that fills while its
 * neighbours have room to spare says so faster than a sentence would.
 */

/*
 * The row is the products, taken from the project list rather than typed out
 * here, so adding a product cannot leave the diagram disagreeing with the page
 * above it. Widths are derived for the same reason: the row fills 860 whatever
 * the count turns out to be.
 */
const APPS = PRODUCT_NAMES;
const APP_GAP = 12.5;
const APP_W = (860 - (APPS.length - 1) * APP_GAP) / APPS.length;
const APP_PITCH = APP_W + APP_GAP;
const SEAM_TOP = 96;
const SEAM_H = 38;
const PANEL_TOP = 190;
const PANEL_W = 277;
const PANEL_H = 210;

/** Left edge and centre of each service-family panel. */
const PANELS = [
  { x: 0, mid: 138.5 },
  { x: 291.5, mid: 430 },
  { x: 583, mid: 721.5 },
] as const;

/**
 * Entry baselines. All three panels start at 244 and step by 42, so the rows
 * line up across the whole diagram; the two-entry panels take rows 1 and 3 so
 * their content spans the panel rather than bunching under the lane label.
 */
const ROW = [244, 286, 328, 370] as const;

export function PlatformOpsDiagram() {
  const copy = useCv().diagrams.platformOps;

  return (
    <DiagramFigure alt={copy.alt} caption={copy.caption} viewBox="0 0 860 404" minWidth={620}>
      {APPS.map((name, index) => {
        const x = index * APP_PITCH;
        return (
          <g key={name}>
            <rect
              x={x}
              y={0}
              width={APP_W}
              height={38}
              rx={5}
              fill="var(--ds-color-surface-2)"
              stroke="var(--ds-color-border-strong)"
            />
            <text x={x + APP_W / 2} y={24} textAnchor="middle" style={svgName}>
              {name}
            </text>
            <Link x1={x + APP_W / 2} y1={38} x2={x + APP_W / 2} y2={SEAM_TOP} arrow={false} />
          </g>
        );
      })}

      <rect
        x={0}
        y={SEAM_TOP}
        width={860}
        height={SEAM_H}
        rx={6}
        fill="var(--ds-color-accent-soft)"
        stroke="var(--ds-color-accent)"
        strokeWidth={1.25}
      />
      <text x={430} y={120} textAnchor="middle" style={{ ...svgName, fill: 'var(--ds-color-accent)' }}>
        platform_ops_shared
        <tspan dx={12} style={{ fontSize: 10, opacity: 0.8 }}>
          {copy.seam}
        </tspan>
      </text>

      {PANELS.map((panel) => (
        <g key={panel.x}>
          <Link x1={panel.mid} y1={SEAM_TOP + SEAM_H} x2={panel.mid} y2={PANEL_TOP} arrow={false} />
          <rect
            x={panel.x}
            y={PANEL_TOP}
            width={PANEL_W}
            height={PANEL_H}
            rx={6}
            fill="var(--ds-color-surface-2)"
            stroke="var(--ds-color-border)"
          />
        </g>
      ))}

      <text x={16} y={214} style={svgLane}>
        {copy.groups.secrets}
      </text>
      <Entry x={16} y={ROW[0]} name="openbao" note={copy.notes.openbao} />
      <Entry x={16} y={ROW[2]} name="tolgee" note={copy.notes.tolgee} />

      <text x={307.5} y={214} style={svgLane}>
        {copy.groups.events}
      </text>
      <Entry x={307.5} y={ROW[0]} name="redpanda" note={copy.notes.redpanda} />
      <Entry x={307.5} y={ROW[2]} name="redpanda-console" note={copy.notes.console} />

      <text x={599} y={214} style={svgLane}>
        {copy.groups.observability}
      </text>
      <Entry x={599} y={ROW[0]} name="otel-collector → jaeger" note={copy.notes.traces} />
      <Entry x={599} y={ROW[1]} name="prometheus → alertmanager" note={copy.notes.metrics} />
      <Entry x={599} y={ROW[2]} name="alloy → loki" note={copy.notes.logs} />
      <Entry x={599} y={ROW[3]} name="grafana" note={copy.notes.grafana} />
    </DiagramFigure>
  );
}
