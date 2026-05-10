# niahub-mcp

A tiny MCP client that forwards JSON-RPC over stdio to a NiaHub pack endpoint.

## Install

You don't install it. MCP hosts (Cursor, Claude Code, Codex) launch it on demand
via `npx`. Drop this into your `mcp.json`:

```json
{
  "mcpServers": {
    "niahub-stripe": {
      "command": "npx",
      "args": ["-y", "niahub-mcp@latest"],
      "env": {
        "NIAHUB_PACK": "stripe-api-current",
        "NIAHUB_TOKEN": "tok_..."
      }
    }
  }
}
```

## Env

| Variable | Required | Description |
|---|---|---|
| `NIAHUB_PACK`  | yes | Pack id, e.g. `stripe-api-current`. |
| `NIAHUB_TOKEN` | yes | Subscription token from niahub.dev. |
| `NIAHUB_BASE`  | no  | Override gateway. Defaults to `https://niahub.dev`. |

## What it exposes

The pack endpoint speaks standard MCP. Tools surfaced:

- `niahub_search_pack(query, k?)` — top-k chunks with citations.
- `niahub_save_context(key, value)` — cross-session memory write.
- `niahub_retrieve_context(key)` — cross-session memory read.

License: Apache-2.0.
