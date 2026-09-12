'use client';

import { useCv } from '@/content/useCv';
import { DiagramFigure, Link, Node } from './primitives';

/** One source of content, rendered twice — and the one thing that leaves. */
export function CvDiagram() {
  const copy = useCv().diagrams.cv;
  const W = 200;
  const X = [30, 330, 630];

  return (
    <DiagramFigure alt={copy.alt} caption={copy.caption} viewBox="0 0 860 230">
      <Node x={X[0]} y={20} w={W} h={52} label="Tolgee" note={copy.notes.content} />
      <Node x={X[1]} y={20} w={W} h={52} label="Next.js" note={copy.notes.page} />
      <Node x={X[2]} y={20} w={W} h={52} label="PDF" note={copy.notes.pdf} />
      <Link x1={X[0] + W} y1={46} x2={X[1]} y2={46} />
      <Link x1={X[1] + W} y1={46} x2={X[2]} y2={46} />

      {/* The contact form hands off rather than sending anything itself. */}
      <Link x1={X[1] + W / 2} y1={72} x2={X[1] + W / 2} y2={150} accent />
      <Node x={X[1]} y={150} w={W} h={52} label="Kafka" note={copy.notes.events} accent />
      <Node x={X[2]} y={150} w={W} h={52} label="notifications" note={copy.notes.handoff} />
      <Link x1={X[1] + W} y1={176} x2={X[2]} y2={176} accent />
    </DiagramFigure>
  );
}
