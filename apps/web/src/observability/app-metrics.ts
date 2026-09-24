import * as client from 'prom-client';

import { registry } from './metrics.registry';

type Outcome = 'failed' | 'queued' | 'rejected';

export const MESSAGE_SOURCES = ['merged', 'remote', 'local', 'default_locale'] as const;
export type MessageSource = (typeof MESSAGE_SOURCES)[number];

interface State {
  readonly contact: Record<Outcome, number>;
  readonly messages: Map<MessageSource, number>;
  readonly flags: Map<string, boolean>;
}

const STATE = Symbol.for('cv.observability.app-metrics');

const shared = globalThis as typeof globalThis & { [STATE]?: State };

const state = (shared[STATE] ??= {
  contact: { queued: 0, rejected: 0, failed: 0 },
  messages: new Map(MESSAGE_SOURCES.map((source) => [source, 0])),
  flags: new Map(),
});

new client.Counter({
  name: 'cv_contact_submissions_total',
  help: 'Contact messages by what happened to them',
  labelNames: ['outcome'] as const,
  registers: [registry],
  collect() {
    this.reset();
    for (const [outcome, count] of Object.entries(state.contact)) this.inc({ outcome }, count);
  },
});

new client.Counter({
  name: 'cv_i18n_messages_total',
  help: 'Message loads by where the copy came from',
  labelNames: ['source'] as const,
  registers: [registry],
  collect() {
    this.reset();
    for (const [source, count] of state.messages) this.inc({ source }, count);
  },
});

new client.Gauge({
  name: 'cv_feature_flag_enabled',
  help: 'Whether a feature flag reads as enabled right now',
  labelNames: ['flag'] as const,
  registers: [registry],
  collect() {
    this.reset();
    for (const [flag, enabled] of state.flags) this.set({ flag }, enabled ? 1 : 0);
  },
});

export function recordContactSubmission(outcome: Outcome): void {
  state.contact[outcome] += 1;
}

export function recordMessageSource(source: MessageSource): void {
  state.messages.set(source, (state.messages.get(source) ?? 0) + 1);
}

export function recordFlagState(flag: string, enabled: boolean): void {
  state.flags.set(flag, enabled);
}
