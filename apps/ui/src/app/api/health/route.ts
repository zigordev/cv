import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness for the compose healthcheck and the deploy smoke probe.
 *
 * Shape follows the observability contract in platform-ops; `service` is the
 * same string as `OTEL_SERVICE_NAME`, so health, metrics, traces and logs all
 * name this app identically.
 *
 * The path keeps its `/api` prefix rather than moving to `/health`: routes
 * under `/api` is Next.js's own convention, and unlike the backend services
 * this app has no separate API to distinguish it from.
 *
 * There is no readiness probe because there is nothing to be ready for — cv has
 * no database. A Tolgee reachability check would be the honest addition, but a
 * failed Tolgee fetch already falls back to the committed messages rather than
 * failing the page, so it would report a degradation that has no user effect.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'cv-web',
    release: process.env.NEXT_PUBLIC_RELEASE ?? 'dev',
  });
}
