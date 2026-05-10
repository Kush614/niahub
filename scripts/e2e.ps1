#!/usr/bin/env pwsh
# End-to-end NiaHub smoke test. Prints PASS/FAIL per check, exits 1 on any failure.

$ErrorActionPreference = 'Continue'
$PSDefaultParameterValues['*:Verbose'] = $false

$script:pass = 0
$script:fail = 0
$script:fails = @()

function Check($label, [scriptblock]$test) {
  try {
    $result = & $test
    $ok = if ($result -is [bool]) { $result } else { $true }
    if ($ok) {
      Write-Host ('  [PASS] ' + $label) -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host ('  [FAIL] ' + $label) -ForegroundColor Red
      $script:fail++
      $script:fails += $label
    }
  } catch {
    Write-Host ('  [FAIL] ' + $label + ' — ' + $_.Exception.Message) -ForegroundColor Red
    $script:fail++
    $script:fails += $label
  }
}

function Section($name) { Write-Host ''; Write-Host ('— ' + $name + ' —') -ForegroundColor Cyan }

# Read all secrets from apps/web/.env.local. Never hardcode keys in tracked files.
$envFile = Join-Path $PSScriptRoot '..\apps\web\.env.local'
if (-not (Test-Path $envFile)) { Write-Host 'no apps/web/.env.local — fill in from .env.example' -ForegroundColor Red; exit 1 }
$envMap = @{}
foreach ($l in Get-Content $envFile) {
  if ($l -match '^\s*([^#=][^=]*)=(.*)$') { $envMap[$matches[1].Trim()] = $matches[2].Trim() }
}

$BASE   = 'http://localhost:3000'
$DEPLOY = $envMap['CONVEX_DEPLOYMENT']
$DB     = $envMap['DATABASE_URL']
$NIA    = $envMap['NIA_API_KEY']
$TL     = $envMap['TENSORLAKE_API_KEY']
$DV     = $envMap['DEVIN_API_KEY']
$HS     = $envMap['HYPERSPELL_API_KEY']
$OAI    = $envMap['CODEX_API_KEY']
$SIGN   = $envMap['NIAHUB_GATEWAY_SIGNING_SECRET']

Write-Host '════════════════════════════════════════════' -ForegroundColor Yellow
Write-Host ' NiaHub end-to-end test' -ForegroundColor Yellow
Write-Host '════════════════════════════════════════════' -ForegroundColor Yellow

# ───────────────────────────────────────────────────────────────────────────
Section 'Vercel / Next pages'

$pages = @('/', '/recommend', '/create', '/packs/stripe-api-current', '/packs/react-core', '/packs/postgres-17', '/api/packs', '/api/auth/me', '/api/hyperspell/company-pack')
foreach ($p in $pages) {
  Check ('GET ' + $p + ' = 200') { (Invoke-WebRequest "$BASE$p" -UseBasicParsing -TimeoutSec 30).StatusCode -eq 200 }
}
Check 'home contains live ticker dot' { (Invoke-WebRequest "$BASE/" -UseBasicParsing -TimeoutSec 30).Content -match 'Live' }
Check 'pack page contains hallucination score' { (Invoke-WebRequest "$BASE/packs/stripe-api-current" -UseBasicParsing -TimeoutSec 30).Content -match 'Hallucination' }

# ───────────────────────────────────────────────────────────────────────────
Section 'InsForge / Postgres'

$packs = (Invoke-RestMethod "$BASE/api/packs" -TimeoutSec 30).packs
Check ('packs from real DB count = 8') { $packs.Count -eq 8 }
Check 'pack with real Nia category id (stripe)' {
  ($packs | Where-Object { $_.pack_id -eq 'stripe-api-current' }).nia_index_id -eq '20f22572-6805-41eb-9114-3f7b989ca7e9'
}

$env:DATABASE_URL = $DB
$pgrows = (npx @insforge/cli@latest db query "select count(*) c from packs where visibility='public'" --json 2>$null | ConvertFrom-Json).rows[0]
Check 'direct pg select packs count = 8' { [int]$pgrows.c -eq 8 }

$subBefore = ((npx @insforge/cli@latest db query "select count(*) c from subscriptions" --json 2>$null) | ConvertFrom-Json).rows[0].c

# ───────────────────────────────────────────────────────────────────────────
Section 'Subscribe + MCP gateway (real Nia + real Codex)'

$sub = Invoke-RestMethod "$BASE/api/subscriptions" -Method POST -Body (@{ pack_ids=@('stripe-api-current'); agent_kind='cursor' } | ConvertTo-Json) -ContentType 'application/json'
$tok = $sub.tokens.'stripe-api-current'
Check 'token starts with tok_' { $tok -like 'tok_*' }
Check 'snippet contains niahub-mcp' { $sub.snippet -match 'niahub-mcp' }

$body = @{ jsonrpc='2.0'; id=1; method='tools/list' } | ConvertTo-Json -Compress
$tl = Invoke-RestMethod "$BASE/api/mcp/stripe-api-current" -Method POST -Body $body -ContentType 'application/json' -Headers @{ Authorization="Bearer $tok" } -TimeoutSec 30
Check 'tools/list returns 3 tools' { $tl.result.tools.Count -eq 3 }
Check 'tool niahub_search_pack present' { $tl.result.tools.name -contains 'niahub_search_pack' }

$body = @{ jsonrpc='2.0'; id=2; method='tools/call'; params=@{ name='niahub_search_pack'; arguments=@{ query='Stripe checkout subscription with 14 day trial'; k=2 } } } | ConvertTo-Json -Compress -Depth 6
$mcp = Invoke-RestMethod "$BASE/api/mcp/stripe-api-current" -Method POST -Body $body -ContentType 'application/json' -Headers @{ Authorization="Bearer $tok" } -TimeoutSec 120
Check 'real chunks returned (no demo placeholder)' { -not ($mcp.result.content[0].text -match "isn't indexed on your Nia account") }
Check 'response cites Stripe sources' { $mcp.result.content[0].text -match '(?i)stripe' }
Check 'why-this-answer trace from real Codex' { $mcp.result.content[1].text.Length -gt 50 -and -not ($mcp.result.content[1].text -match 'docs\.stripe\.com and github\.com.*; the answer cites') }

$subAfter = ((npx @insforge/cli@latest db query "select count(*) c from subscriptions" --json 2>$null) | ConvertFrom-Json).rows[0].c
Check ('subscriptions row inserted (' + $subBefore + ' → ' + $subAfter + ')') { [int]$subAfter -gt [int]$subBefore }

$qe = ((npx @insforge/cli@latest db query "select count(*) c from query_events" --json 2>$null) | ConvertFrom-Json).rows[0].c
Check ('query_events row inserted (count = ' + $qe + ')') { [int]$qe -ge 1 }

# ───────────────────────────────────────────────────────────────────────────
Section 'Nia direct API (auth + Oracle)'

$h = @{ Authorization = "Bearer $NIA" }
Check 'Nia /v2/sources auth = 200' { (Invoke-WebRequest 'https://apigcp.trynia.ai/v2/sources?limit=10' -Headers $h -UseBasicParsing -TimeoutSec 30).StatusCode -eq 200 }
$cats = Invoke-RestMethod 'https://apigcp.trynia.ai/v2/categories' -Headers $h -TimeoutSec 30
Check 'Nia category stripe-api-current exists' { ($cats.items | Where-Object { $_.name -eq 'stripe-api-current' }) -ne $null }
$srcs = Invoke-RestMethod 'https://apigcp.trynia.ai/v2/sources?limit=100' -Headers $h -TimeoutSec 30
Check 'Nia ≥ 1 indexed source for stripe pack' { ($srcs.items | Where-Object { $_.display_name -eq 'stripe-api-current' -and $_.status -in @('completed','indexed') }).Count -ge 1 }

$rec = Invoke-RestMethod "$BASE/api/recommend" -Method POST -Body (@{ user_intent='SaaS in Next.js with Stripe and Postgres' } | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 90
Check '/api/recommend returns 3 picks' { $rec.picks.Count -eq 3 }
Check '/api/recommend includes stripe-api-current' { $rec.picks.pack_id -contains 'stripe-api-current' }

# ───────────────────────────────────────────────────────────────────────────
Section 'Tensorlake sandbox refresh'

$refRowsBefore = ((npx @insforge/cli@latest db query "select count(*) c from refresh_runs" --json 2>$null) | ConvertFrom-Json).rows[0].c
$ref = Invoke-RestMethod "$BASE/api/refresh" -Method POST -Body (@{ pack_id='stripe-api-current' } | ConvertTo-Json) -ContentType 'application/json' -Headers @{ Authorization="Bearer $SIGN" } -TimeoutSec 300
Check '/api/refresh returns runs[]' { $ref.runs.Count -ge 1 }
Check '/api/refresh status = success' { $ref.runs[0].status -eq 'success' }
$refRowsAfter = ((npx @insforge/cli@latest db query "select count(*) c from refresh_runs" --json 2>$null) | ConvertFrom-Json).rows[0].c
Check ('refresh_runs row appended (' + $refRowsBefore + ' → ' + $refRowsAfter + ')') { [int]$refRowsAfter -gt [int]$refRowsBefore }

# (Cross-check against api.tensorlake.ai/sandboxes hits the same rate-limit
# bucket as /api/refresh. The DB row append above already proves the sandbox
# spun successfully — skip the duplicate query.)

# ───────────────────────────────────────────────────────────────────────────
Section 'Codex (OpenAI) — benchmark route + direct'

$h = @{ Authorization = "Bearer $OAI" }
Check 'OpenAI /v1/models = 200' { (Invoke-WebRequest 'https://api.openai.com/v1/models' -Headers $h -UseBasicParsing -TimeoutSec 30).StatusCode -eq 200 }

$bench = Invoke-RestMethod "$BASE/api/benchmark" -Method POST `
  -Body (@{ pack_id='stripe-api-current'; questions=@(@{ question='How do I create a Stripe Checkout subscription with a trial?'; expected_topic='trial_period_days subscription_data on Checkout Session' }) } | ConvertTo-Json -Depth 5) `
  -ContentType 'application/json' -Headers @{ Authorization="Bearer $SIGN" } -TimeoutSec 240
Check '/api/benchmark returns with_pack_score 0..1' { $bench.with_pack_score -ge 0 -and $bench.with_pack_score -le 1 }
Check '/api/benchmark returns baseline_score 0..1' { $bench.baseline_score -ge 0 -and $bench.baseline_score -le 1 }
Check '/api/benchmark returns 1 example' { $bench.examples.Count -eq 1 }

# ───────────────────────────────────────────────────────────────────────────
Section 'Devin curator session'

$task = Invoke-RestMethod "$BASE/api/curator" -Method POST `
  -Body (@{ description='Smoke pack — Postgres GIN indexes'; source_urls=@('https://www.postgresql.org/docs/17/gin.html'); refresh_cadence='daily' } | ConvertTo-Json) `
  -ContentType 'application/json' -TimeoutSec 60
Check 'devin task_id starts with devin-' { $task.task_id -like 'devin-*' }
Check 'devin preview_url is real app.devin.ai URL' { $task.preview_url -like 'https://app.devin.ai/sessions/*' }

$h = @{ Authorization = "Bearer $DV" }
Start-Sleep -Seconds 3
$detail = Invoke-RestMethod ('https://api.devin.ai/v1/session/' + $task.task_id) -Headers $h -TimeoutSec 30
Check 'Devin session exists in their account' { $detail.session_id -eq $task.task_id }
Check 'Devin session has niahub tag' { $detail.tags -contains 'niahub' }

# ───────────────────────────────────────────────────────────────────────────
Section 'Hyperspell token + connect URL'

$tk = Invoke-RestMethod "$BASE/api/hyperspell/token" -Method POST -TimeoutSec 30
Check 'token is a JWT (3 dot-separated parts)' { ($tk.token -split '\.').Count -eq 3 }

# Decode payload to verify it's bound to our app
$mid = ($tk.token -split '\.')[1]
$mid = $mid.PadRight(([Math]::Ceiling($mid.Length / 4) * 4), '=')
$payload = ([System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($mid.Replace('-','+').Replace('_','/')))) | ConvertFrom-Json
Check 'JWT bound to ref=kush' { $payload.ref -eq 'kush' }
Check 'JWT issued by hyperspell' { $payload.iss -eq 'hyperspell' }

$tk2 = Invoke-RestMethod "$BASE/api/hyperspell/token" -TimeoutSec 30
Check 'connect_url points at connect.hyperspell.com' { $tk2.connect_url -like 'https://connect.hyperspell.com*' }

$cp = Invoke-RestMethod "$BASE/api/hyperspell/company-pack" -Method POST -Body (@{ workspace_id='hs:usr_demo'; pack_name='Smoke Test' } | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 60
Check '/api/hyperspell/company-pack returns pack_id' { $cp.pack_id -like 'private-*' }

# ───────────────────────────────────────────────────────────────────────────
Section 'Convex live feed'

$env:CONVEX_DEPLOYMENT = $DEPLOY
$null = Invoke-RestMethod "$BASE/api/subscriptions" -Method POST -Body (@{ pack_ids=@('aws-s3'); agent_kind='codex' } | ConvertTo-Json) -ContentType 'application/json' -TimeoutSec 30
Start-Sleep -Seconds 3
# The latest query is capped at 24 — count stays stable once full, so we
# verify the *newest* event matches the install we just fired.
$feed = npx convex run feed:latest --no-push 2>$null | ConvertFrom-Json
Check 'Convex feed has events' { $feed.Count -ge 1 }
Check 'newest event is the install we just made' { $feed[0].kind -eq 'install' -and $feed[0].pack_id -eq 'aws-s3' -and $feed[0].agent_kind -eq 'codex' }

# ───────────────────────────────────────────────────────────────────────────
Section 'niahub-mcp build'

Push-Location apps/mcp
try {
  npm run build 2>&1 | Out-Null
  Check 'apps/mcp/dist/index.js exists' { Test-Path 'dist/index.js' }
  Check 'shebang on first line' { (Get-Content 'dist/index.js' -First 1) -match '^#!/usr/bin/env node' }
} finally { Pop-Location }

# ───────────────────────────────────────────────────────────────────────────
Section 'Failure modes'

# Bad token
try {
  $body = @{ jsonrpc='2.0'; id=99; method='tools/list' } | ConvertTo-Json -Compress
  $bad = Invoke-RestMethod "$BASE/api/mcp/stripe-api-current" -Method POST -Body $body -ContentType 'application/json' -Headers @{ Authorization='Bearer tok_NOPE' } -TimeoutSec 15
  Check 'bad token → JSON-RPC error -32002' { $bad.error.code -eq -32002 }
} catch { Check 'bad token → JSON-RPC error -32002' { $false } }

# Unknown pack
try {
  $resp = Invoke-WebRequest "$BASE/packs/does-not-exist" -UseBasicParsing -TimeoutSec 15
  Check 'unknown pack → 404' { $resp.StatusCode -eq 404 }
} catch {
  Check 'unknown pack → 404' { $_.Exception.Response.StatusCode.value__ -eq 404 }
}

# Bad subscriptions request
try {
  $resp = Invoke-WebRequest "$BASE/api/subscriptions" -Method POST -Body '{}' -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15
  Check 'subscribe missing pack_ids → 400' { $resp.StatusCode -eq 400 }
} catch {
  Check 'subscribe missing pack_ids → 400' { $_.Exception.Response.StatusCode.value__ -eq 400 }
}

# Refresh without signing secret
try {
  $resp = Invoke-WebRequest "$BASE/api/refresh" -Method POST -Body '{}' -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15
  Check 'refresh without auth → 401' { $resp.StatusCode -eq 401 }
} catch {
  Check 'refresh without auth → 401' { $_.Exception.Response.StatusCode.value__ -eq 401 }
}

# ───────────────────────────────────────────────────────────────────────────
Write-Host ''
Write-Host '════════════════════════════════════════════' -ForegroundColor Yellow
$total = $pass + $fail
$summaryColor = if ($fail -eq 0) { 'Green' } else { 'Red' }
Write-Host (' ' + $pass + ' / ' + $total + ' passed') -ForegroundColor $summaryColor
if ($fail -gt 0) {
  Write-Host ''
  Write-Host 'Failures:' -ForegroundColor Red
  foreach ($f in $fails) { Write-Host ('  - ' + $f) -ForegroundColor Red }
  exit 1
} else {
  Write-Host ' All sponsors live, end-to-end.' -ForegroundColor Green
  exit 0
}
