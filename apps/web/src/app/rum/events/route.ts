import { withRouteMetrics } from '@/observability/http-metrics';
import { createRumIngestRoute } from '@/observability/next';
import { RUM_VOCABULARY } from '@/observability/rum-events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * RUM ingest. Unauthenticated by necessity — anonymous visitors report here,
 * often during page unload — so the handler carries the same-origin check, the
 * body-size cap, the per-client rate limit and the field validation.
 */
export const POST = withRouteMetrics('/rum/events', createRumIngestRoute(RUM_VOCABULARY));
