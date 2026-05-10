function read(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (fallback !== undefined) return fallback;
  return '';
}

export const env = {
  nia: {
    apiKey:  read('NIA_API_KEY'),
    apiBase: read('NIA_API_BASE', 'https://apigcp.trynia.ai/v2'),
    mcpBase: read('NIA_MCP_BASE', 'https://apigcp.trynia.ai/v2/mcp'),
  },
  insforge: {
    projectUrl: read('INSFORGE_PROJECT_URL'),
    anonKey:    read('INSFORGE_ANON_KEY'),
    serviceKey: read('INSFORGE_SERVICE_KEY'),
    databaseUrl: read('DATABASE_URL'),
  },
  tensorlake: {
    apiKey: read('TENSORLAKE_API_KEY'),
    project: read('TENSORLAKE_PROJECT', 'niahub-indexer'),
  },
  convex: {
    url: read('NEXT_PUBLIC_CONVEX_URL'),
    deployKey: read('CONVEX_DEPLOY_KEY'),
  },
  codex: {
    apiKey: read('CODEX_API_KEY'),
    model:  read('CODEX_MODEL', 'gpt-codex-1'),
  },
  devin: { apiKey: read('DEVIN_API_KEY') },
  hyperspell: { apiKey: read('HYPERSPELL_API_KEY') },
  app: {
    url: read('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
    signingSecret: read('NIAHUB_GATEWAY_SIGNING_SECRET', 'dev-secret-change-me'),
  },
};

// Per-sponsor demo flags. Each is independent — wiring InsForge doesn't
// require Nia, and vice versa. The legacy `inDemoMode` predicate stays as
// a synonym for "InsForge is offline" since that's what gates the db/auth
// paths in lib/insforge.ts.
export const inInsforgeDemoMode = !env.insforge.databaseUrl;
export const inNiaDemoMode      = !env.nia.apiKey;
export const inTensorlakeDemoMode = !env.tensorlake.apiKey;
export const inHyperspellDemoMode = !env.hyperspell.apiKey;
export const inCodexDemoMode      = !env.codex.apiKey;
export const inDevinDemoMode      = !env.devin.apiKey;
export const inDemoMode = inInsforgeDemoMode;
