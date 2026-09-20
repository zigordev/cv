import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  AlwaysOnSampler,
  ParentBasedSampler,
  SamplingDecision,
  type Sampler,
  type SamplingResult,
} from '@opentelemetry/sdk-trace-base';
import {
  ATTR_HTTP_ROUTE,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_URL_FULL,
  ATTR_URL_PATH,
} from '@opentelemetry/semantic-conventions';
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from '@opentelemetry/semantic-conventions/incubating';

import type { Attributes } from '@opentelemetry/api';

const UNSAMPLED_PATHS = [/^\/health$/, /^\/metrics$/, /^\/rum(\/|$)/, /^\/_next\/static(\/|$)/];

export function isUnsampledPath(path: string | undefined): boolean {
  if (!path) return false;
  const withoutQuery = path.split('?')[0];
  return UNSAMPLED_PATHS.some((pattern) => pattern.test(withoutQuery));
}

export function pathOfSpan(attributes: Attributes): string | undefined {
  const candidates = [
    attributes[ATTR_URL_PATH],
    attributes[ATTR_HTTP_ROUTE],
    attributes['http.target'],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }

  const full = attributes[ATTR_URL_FULL] ?? attributes['http.url'];
  if (typeof full === 'string') {
    try {
      return new URL(full).pathname;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

class PathSampler implements Sampler {
  constructor(private readonly delegate: Sampler) {}

  shouldSample(
    ...args: Parameters<Sampler['shouldSample']>
  ): SamplingResult | ReturnType<Sampler['shouldSample']> {
    const attributes = args[4];

    if (isUnsampledPath(pathOfSpan(attributes))) {
      return { decision: SamplingDecision.NOT_RECORD };
    }

    return this.delegate.shouldSample(...args);
  }

  toString(): string {
    return `PathSampler(${this.delegate.toString()})`;
  }
}

const tracesEnabled = (process.env.OTEL_TRACES_ENABLED || 'true').toLowerCase() !== 'false';

let telemetrySdk: NodeSDK | undefined;
let shutdownPromise: Promise<void> | undefined;

export function startTracing(): void {
  if (!tracesEnabled || telemetrySdk) return;

  const endpoint = (
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() || 'http://otel-collector:4318'
  ).replace(/\/+$/, '');

  telemetrySdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME?.trim() || 'cv-web',
      [ATTR_SERVICE_VERSION]: process.env.NEXT_PUBLIC_RELEASE?.trim() || 'dev',
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || 'development',
    }),
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    sampler: new PathSampler(new ParentBasedSampler({ root: new AlwaysOnSampler() })),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-pino': { enabled: false },
      }),
    ],
  });

  telemetrySdk.start();

  process.once('SIGTERM', () => void shutdownTracing());
  process.once('SIGINT', () => void shutdownTracing());
}

export function shutdownTracing(): Promise<void> {
  shutdownPromise ??= telemetrySdk?.shutdown().catch(() => undefined) ?? Promise.resolve();
  return shutdownPromise;
}
