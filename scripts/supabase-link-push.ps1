# Vincula pentaClaude (ikielkwgixbdzrwixtos) e aplica migrations.
#
# Opção A (recomendada — só senha Postgres, sem login Supabase na org certa):
#   1. Adicione SUPABASE_DB_PASSWORD no .env.local
#   2. npm run db:push
#
# Opção B (conta fzenithbd@outlook.com no CLI):
#   supabase logout
#   supabase login
#   supabase link --project-ref ikielkwgixbdzrwixtos
#   supabase db push --yes

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$ref = "ikielkwgixbdzrwixtos"

if ($env:SUPABASE_DB_PASSWORD) {
  Write-Host "==> npm run db:push (senha via env)"
  npm run db:push
  exit $LASTEXITCODE
}

Write-Host "SUPABASE_DB_PASSWORD nao definida. Tentando login Supabase (conta fzenithbd@outlook.com)..."
supabase logout 2>$null
supabase login

Write-Host "==> supabase link --project-ref $ref"
supabase link --project-ref $ref --yes

Write-Host "==> supabase db push"
supabase db push --yes

Write-Host "OK. Migrations aplicadas."