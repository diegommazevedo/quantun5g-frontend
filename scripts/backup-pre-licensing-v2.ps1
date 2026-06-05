# Backup fonte + BD antes LICENSING_V2
# Uso: powershell -File scripts/backup-pre-licensing-v2.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$ts = Get-Date -Format "yyyy-MM-dd_HHmm"
$outDir = Join-Path $root "backups\pre-licensing-v2_$ts"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Push-Location $root
try {
  git rev-parse HEAD | Set-Content (Join-Path $outDir "git-head.txt")
  git branch --show-current | Set-Content (Join-Path $outDir "git-branch.txt")

  git bundle create (Join-Path $outDir "repo.bundle") HEAD
  Write-Host "OK repo.bundle"

  $exclude = @('node_modules', '.next', 'backups', 'vendas-nr01\node_modules')
  $items = Get-ChildItem -Path $root -Force | Where-Object {
    $n = $_.Name
    $exclude -notcontains $n -and $n -ne '.git'
  }
  $staging = Join-Path $outDir "_source_staging"
  New-Item -ItemType Directory -Force -Path $staging | Out-Null
  foreach ($item in $items) {
    Copy-Item -Path $item.FullName -Destination $staging -Recurse -Force
  }
  $srcZip = Join-Path $outDir "source.zip"
  Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $srcZip -Force
  Remove-Item $staging -Recurse -Force
  Write-Host "OK source.zip"

  $envFile = Join-Path $root ".env.local"
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^SUPABASE_DB_PASSWORD=(.+)$') { $script:DbPass = $matches[1].Trim() }
      if ($_ -match '^DATABASE_URL=(.+)$') { $script:DbUrl = $matches[1].Trim() }
    }
  }
  if (-not $DbUrl -and $DbPass) {
    $enc = [uri]::EscapeDataString($DbPass)
    $DbUrl = "postgresql://postgres:${enc}@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres"
  }

  if ($DbUrl) {
    $dumpPath = Join-Path $outDir "database.custom"
    $pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($pgDump) {
      & pg_dump $DbUrl -Fc --no-owner --no-acl -f $dumpPath
      Write-Host "OK database.custom"
    } else {
      node --env-file=.env.local scripts/backup-db-subset.mjs $outDir
    }
  } else {
    "sem DATABASE_URL/SUPABASE_DB_PASSWORD" | Set-Content (Join-Path $outDir "database-skipped.txt")
  }

  $final = Join-Path $root "backups\quantum5g_pre-licensing-v2_$ts.zip"
  Compress-Archive -Path (Join-Path $outDir "*") -DestinationPath $final -Force
  Write-Host "`nBackup final: $final"
}
finally {
  Pop-Location
}
