// Canonical demo prompts per pack. Each maps to a snapshot in
// lib/nia/snapshots.json (when the pack has been bootstrapped + captured).
// Used by the "Try this question" buttons on the pack page and the playground.

export interface DemoPrompt {
  label: string;     // short button label
  query: string;     // full prompt sent to the gateway
}

export const DEMO_PROMPTS: Record<string, DemoPrompt[]> = {
  'stripe-api-current': [
    { label: '14-day Checkout trial', query: 'Create a Stripe Checkout Session for a subscription with a 14-day trial using the latest API' },
    { label: 'Verify webhook',        query: 'Verify a Stripe webhook signature using the latest Node SDK' },
    { label: 'Save card later',       query: 'Use Setup Intents to save a card without charging it now' },
  ],
  'react-core': [
    { label: 'Server Components stream', query: 'Show the recommended pattern for streaming a React Server Component with Suspense' },
    { label: 'State batching',           query: 'When does React batch state updates outside of event handlers?' },
  ],
  'nextjs-app-router': [
    { label: "'use cache' vs revalidate", query: "Explain when to use 'use cache' vs revalidatePath in App Router" },
    { label: 'Server action progress',    query: 'Stream a server action progress to a client component' },
  ],
  'postgres-17': [
    { label: 'pgvector HNSW',  query: 'Write a HNSW index DDL for pgvector with cosine distance' },
    { label: 'Generated tsvector', query: 'Use generated columns to maintain a tsvector for full-text search' },
  ],
  'aws-s3': [
    { label: 'Pre-signed PUT',     query: 'Generate a pre-signed PUT URL valid for 10 minutes with boto3' },
    { label: 'Resume multipart',   query: 'Resume a multipart upload after a network failure' },
  ],
  'tailwind-v4': [
    { label: 'v3 → v4 migration', query: 'Migrate a v3 tailwind.config.js to v4 CSS-first config' },
    { label: '@theme directive',  query: 'Use the new @theme directive to define a custom color palette' },
  ],
  'mcp-protocol': [
    { label: 'Stream progress', query: 'Define a tool that streams progress notifications back to the host' },
    { label: 'Expose resource', query: 'Expose a resource via the @modelcontextprotocol/sdk Server class' },
  ],
  'nozomio-self': [
    { label: 'Index private repo', query: 'Index a private GitHub repo with Nia and expose it via MCP to Cursor' },
    { label: 'Pick the right index', query: 'Use Nia Oracle to choose between two indexes for a given query' },
  ],
};

export function promptsFor(pack_id: string): DemoPrompt[] {
  return DEMO_PROMPTS[pack_id] ?? [];
}
