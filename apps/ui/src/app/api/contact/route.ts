import { NextResponse } from 'next/server';

import { buildContactEvent, publishEmail } from '@/lib/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (typeof payload !== 'object' || payload === null) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const locale = typeof body.locale === 'string' ? body.locale : 'en';

  if (!name || name.length > MAX_NAME) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!message || message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: 'invalid_message' }, { status: 400 });
  }

  try {
    await publishEmail(buildContactEvent({ name, email, message, locale }));
  } catch (error) {
    // The submitter gets a generic failure; the detail stays in the logs the
    // ops stack already scrapes.
    console.error('[cv] contact publish failed', error);
    return NextResponse.json({ error: 'publish_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 202 });
}
