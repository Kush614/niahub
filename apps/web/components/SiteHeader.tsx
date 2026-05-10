import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-semibold tracking-tight">NiaHub</span>
          <span className="ml-2 hidden rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] uppercase text-white/60 sm:inline">
            Marketplace
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="rounded-md px-3 py-1.5 text-white/80 hover:bg-white/5 hover:text-white">Browse</Link>
          <Link href="/playground" className="rounded-md px-3 py-1.5 text-white/80 hover:bg-white/5 hover:text-white">Playground</Link>
          <Link href="/recommend" className="rounded-md px-3 py-1.5 text-white/80 hover:bg-white/5 hover:text-white">Recommend</Link>
          <Link href="/create" className="rounded-md px-3 py-1.5 text-white/80 hover:bg-white/5 hover:text-white">Create</Link>
          <Link href="/about" className="rounded-md px-3 py-1.5 text-white/80 hover:bg-white/5 hover:text-white">About</Link>
          <Link href="/me" className="rounded-md px-3 py-1.5 text-white/80 hover:bg-white/5 hover:text-white">Me</Link>
          <Link
            href="https://github.com/nozomio/niahub"
            className="ml-2 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-white hover:bg-white/10"
          >
            GitHub
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1f9eff" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0b0b0e" />
      <path d="M16 46 V18 h6 l20 22 V18 h6 v28 h-6 L22 24 v22 z" fill="url(#lg)" />
    </svg>
  );
}
