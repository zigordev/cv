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
    })
  );

let stdout: ReturnType<typeof vi.spyOn>;
let stderr: ReturnType<typeof vi.spyOn>;

const logged = () =>
  [...stdout.mock.calls, ...stderr.mock.calls].map(([line]) => JSON.parse(String(line)));

describe('POST /api/contact', () => {
  beforeEach(() => {
    stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    process.env.CONTACT_RECIPIENT_EMAIL = OWNER;
    mocks.publishEmail.mockReset();
    mocks.publishEmail.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.CONTACT_RECIPIENT_EMAIL;
  });

  it('writes one line for a queued message, with nothing the visitor typed in it', async () => {
    await post(valid, freshAddress());

    const records = logged().filter((record) => record.event === 'contact.queued');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ level: 'info', locale: 'en' });
    expect(JSON.stringify(records)).not.toContain('ada@example.com');
    expect(JSON.stringify(records)).not.toContain('Hello there');
    expect(JSON.stringify(records)).not.toContain('Ada');
  });

  it('names the rule a rejected message broke, and nothing else', async () => {
    await post({ ...valid, email: 'not-an-address' }, freshAddress());

    const records = logged().filter((record) => record.event === 'contact.rejected');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ code: 'CONTACT.INVALID_EMAIL', status: 400 });
    expect(JSON.stringify(records)).not.toContain('not-an-address');
  });

  it('writes exactly one error when the broker will not take the message', async () => {
    mocks.publishEmail.mockRejectedValue(new Error('no brokers available'));

    const response = await post(valid, freshAddress());
    expect(response.status).toBe(502);

    const errors = logged().filter((record) => record.level === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      event: 'contact.publish_failed',
      error: { name: 'Error', message: 'no brokers available' },
    });
    expect(JSON.stringify(errors)).not.toContain('ada@example.com');
  });

  it('says nothing at all about a rate-limited address', async () => {
    const ip = freshAddress();
    for (let index = 0; index < 20; index += 1) await post(valid, ip);

    const rejected = logged().filter(
      (record) => record.code === 'CONTACT.RATE_LIMITED' || record.status === 429
    );
    expect(rejected).toHaveLength(0);
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
    expect(await response.json()).toMatchObject({
      status: 400,
      code: 'CONTACT.INVALID_JSON',
    });
    expect(mocks.publishEmail).not.toHaveBeenCalled();
  });

  it('sends the problem content type and the full RFC 9457 shape', async () => {
    const response = await post({ ...valid, email: 'not-an-email' }, freshAddress());

    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(await response.json()).toEqual({
      type: 'https://zigordev.com/problems/contact-invalid-email',
      title: 'Bad request',
      status: 400,
      detail: 'A valid email address is required.',
      instance: '/api/contact',
      code: 'CONTACT.INVALID_EMAIL',
      params: { maxLength: 254 },
    });
  });

  it('refuses an address longer than an email can be', async () => {
    const response = await post(
      { ...valid, email: `${'a'.repeat(250)}@example.com` },
      freshAddress()
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      status: 400,
      code: 'CONTACT.INVALID_EMAIL',
    });
  });

  it('rejects the shapes the previous pattern accepted or backtracked on', async () => {
    for (const email of ['ada@example..com', 'ada@example.', 'ada@.com', '!@!.!.!.!.']) {
      const response = await post({ ...valid, email }, freshAddress());

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        status: 400,
        code: 'CONTACT.INVALID_EMAIL',
      });
    }
  });

  it('still accepts an address with several domain labels', async () => {
    const response = await post({ ...valid, email: 'ada@mail.example.co.uk' }, freshAddress());

    expect(response.status).toBe(202);
  });

  it('refuses a body that is not an object and an address that is not an email', async () => {
    expect((await post('"text"', freshAddress())).status).toBe(400);
    const response = await post({ ...valid, email: 'not-an-email' }, freshAddress());

    expect(await response.json()).toMatchObject({
      status: 400,
      code: 'CONTACT.INVALID_EMAIL',
    });
    expect(mocks.publishEmail).not.toHaveBeenCalled();
  });

  it('refuses the sixth submission from one address inside an hour, but not another address', async () => {
    const address = freshAddress();
    for (let i = 0; i < 5; i += 1) {
      expect((await post(valid, address)).status).toBe(202);
    }

    const sixth = await post(valid, address);
    expect(sixth.status).toBe(429);
    expect(await sixth.json()).toMatchObject({
      status: 429,
      code: 'CONTACT.RATE_LIMITED',
    });
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
    expect(await response.json()).toMatchObject({
      status: 502,
      code: 'CONTACT.PUBLISH_FAILED',
    });
    consoleError.mockRestore();
  });
});
