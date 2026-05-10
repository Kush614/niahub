import { NextResponse } from 'next/server';
import { getCurrentUser, query, listPacks } from '@/lib/insforge';
import { inInsforgeDemoMode } from '@/lib/env';

// User analytics: installed packs, recent queries, queries-per-day chart.
// All real Postgres aggregates from the InsForge-managed DB.

export const dynamic = 'force-dynamic';

interface InstalledPack {
  pack_id: string;
  display_name: string;
  installed_at: string;
  agent_kind: string | null;
  query_count: number;
  last_query_at: string | null;
}

interface DayPoint { day: string; count: number }

export async function GET() {
  const user = (await getCurrentUser()) ?? { id: 'usr_demo', email: 'demo@niahub.dev', display_name: 'Demo User', avatar_url: null, plan: 'free' as const };

  if (inInsforgeDemoMode) {
    return NextResponse.json({
      user,
      installed: [],
      total_subs: 0,
      total_queries: 0,
      daily: [],
    });
  }

  const subsRes = await query<{
    sub_id: string;
    pack_id: string;
    display_name: string;
    agent_kind: string | null;
    installed_at: string;
    last_query_at: string | null;
    query_count: string;
  }>(
    `select s.sub_id, s.pack_id, p.display_name, s.agent_kind, s.installed_at, s.last_query_at,
            (select count(*) from query_events e where e.sub_id = s.sub_id) as query_count
       from subscriptions s
       join packs p on p.pack_id = s.pack_id
       where s.user_id = $1
       order by s.installed_at desc`,
    [user.id],
  );
  const installed: InstalledPack[] = subsRes.rows.map((r) => ({
    pack_id: r.pack_id,
    display_name: r.display_name,
    agent_kind: r.agent_kind,
    installed_at: r.installed_at,
    last_query_at: r.last_query_at,
    query_count: Number(r.query_count),
  }));

  const dailyRes = await query<{ day: string; count: string }>(
    `select to_char(date_trunc('day', e.ts) at time zone 'UTC', 'YYYY-MM-DD') as day,
            count(*)::text as count
       from query_events e
       join subscriptions s on s.sub_id = e.sub_id
       where s.user_id = $1
         and e.ts > now() - interval '14 days'
       group by 1
       order by 1`,
    [user.id],
  );
  const daily: DayPoint[] = dailyRes.rows.map((r) => ({ day: r.day, count: Number(r.count) }));

  const totalsRes = await query<{ subs: string; queries: string }>(
    `select
       (select count(*)::text from subscriptions where user_id = $1) as subs,
       (select count(*)::text from query_events e join subscriptions s on s.sub_id = e.sub_id where s.user_id = $1) as queries`,
    [user.id],
  );

  return NextResponse.json({
    user,
    installed,
    total_subs: Number(totalsRes.rows[0]?.subs ?? 0),
    total_queries: Number(totalsRes.rows[0]?.queries ?? 0),
    daily,
  });
}
