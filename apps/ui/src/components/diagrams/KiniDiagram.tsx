'use client';

import { PRODUCT_NAMES } from '@/content/cv';
import { useCv } from '@/content/useCv';
import { DiagramFigure, Link, Node } from './primitives';

/** What kini was, and what survived it. */
export function KiniDiagram() {
  const copy = useCv().diagrams.kini;
  const W = 240;
  const X = [0, 310, 620];

  return (
    <DiagramFigure alt={copy.alt} caption={copy.caption} viewBox="0 0 860 110" minWidth={520}>
      <Node x={X[0]} y={16} w={W} h={56} label="kini" note={copy.notes.kini} />
      <Node x={X[1]} y={16} w={W} h={56} label="i18n · releases · compose" note={copy.notes.carried} accent />
      {/* Everything that came after it — the products, minus kini itself. */}
      <Node
        x={X[2]}
        y={16}
        w={W}
        h={56}
        label={PRODUCT_NAMES.filter((name) => name !== 'kini').join(' · ')}
        note={copy.notes.into}
      />
      <Link x1={X[0] + W} y1={44} x2={X[1]} y2={44} accent />
      <Link x1={X[1] + W} y1={44} x2={X[2]} y2={44} accent />
    </DiagramFigure>
  );
}
