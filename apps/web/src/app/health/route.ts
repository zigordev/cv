import { NextResponse } from 'next/server';

import { health } from '@/observability/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The health endpoint, for the compose healthcheck, the deploy smoke probe and
 * the uptime probe.
 *
 * Shape and path follow the observability contract in platform-ops: one
 * `/health` per service, no `/api` prefix, and `service` matching
 * `OTEL_SERVICE_NAME` so health, metrics, traces and logs all name this app
 * identically.
 *
 * Every component is optional, so a failure reads as `degraded` and still
 * answers 200: the page renders from committed copy with the declared flag
 * defaults. What it cannot do is take a contact message, and that is what the
 * `kafka` component says.
 */
export async function GET() {
  return NextResponse.json(health());
}
