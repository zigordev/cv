import { withRouteMetrics } from '@/observability/http-metrics';
import { createCspReportRoute } from '@/observability/next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withRouteMetrics('/rum/csp', createCspReportRoute({ pages: ['/'] }));
