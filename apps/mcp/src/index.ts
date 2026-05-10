#!/usr/bin/env node
// niahub-mcp — stdio ↔ HTTPS forwarder.
//
// Reads MCP JSON-RPC frames over stdio and forwards them to NiaHub's gateway
// at /api/mcp/<pack_id>. The MCP spec uses newline-delimited JSON-RPC over
// stdio, so each `\n`-terminated chunk is one frame in either direction.

import { Buffer } from 'node:buffer';

const PACK = process.env.NIAHUB_PACK;
const TOKEN = process.env.NIAHUB_TOKEN;
const BASE = process.env.NIAHUB_BASE ?? 'https://niahub.dev';

if (!PACK || !TOKEN) {
  process.stderr.write('niahub-mcp: NIAHUB_PACK and NIAHUB_TOKEN must be set in env.\n');
  process.exit(1);
}

const URL_ = `${BASE}/api/mcp/${encodeURIComponent(PACK)}`;

let buffer = '';
let inFlight = 0;
let stdinEnded = false;

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  void drain();
});

process.stdin.on('end', () => {
  stdinEnded = true;
  maybeExit();
});

function maybeExit(): void {
  if (stdinEnded && inFlight === 0) process.exit(0);
}

async function drain(): Promise<void> {
  while (true) {
    const nl = buffer.indexOf('\n');
    if (nl === -1) return;
    const line = buffer.slice(0, nl).replace(/\r$/, '');
    buffer = buffer.slice(nl + 1);
    if (line.length === 0) continue;
    void forward(line);
  }
}

async function forward(line: string): Promise<void> {
  inFlight++;
  let id: number | string | null = null;
  try {
    const parsed = JSON.parse(line) as { id?: number | string };
    if (parsed.id !== undefined) id = parsed.id;
  } catch {
    /* still attempt the request */
  }
  try {
    const res = await fetch(URL_, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${TOKEN}`,
      },
      body: line,
    });
    const text = await res.text();
    write(text);
  } catch (err) {
    const e = err as Error;
    write(JSON.stringify({
      jsonrpc: '2.0', id,
      error: { code: -32603, message: `niahub-mcp transport: ${e.message}` },
    }));
  } finally {
    inFlight--;
    maybeExit();
  }
}

function write(payload: string): void {
  process.stdout.write(payload + '\n');
}
