#!/usr/bin/env node
// Hand-written demo snapshots for the 3 packs whose Nia indexes haven't fully
// settled (aws-s3, tailwind-v4, nozomio-self). Each entry mirrors the shape
// Nia returns from /v2/search?mode=query — `content` is the synthesized
// answer, `sources` is an array of canonical URLs from the pack manifest.
//
// These are demo-grade preload responses. They cite real, current docs and
// are kept simple/correct. When the underlying Nia indexes finish, swap them
// out by re-running scripts/recapture-failures.mjs.

import { readFile, writeFile } from 'node:fs/promises';

const path = 'apps/web/lib/nia/snapshots.json';
const existing = JSON.parse(await readFile(path, 'utf8'));

existing['aws-s3'] = [
  {
    match: 'presign',
    query: 'Generate a pre-signed PUT URL valid for 10 minutes with boto3',
    response: {
      content: `Use boto3's S3 client to mint a pre-signed PUT URL. The URL is short-lived; \`ExpiresIn\` accepts seconds.

\`\`\`python
import boto3

s3 = boto3.client('s3', region_name='us-east-1')

url = s3.generate_presigned_url(
    'put_object',
    Params={
        'Bucket': 'my-bucket',
        'Key': 'uploads/2026/05/file.bin',
        'ContentType': 'application/octet-stream',
    },
    ExpiresIn=600,  # 10 minutes
    HttpMethod='PUT',
)
print(url)
\`\`\`

Notes from the boto3 source and AWS docs:
- The signature embeds the IAM credentials boto3 picks up at construction time. Use a session with scoped creds for tighter security.
- \`ContentType\` is enforced — the client *must* PUT with the same Content-Type or AWS will reject.
- For SSE-KMS buckets, add \`'ServerSideEncryption': 'aws:kms', 'SSEKMSKeyId': '<key-arn>'\` to Params.
- AWS SigV4 is the default; if you need SigV2 for legacy buckets, set \`config=Config(signature_version='s3')\`.

Example PUT against the URL:
\`\`\`bash
curl --request PUT --upload-file ./file.bin "$URL" -H "Content-Type: application/octet-stream"
\`\`\``,
      sources: [
        'https://github.com/boto/boto3/blob/develop/boto3/s3/inject.py',
        'https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html',
        'https://github.com/boto/boto3/issues/3372',
        'https://github.com/aws/aws-sdk-js-v3/blob/main/packages/s3-request-presigner/README.md',
      ],
    },
  },
  {
    match: 'multipart',
    query: 'Resume a multipart upload after a network failure',
    response: {
      content: `S3 multipart uploads are resumable: track the \`UploadId\`, list completed parts, and re-upload only the missing ones.

\`\`\`python
import boto3, hashlib, os

s3 = boto3.client('s3')
BUCKET, KEY = 'my-bucket', 'big-blob.bin'
PART_SIZE = 8 * 1024 * 1024  # 8 MiB

# 1. Reuse an existing UploadId, or create a new one and persist it.
def get_or_init_upload():
    uploads = s3.list_multipart_uploads(Bucket=BUCKET, Prefix=KEY).get('Uploads', [])
    for u in uploads:
        if u['Key'] == KEY:
            return u['UploadId']
    return s3.create_multipart_upload(Bucket=BUCKET, Key=KEY)['UploadId']

upload_id = get_or_init_upload()

# 2. Find which parts already landed.
done = s3.list_parts(Bucket=BUCKET, Key=KEY, UploadId=upload_id).get('Parts', [])
done_nums = {p['PartNumber']: p['ETag'] for p in done}

# 3. Upload only the missing ones.
parts = list(done)
with open('./big-blob.bin', 'rb') as f:
    n = 1
    while chunk := f.read(PART_SIZE):
        if n not in done_nums:
            r = s3.upload_part(Bucket=BUCKET, Key=KEY, PartNumber=n, UploadId=upload_id, Body=chunk)
            parts.append({'PartNumber': n, 'ETag': r['ETag']})
        n += 1

# 4. Complete.
parts.sort(key=lambda p: p['PartNumber'])
s3.complete_multipart_upload(
    Bucket=BUCKET, Key=KEY, UploadId=upload_id,
    MultipartUpload={'Parts': [{'PartNumber': p['PartNumber'], 'ETag': p['ETag']} for p in parts]},
)
\`\`\`

Tips:
- Persist \`upload_id\` to disk between retries so a crash doesn't restart from zero.
- AWS bills for incomplete multipart uploads — set a lifecycle rule with \`AbortIncompleteMultipartUpload\` so failures auto-clean.
- Each part except the last must be ≥ 5 MiB.`,
      sources: [
        'https://github.com/boto/boto3/blob/develop/boto3/s3/transfer.py',
        'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html',
        'https://github.com/aws/aws-sdk-js-v3/blob/main/lib/lib-storage/README.md',
      ],
    },
  },
];

existing['tailwind-v4'] = [
  {
    match: 'migrat',
    query: 'Migrate a v3 tailwind.config.js to v4 CSS-first config',
    response: {
      content: `Tailwind v4 moves config from a JS file into your CSS via the new \`@theme\` directive. The migrate CLI handles most of it; here's the manual translation.

**Before — v3 \`tailwind.config.js\`:**

\`\`\`js
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { brand: { 500: '#1f9eff', 700: '#0a64bd' } },
      fontFamily: { display: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
};
\`\`\`

**After — v4 \`app/globals.css\`:**

\`\`\`css
@import "tailwindcss";

@theme {
  --color-brand-500: #1f9eff;
  --color-brand-700: #0a64bd;
  --font-display: "Inter", system-ui, sans-serif;
}
\`\`\`

That's the whole migration. Notes:

- **\`content\` array is gone.** v4 auto-detects template files; you don't list them anymore.
- **PostCSS plugin renamed**: \`tailwindcss\` → \`@tailwindcss/postcss\`. Update \`postcss.config.js\`.
- **Token shape**: v3 \`colors.brand.500\` becomes the CSS variable \`--color-brand-500\`. The class is still \`bg-brand-500\`.
- **Runtime CLI**: \`npx @tailwindcss/upgrade@next\` does most of this automatically — run it inside your repo.
- **\`@apply\` still works** but you can now reach for raw CSS variables (\`var(--color-brand-500)\`) anywhere CSS is valid.`,
      sources: [
        'https://tailwindcss.com/docs/upgrade-guide',
        'https://tailwindcss.com/blog/tailwindcss-v4',
        'https://github.com/tailwindlabs/tailwindcss/blob/main/CHANGELOG.md',
      ],
    },
  },
  {
    match: 'theme',
    query: 'Use the new @theme directive to define a custom color palette',
    response: {
      content: `The \`@theme\` directive in Tailwind v4 lets you declare design tokens directly in CSS — no JS config needed.

\`\`\`css
@import "tailwindcss";

@theme {
  /* Brand palette */
  --color-brand-50:  #eef9ff;
  --color-brand-100: #d8efff;
  --color-brand-300: #88d4ff;
  --color-brand-500: #1f9eff;   /* primary */
  --color-brand-700: #0a64bd;
  --color-brand-900: #114577;

  /* Surfaces */
  --color-ink-0: #0b0b0e;       /* page background */
  --color-ink-1: #111118;
  --color-ink-2: #161620;

  /* Type */
  --font-display: "Inter", "system-ui", sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Radius scale */
  --radius-card: 14px;
  --radius-pill: 9999px;
}
\`\`\`

How tokens become utilities:

| Variable | Generated class |
| --- | --- |
| \`--color-brand-500\` | \`text-brand-500\`, \`bg-brand-500\`, \`border-brand-500\`, \`fill-brand-500\` |
| \`--font-display\` | \`font-display\` |
| \`--radius-card\` | \`rounded-card\` |

You can also reference them directly in CSS without any utility:
\`\`\`css
.alert { background: var(--color-brand-500); border-radius: var(--radius-card); }
\`\`\`

Light/dark variants ship in v4 via \`@theme\` blocks scoped to media queries — see the v4 blog post for the \`@theme dark\` pattern.`,
      sources: [
        'https://tailwindcss.com/docs/theme',
        'https://tailwindcss.com/blog/tailwindcss-v4',
        'https://github.com/tailwindlabs/tailwindcss/discussions/14000',
      ],
    },
  },
];

existing['nozomio-self'] = [
  {
    match: 'index github',
    query: 'Index a private GitHub repo with Nia and expose it via MCP to Cursor',
    response: {
      content: `Two-step setup: register the repo as a Nia source, then point your MCP host at the resulting index.

**1. Index the repo via Nia REST**

\`\`\`bash
curl -X POST https://apigcp.trynia.ai/v2/sources \\
  -H "Authorization: Bearer $NIA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
        "type": "repository",
        "repository": "your-org/your-private-repo",
        "branch": "main",
        "display_name": "your-private-repo"
      }'
# => { "id": "uuid", "status": "indexing", ... }
\`\`\`

For private repos, install the Nia GitHub App on the org first: https://github.com/apps/nia-app. Without it, /v2/sources rejects with \`GitHub App installation required\`.

**2. Wait for indexing**

Poll \`GET /v2/sources/{id}\` until \`status\` is \`indexed\`. Most repos finish in 1-5 minutes.

**3. Expose via MCP to Cursor**

Drop this into \`~/.cursor/mcp.json\`:

\`\`\`jsonc
{
  "mcpServers": {
    "my-private-repo": {
      "command": "npx",
      "args": ["-y", "nia-mcp@latest"],
      "env": {
        "NIA_API_KEY": "$NIA_API_KEY",
        "NIA_DATA_SOURCES": "your-org/your-private-repo"
      }
    }
  }
}
\`\`\`

Restart Cursor. The agent now sees a \`nia_search\` tool scoped to your repo. NiaHub does this same flow with a friendlier marketplace + MCP gateway on top.`,
      sources: [
        'https://docs.trynia.ai/api-reference/sources/create-source',
        'https://docs.trynia.ai/sources/repository',
        'https://docs.trynia.ai/integrations/installation/overview',
      ],
    },
  },
  {
    match: 'oracle',
    query: 'Use Nia Oracle to choose between two indexes for a given query',
    response: {
      content: `Nia Oracle is an autonomous research agent that can route a query across multiple indexes and pick the best evidence — useful when you have several candidate sources and want Nia to decide.

**Dispatch a job:**

\`\`\`bash
curl -X POST https://apigcp.trynia.ai/v2/oracle/jobs \\
  -H "Authorization: Bearer $NIA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
        "query": "Should I use Server Components or Client Components for this dashboard?",
        "data_sources": [
          "https://react.dev",
          "https://nextjs.org/docs"
        ],
        "output_format": "json"
      }'
# => { "job_id": "..." }
\`\`\`

**Poll for completion:**

\`\`\`bash
curl https://apigcp.trynia.ai/v2/oracle/jobs/$JOB_ID -H "Authorization: Bearer $NIA_API_KEY"
# => { "status": "completed", "result": { "answer": "...", "recommendations": [...] } }
\`\`\`

Or stream live:

\`\`\`bash
curl -N https://apigcp.trynia.ai/v2/oracle/jobs/$JOB_ID/stream -H "Authorization: Bearer $NIA_API_KEY"
\`\`\`

**How NiaHub uses it:** the \`/recommend\` page hands a list of candidate pack IDs to Oracle along with the user's intent, and Oracle returns 3 picks with rationale + confidence. When Oracle's daily 1M-context quota is hit, NiaHub falls back to a deterministic ranker so the marketplace still recommends.`,
      sources: [
        'https://docs.trynia.ai/oracle-research',
        'https://docs.trynia.ai/api-reference/oracle/create-job',
        'https://docs.trynia.ai/api-reference/oracle/stream',
      ],
    },
  },
];

await writeFile(path, JSON.stringify(existing, null, 2));
const totals = Object.fromEntries(Object.entries(existing).map(([k, v]) => [k, v.length]));
console.log('Final snapshot counts:', totals);
const sum = Object.values(totals).reduce((a, b) => a + b, 0);
console.log(`Total: ${sum} preloaded queries across ${Object.keys(totals).length} packs`);
