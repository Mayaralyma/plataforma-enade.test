$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$localRoot = Join-Path $projectRoot '.local'
$bin = Join-Path $localRoot 'postgres\pgsql\bin'
$data = Join-Path $localRoot 'postgres-data'
$initdb = Join-Path $bin 'initdb.exe'
$pgCtl = Join-Path $bin 'pg_ctl.exe'
$postgresPassword = 'enade'

if (-not (Test-Path $initdb) -or -not (Test-Path $pgCtl)) {
    throw 'PostgreSQL portátil não encontrado. Execute npm run db:local:install primeiro.'
}
New-Item -ItemType Directory -Force -Path $localRoot | Out-Null

if (-not (Test-Path (Join-Path $data 'PG_VERSION'))) {
    New-Item -ItemType Directory -Force -Path $data | Out-Null
    $passwordFile = Join-Path $localRoot 'postgres-init-password.tmp'
    [System.IO.File]::WriteAllText($passwordFile, $postgresPassword, [System.Text.Encoding]::ASCII)
    try {
        & $initdb -D $data -U enade --encoding=UTF8 --auth-local=scram-sha-256 --auth-host=scram-sha-256 --pwfile=$passwordFile
        if ($LASTEXITCODE -ne 0) { throw "initdb terminou com código $LASTEXITCODE." }
    } finally {
        if (Test-Path $passwordFile) { Remove-Item -LiteralPath $passwordFile -Force }
    }
}

$statusOutput = & $pgCtl -D $data status 2>&1
if ($LASTEXITCODE -ne 0) {
    $logPath = Join-Path $localRoot 'postgres.log'
    & $pgCtl -D $data -l $logPath -o '-h 127.0.0.1 -p 5432' -w start
    if ($LASTEXITCODE -ne 0) { throw "pg_ctl não conseguiu iniciar PostgreSQL. Consulte $logPath" }
}

$env:PGPASSWORD = $postgresPassword
$databaseExists = & (Join-Path $bin 'psql.exe') -h 127.0.0.1 -p 5432 -U enade -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'enade'"
if ($LASTEXITCODE -ne 0) { throw 'O PostgreSQL iniciou, mas não foi possível consultar o catálogo.' }
if (($databaseExists | Out-String).Trim() -ne '1') {
    & (Join-Path $bin 'createdb.exe') -h 127.0.0.1 -p 5432 -U enade -O enade enade
    if ($LASTEXITCODE -ne 0) { throw 'Não foi possível criar o banco local enade.' }
}
Remove-Item Env:\PGPASSWORD
Write-Host 'PostgreSQL local do projeto está ativo em localhost:5432 (banco enade).'
