import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-12 max-w-6xl border-t border-white/5 px-6 py-10 text-sm text-white/55">
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="font-semibold text-white">NiaHub</div>
          <p className="mt-2 leading-relaxed">
            Pre-indexed, continuously synced knowledge packs for any MCP-compatible agent.
          </p>
        </div>
        <div>
          <div className="font-semibold text-white">Browse</div>
          <ul className="mt-2 space-y-1.5">
            <li><Link href="/" className="hover:text-white">All packs</Link></li>
            <li><Link href="/recommend" className="hover:text-white">Recommend</Link></li>
            <li><Link href="/create" className="hover:text-white">Create a pack</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white">Built on</div>
          <ul className="mt-2 space-y-1.5">
            <li>Nia · Tensorlake · Convex</li>
            <li>InsForge · Vercel · Codex</li>
            <li>Devin · Hyperspell · Aside</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold text-white">Status</div>
          <p className="mt-2">
            Hackathon build · May 9, 2026 · San Francisco
          </p>
        </div>
      </div>
      <div className="mt-8 flex items-center justify-between">
        <span>Apache-2.0</span>
        <span>Made for the Nozomio Hackathon</span>
      </div>
    </footer>
  );
}
