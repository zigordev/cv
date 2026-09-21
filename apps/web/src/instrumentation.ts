import type { Instrumentation } from 'next';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { startTracing } = await import('@/observability/tracing');
  startTracing();

  const { writeLogRecord } = await import('@/observability/json-logger');

  process.on('uncaughtException', (error: Error) => {
    writeLogRecord('error', { event: 'process.uncaught_exception' }, undefined, error.stack);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    writeLogRecord('warn', {
      event: 'process.unhandled_rejection',
      error:
        reason instanceof Error
          ? { name: reason.name, message: reason.message }
          : { name: 'UnknownRejection', message: String(reason) },
    });
  });

  const stopping = (signal: string) => {
    writeLogRecord('info', { event: 'service.stopping', signal });
  };
  process.once('SIGTERM', () => stopping('SIGTERM'));
  process.once('SIGINT', () => stopping('SIGINT'));

  const { startBrokerProbe } = await import('@/lib/notifications');
  startBrokerProbe();

  const { logAskConfiguration } = await import('@/lib/ask/startup');
  await logAskConfiguration();

  writeLogRecord('info', {
    event: 'service.started',
    release: process.env.NEXT_PUBLIC_RELEASE ?? 'dev',
    port: process.env.PORT ?? '3000',
  });
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
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
};
