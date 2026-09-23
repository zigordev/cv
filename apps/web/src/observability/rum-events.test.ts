import { beforeEach, describe, expect, it, vi } from 'vitest';

async function graph() {
  vi.resetModules();
  const events = await import('./rum-events');
  const rumMetrics = await import('./rum-metrics');
  const { registry } = await import('./metrics.registry');
  return { ...events, ...rumMetrics, registry };
}

function interactionNames(text: string): Set<string> {
  const names = new Set<string>();
  for (const line of text.split('\n')) {
    const match = /^rum_interactions_total\{[^}]*interaction_type="([^"]+)"/.exec(line);
    if (match) names.add(match[1]);
  }
  return names;
}

describe('cv RUM vocabulary', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports every interaction at zero once the startup path declares it', async () => {
    const rum = await graph();
    rum.registerRumVocabulary(rum.RUM_VOCABULARY);

    const text = await rum.registry.metrics();
    const declared = interactionNames(text);

    for (const name of rum.RUM_INTERACTIONS) {
      expect(declared).toContain(name);
      expect(text).toContain(`interaction_type="${name}"`);
    }
  });

  it('knows nothing about the eleven names until they are declared', async () => {
    const rum = await graph();

    expect(interactionNames(await rum.registry.metrics())).not.toContain('cv-downloaded');
  });

  it('keeps an undeclared name out of the label values', async () => {
    const rum = await graph();
    rum.registerRumVocabulary(rum.RUM_VOCABULARY);

    rum.recordRumEvent({ type: 'interaction', name: 'something-else', page: '/' });

    const declared = interactionNames(await rum.registry.metrics());
    expect(declared).toContain('other');
    expect(declared).not.toContain('something-else');
  });

  it('reports the rejection reasons before any beacon is rejected', async () => {
    const text = await (await graph()).registry.metrics();

    for (const reason of ['rate_limited', 'malformed', 'unknown_type', 'bad_name']) {
      expect(text).toContain(`rum_rejected_total{reason="${reason}"} 0`);
    }
  });

  it('still declares the vocabulary when only the ingest route loads', async () => {
    vi.resetModules();
    await import('@/app/rum/events/route');
    const { registry } = await import('./metrics.registry');

    expect(interactionNames(await registry.metrics())).toContain('ask-submitted');
  });
});
