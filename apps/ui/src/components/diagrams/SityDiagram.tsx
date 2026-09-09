'use client';

import { useCv } from '@/content/useCv';
import { DiagramFigure, Link, Node, svgLane } from './primitives';

/**
 * One plan feeds two consumers: the lane graph that vehicles will drive and
 * the scene that is drawn from the same sampled roads. The verification reads
 * the graph back through the page, so the picture and the data cannot drift
 * apart unnoticed.
 */
export function SityDiagram() {
  const copy = useCv().diagrams.sity;
  const W = 200;
  const X = [30, 330, 630];

  return (
    <DiagramFigure alt={copy.alt} caption={copy.caption} viewBox="0 0 860 322">
      <text x={30} y={14} style={svgLane}>
        {copy.lanes.graph}
      </text>
      <Node x={X[0]} y={26} w={W} h={52} label="plan" note={copy.notes.plan} />
      <Node x={X[1]} y={26} w={W} h={52} label="network" note={copy.notes.network} accent />
      <Node x={X[2]} y={26} w={W} h={52} label="graph" note={copy.notes.graph} accent />
      <Link x1={X[0] + W} y1={52} x2={X[1]} y2={52} />
      <Link x1={X[1] + W} y1={52} x2={X[2]} y2={52} accent />

      <text x={30} y={228} style={svgLane}>
        {copy.lanes.scene}
      </text>
      {/* The same sampled roads, drawn; and the graph, read back in a browser. */}
      <Link x1={X[1] + W / 2} y1={78} x2={X[1] + W / 2} y2={240} />
      <Node x={X[1]} y={240} w={W} h={52} label="scene" note={copy.notes.scene} />
      <Link x1={X[2] + W / 2} y1={78} x2={X[2] + W / 2} y2={240} accent />
      <Node x={X[2]} y={240} w={W} h={52} label="verify" note={copy.notes.verify} />
    </DiagramFigure>
  );
}
