# Reads apps/web/.env.local and pushes every var to Vercel for production.
# Idempotent: removes the var first if present, then adds.

$envPath = "apps/web/.env.local"
if (-not (Test-Path $envPath)) { Write-Error "no $envPath"; exit 1 }

# Always push to production. We can layer preview/development later.
$target = "production"

$lines = Get-Content $envPath
foreach ($line in $lines) {
  $trim = $line.Trim()
  if ($trim -eq "" -or $trim.StartsWith("#")) { continue }
  $eq = $trim.IndexOf("=")
  if ($eq -lt 1) { continue }
  $name = $trim.Substring(0, $eq).Trim()
  $value = $trim.Substring($eq + 1).Trim()
  if ($value -eq "") { Write-Host ("[skip] " + $name + " (empty)") -ForegroundColor DarkGray; continue }
  Write-Host ("[push] " + $name + " (" + $value.Length + " chars)") -ForegroundColor Cyan

  # Try to remove first so re-runs work.
  npx vercel@latest env rm $name $target --yes 2>&1 | Out-Null

  # Add via stdin so multiline / special chars survive.
  $value | npx vercel@latest env add $name $target 2>&1 | Out-Null
}

Write-Host ""
Write-Host "Done. Listing what's now set on Vercel:" -ForegroundColor Yellow
npx vercel@latest env ls $target 2>&1 | Select-Object -Last 40
