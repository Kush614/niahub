'use client';

import { useMemo } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Conditionally wrap children in a Convex provider. If NEXT_PUBLIC_CONVEX_URL
// isn't set we render children plain — `useLiveFeed` will then fall back to
// its synthetic generator and the rest of the app keeps working.

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(() => (url ? new ConvexReactClient(url) : null), [url]);
  if (!client) return <>{children}</>;
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
