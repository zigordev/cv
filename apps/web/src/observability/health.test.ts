import { beforeEach, describe, expect, it } from 'vitest';

import { health, reportComponent } from './health';
import { registry } from './metrics.registry';

const componentGauge = async (name: string) => {
  const metric = await registry.getSingleMetric('service_component_up')?.get();
  return metric?.values.find((value) => value.labels.component === name)?.value;
};

describe('health', () => {
  beforeEach(() => {
    reportComponent('kafka', 'unknown');
    reportComponent('tolgee', 'unknown');
    reportComponent('unleash', 'unknown');
  });

  it('is ok while nothing has reported a failure', () => {
    const body = health();

    expect(body.status).toBe('ok');
    expect(body.service).toBe('cv-web');
    expect(body.components).toEqual({
      kafka: { status: 'unknown' },
      tolgee: { status: 'unknown' },
      unleash: { status: 'unknown' },
    });
  });

  it('is degraded, never an error, when a dependency is down: the page still renders', () => {
    reportComponent('kafka', 'down');

    const body = health();

    expect(body.status).toBe('degraded');
    expect(body.components.kafka).toEqual({ status: 'down' });
    expect(body.components.tolgee).toEqual({ status: 'unknown' });
  });

  it('comes back to ok when the dependency does', () => {
    reportComponent('tolgee', 'down');
    expect(health().status).toBe('degraded');

    reportComponent('tolgee', 'up');
    expect(health().status).toBe('ok');
  });

  it('writes the same judgement as a metric, because no rule can read the JSON', async () => {
    reportComponent('unleash', 'down');
    reportComponent('kafka', 'up');
    health();

    await expect(componentGauge('unleash')).resolves.toBe(0);
    await expect(componentGauge('kafka')).resolves.toBe(1);
  });
});
