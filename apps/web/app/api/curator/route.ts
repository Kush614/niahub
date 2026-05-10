import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/insforge';
import { dispatchCuratorTask, listCuratorTasks } from '@/lib/devin/curator';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ tasks: listCuratorTasks() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    description: string;
    source_urls: string[];
    refresh_cadence?: 'hourly' | 'daily' | 'webhook';
  };
  if (!body.description || !body.source_urls?.length) {
    return NextResponse.json({ error: 'description and source_urls required' }, { status: 400 });
  }
  const user = (await getCurrentUser()) ?? { id: 'usr_demo' };
  const task = await dispatchCuratorTask({
    user_id: user.id,
    description: body.description,
    source_urls: body.source_urls,
    refresh_cadence: body.refresh_cadence ?? 'daily',
  });
  return NextResponse.json(task, { status: 201 });
}
