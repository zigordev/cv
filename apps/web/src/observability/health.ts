import { recordHealth } from './health-metrics';

export type ComponentStatus = 'down' | 'unknown' | 'up';

export type ComponentName = 'kafka' | 'tolgee' | 'unleash';

export interface HealthBody {
  readonly status: 'degraded' | 'ok';
  readonly service: string;
  readonly release: string;
  readonly components: Record<ComponentName, { readonly status: ComponentStatus }>;
}

const state: Record<ComponentName, ComponentStatus> = {
  kafka: 'unknown',
  tolgee: 'unknown',
  unleash: 'unknown',
};

/**
 * Every dependency here is optional, and that is the honest answer rather than
 * a lenient one: a page still renders with the committed copy, the declared
 * flag defaults and no way to send a contact message. So a failure is
 * `degraded`, never `error` — the container stays up and serves what it can,
 * and the alert says which part is missing.
 */
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

  // The same judgement as a metric, because no rule can read the JSON body.
  recordHealth(status, components);

  return {
    status,
    service: process.env.OTEL_SERVICE_NAME?.trim() || 'cv-web',
    release: process.env.NEXT_PUBLIC_RELEASE ?? 'dev',
    components,
  };
}
