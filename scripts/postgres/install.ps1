$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$localRoot = Join-Path $projectRoot '.local'
$installRoot = Join-Path $localRoot 'postgres'
$archivePath = Join-Path $localRoot 'postgresql-16.15-1-windows-x64-binaries.zip'
$downloadUrl = 'https://get.enterprisedb.com/postgresql/postgresql-16.15-1-windows-x64-binaries.zip'
$expectedHash = '25E6FCDFB8CAEC38691BF461125E7564508760666F7B8E5DC6A5F0818F58F81E'

if (Test-Path (Join-Path $installRoot 'pgsql\bin\postgres.exe')) {
    Write-Host 'PostgreSQL portátil já está instalado neste projeto.'
    exit 0
}
if (Test-Path $installRoot) {
    throw "A pasta '$installRoot' já existe, mas não contém uma instalação reconhecida. Remova ou inspecione essa pasta antes de continuar."
}

New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
if (-not (Test-Path $archivePath)) {
    Write-Host 'Baixando PostgreSQL 16.15 portátil para .local...'
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath -UseBasicParsing
}

$actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
if ($actualHash -ne $expectedHash) {
    throw "O SHA-256 do arquivo não confere. Esperado: $expectedHash; recebido: $actualHash. O arquivo foi mantido em .local para inspeção."
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
    $entries = @($archive.Entries | Where-Object { $_.FullName -match '^pgsql/(bin|lib|share)/' -or $_.FullName -eq 'pgsql/server_license.txt' })
    if (-not ($entries | Where-Object { $_.FullName -eq 'pgsql/bin/postgres.exe' })) {
        throw 'O arquivo verificado não contém o executável PostgreSQL esperado.'
    }
    New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
    $installRootPrefix = [System.IO.Path]::GetFullPath($installRoot).TrimEnd('\') + '\'
    foreach ($entry in $entries) {
        $relativePath = $entry.FullName.Replace('/', '\')
        $destination = [System.IO.Path]::GetFullPath((Join-Path $installRoot $relativePath))
        if (-not $destination.StartsWith($installRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Caminho inválido no arquivo: $($entry.FullName)"
        }
        if ($entry.FullName.EndsWith('/')) {
            New-Item -ItemType Directory -Force -Path $destination | Out-Null
            continue
        }
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
        $inputStream = $entry.Open()
        try {
            $outputStream = [System.IO.File]::Create($destination)
            try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose() }
        } finally { $inputStream.Dispose() }
    }
} catch {
    if (Test-Path $installRoot) { Remove-Item -LiteralPath $installRoot -Recurse -Force }
    throw
} finally {
    $archive.Dispose()
}

if (-not (Test-Path (Join-Path $installRoot 'pgsql\bin\postgres.exe'))) {
    throw 'A extração terminou sem o executável postgres.exe.'
}
Remove-Item -LiteralPath $archivePath -Force
Write-Host 'PostgreSQL 16.15 portátil instalado em .local\postgres. Os dados serão criados em .local\postgres-data.'
