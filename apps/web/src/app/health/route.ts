import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The health endpoint, for the compose healthcheck and the deploy smoke probe.
 *
 * Shape and path follow the observability contract in platform-ops: one
 * `/health` per service, no `/api` prefix, and `service` matching
 * `OTEL_SERVICE_NAME` so health, metrics, traces and logs all name this app
 * identically.
 *
 * `components` is empty because cv has nothing to depend on — no database, no
 * broker. A Tolgee reachability check would be the honest addition, but a failed
 * Tolgee fetch already falls back to the committed messages rather than failing
 * the page, so it would report a degradation with no user effect.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'cv-web',
    release: process.env.NEXT_PUBLIC_RELEASE ?? 'dev',
    components: {},
  });
}
