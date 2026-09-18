export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { logAskConfiguration } = await import('@/lib/ask/startup');
  await logAskConfiguration();
}
