import { notFound } from 'next/navigation';
import { getPack } from '@/lib/insforge';
import { PackDetail } from '@/components/PackDetail';

export const dynamic = 'force-dynamic';

export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPack(id);
  if (!pack) notFound();

  const sources = normalizeSources(pack.sources);
  return <PackDetail pack={pack} sources={sources} />;
}

function normalizeSources(input: unknown): Array<{ type: string; url: string; note?: string }> {
  if (Array.isArray(input)) {
    return input.map((s) => {
      const o = s as Record<string, unknown>;
      return {
        type: String(o.type ?? 'docs'),
        url: String(o.url ?? ''),
        note: typeof o.branch === 'string'
          ? `branch: ${o.branch}`
          : typeof o.label_filters === 'object'
          ? 'filtered issues'
          : undefined,
      };
    });
  }
  return [];
}
