import type { Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startTracing } = await import('@/observability/tracing');
    startTracing();

    const { logServiceStarted, logServiceStopping, observeProcessFailures } =
      await import('@/observability/standard-events');

    observeProcessFailures({ rejections: 'observe' });
    process.once('SIGTERM', () => logServiceStopping('SIGTERM'));
    process.once('SIGINT', () => logServiceStopping('SIGINT'));

    const { registerRumVocabulary } = await import('@/observability/rum-metrics');
    const { RUM_VOCABULARY } = await import('@/observability/rum-events');
    registerRumVocabulary(RUM_VOCABULARY);

    const { startBrokerProbe } = await import('@/lib/notifications');
    startBrokerProbe();

    const { logAskConfiguration } = await import('@/lib/ask/startup');
    await logAskConfiguration();

    logServiceStarted({ port: process.env.PORT ?? '3000' });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { writeLogRecord } = await import('@/observability/json-logger');
    const failure = error as Error & { digest?: string };

    writeLogRecord(
      'error',
      {
        event: 'request.failed',
        route: context.routePath,
        routeType: context.routeType,
        method: request.method,
        path: request.path,
        renderSource: context.renderSource,
        revalidateReason: context.revalidateReason,
        digest: failure.digest,
        error: { name: failure.name, message: failure.message },
      },
      undefined,
      failure.stack
    );
  }
};
