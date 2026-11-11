$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$pgCtl = Join-Path $projectRoot '.local\postgres\pgsql\bin\pg_ctl.exe'
$data = Join-Path $projectRoot '.local\postgres-data'

if (-not (Test-Path $pgCtl) -or -not (Test-Path (Join-Path $data 'PG_VERSION'))) {
    Write-Host 'O banco local deste projeto ainda não foi inicializado.'
    exit 0
}
& $pgCtl -D $data -m fast -w stop
if ($LASTEXITCODE -ne 0) { throw "pg_ctl terminou com código $LASTEXITCODE." }
Write-Host 'PostgreSQL local do projeto foi parado. Os dados foram preservados.'
