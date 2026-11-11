$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $projectRoot '.local\playwright'
& (Join-Path $projectRoot 'node_modules\.bin\playwright.cmd') install --only-shell chromium
if ($LASTEXITCODE -ne 0) { throw "A instalação do Chromium terminou com código $LASTEXITCODE." }
