import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness for the compose healthcheck and the deploy smoke probe. */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    release: process.env.NEXT_PUBLIC_RELEASE ?? 'dev',
  });
}
