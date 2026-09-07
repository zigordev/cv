import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ publishEmail: vi.fn() }));

vi.mock('@/lib/notifications', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/notifications')>()),
  publishEmail: mocks.publishEmail,
}));

import { POST } from './route';

const OWNER = 'owner@example.com';
const valid = { name: '  Ada  ', email: 'ada@example.com', message: 'Hello there', locale: 'en' };

let nextAddress = 1;
const freshAddress = () => `203.0.113.${nextAddress++}`;

const post = (body: unknown, ip: string) =>
  POST(
    new Request('http://cv.test/api/contact', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

describe('POST /api/contact', () => {
  beforeEach(() => {
    process.env.CONTACT_RECIPIENT_EMAIL = OWNER;
    mocks.publishEmail.mockReset();
    mocks.publishEmail.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CONTACT_RECIPIENT_EMAIL;
  });

  it('queues a valid submission to the owner, with the visitor only as reply-to', async () => {
    const response = await post(valid, freshAddress());

    expect(response.status).toBe(202);
    expect(mocks.publishEmail).toHaveBeenCalledTimes(1);
    const event = mocks.publishEmail.mock.calls[0][0];
    expect(event.recipient.email).toBe(OWNER);
    expect(event.replyTo).toBe('ada@example.com');
    expect(event.data.name).toBe('Ada');
  });

  it('answers malformed JSON with a 400, not a 500', async () => {
    const response = await post('{', freshAddress());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_json' });
    expect(mocks.publishEmail).not.toHaveBeenCalled();
  });

  it('refuses a body that is not an object and an address that is not an email', async () => {
    expect((await post('"text"', freshAddress())).status).toBe(400);
    const response = await post({ ...valid, email: 'not-an-email' }, freshAddress());

    expect(await response.json()).toEqual({ error: 'invalid_email' });
    expect(mocks.publishEmail).not.toHaveBeenCalled();
  });

  it('refuses the sixth submission from one address inside an hour, but not another address', async () => {
    const address = freshAddress();
    for (let i = 0; i < 5; i += 1) {
      expect((await post(valid, address)).status).toBe(202);
    }

    const sixth = await post(valid, address);
    expect(sixth.status).toBe(429);
    expect(await sixth.json()).toEqual({ error: 'rate_limited' });
    expect((await post(valid, freshAddress())).status).toBe(202);
    expect(mocks.publishEmail).toHaveBeenCalledTimes(6);
  });

  it('lets the same address submit again once the hour has slid past', async () => {
    const address = freshAddress();
    for (let i = 0; i < 5; i += 1) await post(valid, address);
    expect((await post(valid, address)).status).toBe(429);

    vi.advanceTimersByTime(60 * 60 * 1000 + 1);

    expect((await post(valid, address)).status).toBe(202);
  });

  it('reports a broker failure as 502 without leaking the cause', async () => {
    mocks.publishEmail.mockRejectedValueOnce(new Error('broker unreachable at 10.0.0.9'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await post(valid, freshAddress());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'publish_failed' });
    consoleError.mockRestore();
  });
});
