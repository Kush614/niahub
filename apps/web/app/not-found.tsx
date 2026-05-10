import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center pt-24 text-center">
      <h1 className="text-4xl font-semibold">Pack not found.</h1>
      <p className="mt-2 text-white/65">
        The pack you tried to open isn't on the marketplace yet.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md px-4 py-2 text-sm font-medium text-white"
        style={{ background: '#1f9eff' }}
      >
        Browse all packs
      </Link>
    </div>
  );
}
