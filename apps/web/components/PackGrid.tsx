import type { PackRow } from '@/lib/insforge';
import { PackCard } from '@/components/PackCard';

export function PackGrid({ packs }: { packs: PackRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {packs.map((p) => (
        <PackCard key={p.pack_id} pack={p} />
      ))}
    </div>
  );
}
