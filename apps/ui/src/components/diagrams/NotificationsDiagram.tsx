'use client';

import { useCv } from '@/content/useCv';
import { DiagramFigure, Link, Node } from './primitives';

/** The delivery pipeline, and the branch that stops a bad message looping. */
export function NotificationsDiagram() {
  const copy = useCv().diagrams.notifications;
  const W = 160;
  const X = [0, 175, 350, 525, 700];

  return (
    <DiagramFigure alt={copy.alt} caption={copy.caption} viewBox="0 0 860 210">
      <Node x={X[0]} y={16} w={W} h={52} label="topic" note={copy.notes.topic} />
      <Node x={X[1]} y={16} w={W} h={52} label="consumer" note={copy.notes.consumer} />
      <Node x={X[2]} y={16} w={W} h={52} label="idempotency" note={copy.notes.idempotency} />
      <Node x={X[3]} y={16} w={W} h={52} label="templates" note={copy.notes.templates} />
      <Node x={X[4]} y={16} w={W} h={52} label="email" note={copy.notes.email} accent />
      {X.slice(0, 4).map((x, i) => (
        <Link key={x} x1={x + W} y1={42} x2={X[i + 1]} y2={42} />
      ))}

      {/* Malformed payloads leave the pipeline rather than looping on it. */}
      <Link x1={X[1] + W / 2} y1={68} x2={X[1] + W / 2} y2={126} />
      <Node x={X[1]} y={126} w={W} h={52} label="dead-letter" note={copy.notes.deadLetter} />
    </DiagramFigure>
  );
}
