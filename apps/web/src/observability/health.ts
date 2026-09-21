import { recordHealth } from './health-metrics';

export type ComponentStatus = 'down' | 'unknown' | 'up';

export type ComponentName = 'kafka' | 'tolgee' | 'unleash';

export interface HealthBody {
  readonly status: 'degraded' | 'ok';
  readonly service: string;
  readonly release: string;
  readonly components: Record<ComponentName, { readonly status: ComponentStatus }>;
}

const STATE = Symbol.for('cv.observability.health');

const shared = globalThis as typeof globalThis & {
  [STATE]?: Record<ComponentName, ComponentStatus>;
};

const state = (shared[STATE] ??= {
  kafka: 'unknown',
  tolgee: 'unknown',
  unleash: 'unknown',
});

export function reportComponent(name: ComponentName, status: ComponentStatus): void {
  state[name] = status;
}

export function health(): HealthBody {
  const components = {
    kafka: { status: state.kafka },
    tolgee: { status: state.tolgee },
    unleash: { status: state.unleash },
  };

  const status = Object.values(components).some((component) => component.status === 'down')
    ? ('degraded' as const)
    : ('ok' as const);

  recordHealth(status, components);

  return {
    status,
    service: process.env.OTEL_SERVICE_NAME?.trim() || 'cv-web',
    release: process.env.NEXT_PUBLIC_RELEASE ?? 'dev',
    components,
  };
}
