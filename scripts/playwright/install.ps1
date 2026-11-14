$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $projectRoot '.local\playwright'
& (Join-Path $projectRoot 'node_modules\.bin\playwright.cmd') install chromium firefox webkit
if ($LASTEXITCODE -ne 0) { throw "A instalação dos navegadores terminou com código $LASTEXITCODE." }
