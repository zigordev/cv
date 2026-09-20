import * as client from 'prom-client';

import { registry } from './metrics.registry';

const contactSubmissions = new client.Counter({
  name: 'cv_contact_submissions_total',
  help: 'Contact messages by what happened to them',
  labelNames: ['outcome'] as const,
  registers: [registry],
});

const i18nMessages = new client.Counter({
  name: 'cv_i18n_messages_total',
  help: 'Message loads by where the copy came from',
  labelNames: ['source'] as const,
  registers: [registry],
});

const featureFlagEnabled = new client.Gauge({
  name: 'cv_feature_flag_enabled',
  help: 'Whether a feature flag reads as enabled right now',
  labelNames: ['flag'] as const,
  registers: [registry],
});

const buildInfo = new client.Gauge({
  name: 'cv_build_info',
  help: 'The release this process is running, as a label',
  labelNames: ['version'] as const,
  registers: [registry],
});

buildInfo.set({ version: process.env.NEXT_PUBLIC_RELEASE?.trim() || 'dev' }, 1);

// Zero-initialised for the same reason the RUM series are: rate() needs two
// samples, so a counter born at the moment of the first event loses it.
for (const outcome of ['queued', 'rejected', 'failed'] as const) {
  contactSubmissions.inc({ outcome }, 0);
}

export function recordContactSubmission(outcome: 'failed' | 'queued' | 'rejected'): void {
  contactSubmissions.inc({ outcome });
}

export function recordMessageSource(source: string): void {
  i18nMessages.inc({ source });
}

export function recordFlagState(flag: string, enabled: boolean): void {
  featureFlagEnabled.set({ flag }, enabled ? 1 : 0);
}
