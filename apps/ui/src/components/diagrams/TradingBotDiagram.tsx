'use client';

import { useCv } from '@/content/useCv';
import { DiagramFigure, Link, Node, svgLane } from './primitives';

/**
 * The split that matters: one strategy crate feeds both the live path and the
 * backtest, which is what makes a backtest result something you can trust.
 */
export function TradingBotDiagram() {
  const copy = useCv().diagrams.tradingBot;
  const W = 200;
  const X = [30, 330, 630];

  return (
    <DiagramFigure alt={copy.alt} caption={copy.caption} viewBox="0 0 860 322">
      <text x={30} y={14} style={svgLane}>
        {copy.lanes.hot}
      </text>
      <Node x={X[0]} y={26} w={W} h={52} label="market-data" note={copy.notes.marketData} />
      <Node x={X[1]} y={26} w={W} h={52} label="strategy" note={copy.notes.strategy} accent />
      <Node x={X[2]} y={26} w={W} h={52} label="execution" note={copy.notes.execution} />
      <Link x1={X[0] + W} y1={52} x2={X[1]} y2={52} />
      <Link x1={X[1] + W} y1={52} x2={X[2]} y2={52} />

      {/* Same crate, offline. */}
      <Link x1={X[1] + W / 2} y1={78} x2={X[1] + W / 2} y2={136} accent />
      <Node x={X[1]} y={136} w={W} h={52} label="backtest" note={copy.notes.backtest} />

      <text x={30} y={228} style={svgLane}>
        {copy.lanes.control}
      </text>
      <Node x={X[0]} y={240} w={W} h={52} label="TypeScript" note={copy.notes.controlPlane} />
      <Node x={X[1]} y={240} w={W} h={52} label="Next.js" note={copy.notes.console} />
      <Link x1={X[0] + W} y1={266} x2={X[1]} y2={266} />
    </DiagramFigure>
  );
}
