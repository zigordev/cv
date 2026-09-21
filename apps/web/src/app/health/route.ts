import { NextResponse } from 'next/server';

import { health } from '@/observability/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The health endpoint, for the compose healthcheck and the deploy smoke probe.
 *
 * Shape and path follow the observability contract in platform-ops: one
 * `/health` per service, no `/api` prefix, and `service` matching
 * `OTEL_SERVICE_NAME` so health, metrics, traces and logs all name this app
 * identically.
 */
export async function GET() {
  return NextResponse.json(health());
}
