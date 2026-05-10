// Generates the JSON snippet a user pastes into their MCP-host's config file.
// Single source of truth — used by the pack page, the Oracle "install all"
// flow, and the Aside extension's one-click installer.

export interface SnippetOpts {
  pack_id: string;
  token: string;
  // Optional: scope to a single agent kind. The default snippet is universal —
  // the same bytes work in Cursor, Claude Code, and Codex.
  agent_kind?: 'cursor' | 'claude_code' | 'codex';
  // For multi-pack install: include several packs in one block.
  extra?: Array<{ pack_id: string; token: string }>;
}

export function buildInstallSnippet(opts: SnippetOpts): string {
  const all = [{ pack_id: opts.pack_id, token: opts.token }, ...(opts.extra ?? [])];
  const servers: Record<string, unknown> = {};
  for (const p of all) {
    servers[`niahub-${p.pack_id}`] = {
      command: 'npx',
      args: ['-y', 'niahub-mcp@latest'],
      env: {
        NIAHUB_PACK: p.pack_id,
        NIAHUB_TOKEN: p.token,
      },
    };
  }
  return JSON.stringify({ mcpServers: servers }, null, 2);
}

// Cursor-friendly file path hint. Used by the InstallSnippet component.
export function configHintFor(agent: SnippetOpts['agent_kind']): string {
  switch (agent) {
    case 'cursor':       return '~/.cursor/mcp.json';
    case 'claude_code':  return '~/.claude.json (or .mcp.json in your project)';
    case 'codex':        return '~/.codex/mcp.json';
    default:             return '~/.cursor/mcp.json or your agent\'s MCP config';
  }
}
