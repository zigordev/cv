'use client';

import { useCv } from '@/content/useCv';
import { DiagramFigure, Link, Node } from './primitives';

/** The request path, and the one thing that deliberately leaves it: email. */
export function GpoolDiagram() {
  const copy = useCv().diagrams.gpool;
  const W = 200;
  const X = [30, 330, 630];

  return (
    <DiagramFigure alt={copy.alt} caption={copy.caption} viewBox="0 0 860 230">
      <Node x={X[0]} y={20} w={W} h={52} label="Next.js" note={copy.notes.web} />
      <Node x={X[1]} y={20} w={W} h={52} label="NestJS" note={copy.notes.api} />
      <Node x={X[2]} y={20} w={W} h={52} label="Postgres" note={copy.notes.db} />
      <Link x1={X[0] + W} y1={46} x2={X[1]} y2={46} />
      <Link x1={X[1] + W} y1={46} x2={X[2]} y2={46} />

      {/* The API publishes and moves on; delivery is somebody else's problem. */}
      <Link x1={X[1] + W / 2} y1={72} x2={X[1] + W / 2} y2={150} accent />
      <Node x={X[1]} y={150} w={W} h={52} label="Kafka" note={copy.notes.events} accent />
      <Node x={X[2]} y={150} w={W} h={52} label="notifications" note={copy.notes.handoff} />
      <Link x1={X[1] + W} y1={176} x2={X[2]} y2={176} accent />
    </DiagramFigure>
  );
}
