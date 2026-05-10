import { NextResponse } from 'next/server';
import { getCuratorTask } from '@/lib/devin/curator';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ task_id: string }> },
) {
  const { task_id } = await params;
  const task = getCuratorTask(task_id);
  if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(task);
}
