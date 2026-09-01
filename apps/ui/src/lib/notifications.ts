import { randomUUID } from 'node:crypto';

import { Kafka, type Producer } from 'kafkajs';

/**
 * Publishes to the shared notifications service, whose contract is defined in
 * the notifications repo (`notification-event.ts`). Mirrors gpool's
 * NotificationPublisherService — same envelope, same headers, same idempotent
 * producer — minus the Nest wiring, since this app has one call site.
 */
export interface NotificationEventEnvelope {
  messageId: string;
  idempotencyKey: string;
  sourceApp: string;
  channel: 'email';
  templateId: string;
  replyTo?: string;
  recipient: { email: string };
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  requestedAt: string;
}

const TOPIC = process.env.NOTIFICATIONS_EMAIL_TOPIC || 'notification.email.requested.v1';
const SOURCE_APP = 'cv';

function brokers(): string[] {
  return (process.env.NOTIFICATIONS_KAFKA_BROKERS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

/*
 * Held on globalThis rather than a module-level `let`: Next reloads route
 * modules on every edit in dev, and a fresh module scope each time would leak
 * a connected producer per reload.
 */
const globalForKafka = globalThis as typeof globalThis & {
  __cvProducer?: Producer | null;
  __cvProducerConnect?: Promise<Producer> | null;
};

async function getProducer(): Promise<Producer> {
  if (globalForKafka.__cvProducer) return globalForKafka.__cvProducer;
  if (globalForKafka.__cvProducerConnect) return globalForKafka.__cvProducerConnect;

  const list = brokers();
  if (list.length === 0) throw new Error('NOTIFICATIONS_KAFKA_BROKERS is required');

  const kafka = new Kafka({
    clientId: process.env.OTEL_SERVICE_NAME || 'cv-web',
    brokers: list,
  });

  const producer = kafka.producer({ idempotent: true, allowAutoTopicCreation: true });

  globalForKafka.__cvProducerConnect = producer
    .connect()
    .then(() => {
      globalForKafka.__cvProducer = producer;
      return producer;
    })
    .catch((error) => {
      resetProducer(producer);
      throw error;
    });

  return globalForKafka.__cvProducerConnect;
}

function resetProducer(producer: Producer): void {
  if (globalForKafka.__cvProducer === producer) globalForKafka.__cvProducer = null;
  globalForKafka.__cvProducerConnect = null;
  void producer.disconnect().catch(() => undefined);
}

export async function publishEmail(event: NotificationEventEnvelope): Promise<void> {
  const producer = await getProducer();
  try {
    await producer.send({
      topic: TOPIC,
      messages: [
        {
          key: event.idempotencyKey,
          value: JSON.stringify(event),
          headers: {
            sourceApp: event.sourceApp,
            templateId: event.templateId,
            channel: event.channel,
          },
        },
      ],
    });
  } catch (error) {
    resetProducer(producer);
    throw error;
  }
}

/**
 * Builds the contact-form event.
 *
 * `recipient` is always the CV owner and never the submitter — the visitor's
 * address goes in `replyTo`. That is what keeps a public form from being an
 * open relay: an attacker controls the body, never the destination.
 */
export function buildContactEvent(input: {
  name: string;
  email: string;
  message: string;
  locale: string;
}): NotificationEventEnvelope {
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL;
  if (!recipient) throw new Error('CONTACT_RECIPIENT_EMAIL is required');

  return {
    messageId: randomUUID(),
    idempotencyKey: randomUUID(),
    sourceApp: SOURCE_APP,
    channel: 'email',
    // Fully qualified: the notifications catalog keys templates as
    // `<sourceApp>.<template>`, not by sourceApp plus a bare name.
    templateId: 'cv.contact-received',
    replyTo: input.email,
    recipient: { email: recipient },
    data: {
      name: input.name,
      email: input.email,
      message: input.message,
      locale: input.locale,
    },
    metadata: { source: 'cv-contact-form' },
    requestedAt: new Date().toISOString(),
  };
}
