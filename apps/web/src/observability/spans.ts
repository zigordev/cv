import { SpanStatusCode, trace, type Attributes, type Span } from '@opentelemetry/api';

const TRACER_NAME = 'cv-web';

export function tracer() {
  return trace.getTracer(TRACER_NAME);
}

export function withSpan<T>(
  name: string,
  run: (span: Span) => Promise<T>,
  attributes?: Attributes
): Promise<T> {
  return tracer().startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await run(span);
    } catch (error) {
      if (error instanceof Error) span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

export function annotateRequest(attributes: Attributes): void {
  trace.getActiveSpan()?.setAttributes(attributes);
}

export function recordFlagEvaluation(key: string, enabled: boolean): void {
  trace.getActiveSpan()?.addEvent('feature_flag', {
    'feature_flag.key': key,
    'feature_flag.provider_name': 'unleash',
    'feature_flag.result.value': enabled,
  });
}
