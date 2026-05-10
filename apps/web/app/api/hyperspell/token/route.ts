import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/insforge';
import { mintUserToken, connectUrl } from '@/lib/hyperspell';
import { env } from '@/lib/env';

// Per docs.hyperspell.com/skills/oauth.md:
//   POST → mint a per-user token from the server (HYPERSPELL_API_KEY scope).
//   GET  → return both the token and a ready-to-use connect URL the
//          frontend can window.location.href to.
//
// The client never sees the API key; it only ever receives a short-lived
// user token bound to its user_id.

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = (await getCurrentUser()) ?? { id: 'usr_demo' };
  const { token } = await mintUserToken(user.id);
  return NextResponse.json({ token });
}

export async function GET(req: Request) {
  const user = (await getCurrentUser()) ?? { id: 'usr_demo' };
  const { token } = await mintUserToken(user.id);
  const url = new URL(req.url);
  const redirect = url.searchParams.get('redirect_uri') ??
    `${env.app.url}/account/connections`;
  return NextResponse.json({ token, connect_url: connectUrl(token, redirect) });
}
