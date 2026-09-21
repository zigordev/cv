import * as client from 'prom-client';

/**
 * The one registry. Everything that registers a metric registers it here, so
 * `/metrics` is a single scrape returning both app and runtime numbers.
 */
// OpenMetrics rather than the older text format, because that is the only one
// that can carry an exemplar: the trace id attached to a latency observation,
// which is what turns a spike on a graph into the request that caused it.
export const registry = new client.Registry<client.OpenMetricsContentType>();
registry.setContentType(client.openMetricsContentType);

// Process and event-loop defaults in the same registry as app metrics.
client.collectDefaultMetrics({ register: registry });
