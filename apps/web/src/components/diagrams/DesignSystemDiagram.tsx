'use client';

import { PRODUCT_NAMES } from '@/content/cv';
import { useCv } from '@/content/useCv';
import { DiagramFigure, Link, Node } from './primitives';

/** Three layers, and the products that vendor a copy of them. */
export function DesignSystemDiagram() {
  const copy = useCv().diagrams.designSystem;
  const W = 200;
  const X = [30, 330, 630];

  return (
    <DiagramFigure alt={copy.alt} caption={copy.caption} viewBox="0 0 860 230">
      <Node x={X[0]} y={20} w={W} h={52} label="tokens" note={copy.notes.tokens} />
      <Node x={X[1]} y={20} w={W} h={52} label="components" note={copy.notes.components} />
      <Node x={X[2]} y={20} w={W} h={52} label="themes" note={copy.notes.themes} accent />
      <Link x1={X[0] + W} y1={46} x2={X[1]} y2={46} />
      <Link x1={X[1] + W} y1={46} x2={X[2]} y2={46} />

      {/* Every product takes a copy; nothing is published as a package. */}
      {X.map((x) => (
        <Link key={x} x1={x + W / 2} y1={72} x2={x + W / 2} y2={150} arrow={false} dashed />
      ))}
      <Node
        x={30}
        y={150}
        w={800}
        h={52}
        label={PRODUCT_NAMES.join(' · ')}
        note={copy.notes.products}
      />
    </DiagramFigure>
  );
}
