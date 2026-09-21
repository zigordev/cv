import { trace } from '@opentelemetry/api';
import { NextResponse } from 'next/server';

const PROBLEM_TYPE_BASE = 'https://zigordev.com/problems';
const PROBLEM_CONTENT_TYPE = 'application/problem+json';

const TITLES: Record<number, string> = {
  400: 'Bad request',
  413: 'Payload too large',
  415: 'Unsupported media type',
  429: 'Too many requests',
  502: 'Bad gateway',
  503: 'Service unavailable',
};

export function problem(
  instance: string,
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
      instance,
      code,
      ...(params ? { params } : {}),
      // A 5xx is the one a visitor might report. The trace id is what turns
      // "it failed at about half past two" into the request itself.
      ...(status >= 500 ? { traceId: activeTraceId() } : {}),
    },
    { status, headers: { 'Content-Type': PROBLEM_CONTENT_TYPE } }
  );
}

function activeTraceId(): string | undefined {
  return trace.getActiveSpan()?.spanContext().traceId || undefined;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}
