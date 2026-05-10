import { NextResponse } from 'next/server';

// Receives Aside extension events. Today: log only. Tomorrow: feed Convex
// `aside_event` table so the live ticker can show "@you opened Stripe docs
// → installed via Aside."
export async function POST(req: Request) {
  try {
    const body = await req.json();
    void body;
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true });
}
