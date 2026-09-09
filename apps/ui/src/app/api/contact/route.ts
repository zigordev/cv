import { NextResponse } from 'next/server';

import { buildContactEvent, publishEmail } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const MAX_EMAIL = 254;
const MAX_NAME = 120;
const MAX_MESSAGE = 4000;

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

/*
 * In-memory, per-IP, best-effort. The app runs as a single container behind
 * one compose service, so a process-local map is the honest scope here: it
 * stops a bored visitor from flooding the inbox. It is NOT a defence against a
 * distributed flood — if that ever matters, move this to the shared Redis the
 * ops stack already runs, or put a WAF rule in front.
 */
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((at) => now - at < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent);
    return true;
  }

  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic sweep so the map cannot grow without bound.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((at) => now - at >= RATE_LIMIT_WINDOW_MS)) hits.delete(key);
    }
  }

  return false;
}

const PROBLEM_TYPE_BASE = 'https://zigordev.com/problems';
const PROBLEM_CONTENT_TYPE = 'application/problem+json';

const TITLES: Record<number, string> = {
  400: 'Bad request',
  429: 'Too many requests',
  502: 'Bad gateway',
};

function problem(
  status: number,
  code: string,
  detail: string,
  params?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      type: `${PROBLEM_TYPE_BASE}/${code.toLowerCase().replace(/[._]/g, '-')}`,
      title: TITLES[status] ?? 'Error',
      status,
      detail,
      instance: '/api/contact',
      code,
      ...(params ? { params } : {}),
    },
    { status, headers: { 'Content-Type': PROBLEM_CONTENT_TYPE } }
  );
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return problem(
      429,
      'CONTACT.RATE_LIMITED',
      'Too many messages from this address; try again later.'
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return problem(400, 'CONTACT.INVALID_JSON', 'The request body is not valid JSON.');
  }

  if (typeof payload !== 'object' || payload === null) {
    return problem(400, 'CONTACT.INVALID_PAYLOAD', 'The request body must be a JSON object.');
  }

  const body = payload as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const locale = typeof body.locale === 'string' ? body.locale : 'en';

  if (!name || name.length > MAX_NAME) {
    return problem(
      400,
      'CONTACT.INVALID_NAME',
      'A name is required and must be at most 120 characters.',
      { maxLength: MAX_NAME }
    );
  }
  if (email.length > MAX_EMAIL || !EMAIL_PATTERN.test(email)) {
    return problem(400, 'CONTACT.INVALID_EMAIL', 'A valid email address is required.', {
      maxLength: MAX_EMAIL,
    });
  }
  if (!message || message.length > MAX_MESSAGE) {
    return problem(
      400,
      'CONTACT.INVALID_MESSAGE',
      'A message is required and must be at most 4000 characters.',
      { maxLength: MAX_MESSAGE }
    );
  }

  try {
    await publishEmail(buildContactEvent({ name, email, message, locale }));
  } catch (error) {
    // The submitter gets a generic failure; the detail stays in the logs the
    // ops stack already scrapes.
    console.error('[cv] contact publish failed', error);
    return problem(502, 'CONTACT.PUBLISH_FAILED', 'The message could not be queued for delivery.');
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
