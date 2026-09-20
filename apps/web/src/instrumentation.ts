export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { startTracing } = await import('@/observability/tracing');
  startTracing();

  const { logAskConfiguration } = await import('@/lib/ask/startup');
  await logAskConfiguration();
}
