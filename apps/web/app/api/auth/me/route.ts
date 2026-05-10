import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/insforge';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
