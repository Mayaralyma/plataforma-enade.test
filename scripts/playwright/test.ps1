$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$localRoot = Join-Path $projectRoot '.local'
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $localRoot 'playwright'
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3000'
$server = $null
$serverStartedHere = $false
$playwright = Join-Path $projectRoot 'node_modules\.bin\playwright.cmd'

New-Item -ItemType Directory -Force -Path $localRoot | Out-Null
try {
    try {
        Invoke-WebRequest -Uri $env:PLAYWRIGHT_BASE_URL -UseBasicParsing -TimeoutSec 2 | Out-Null
    } catch {
        $node = (Get-Command node).Source
        $server = Start-Process -FilePath $node `
            -ArgumentList @('node_modules/next/dist/bin/next', 'dev') `
            -WorkingDirectory $projectRoot `
            -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Join-Path $localRoot 'playwright-next.stdout.log') `
            -RedirectStandardError (Join-Path $localRoot 'playwright-next.stderr.log')
        $serverStartedHere = $true
        $deadline = (Get-Date).AddSeconds(120)
        $ready = $false
        while ((Get-Date) -lt $deadline) {
            $server.Refresh()
            if ($server.HasExited) { throw 'O servidor Next.js encerrou antes de ficar pronto. Consulte .local/playwright-next.stderr.log.' }
            try {
                Invoke-WebRequest -Uri $env:PLAYWRIGHT_BASE_URL -UseBasicParsing -TimeoutSec 2 | Out-Null
                $ready = $true
                break
            } catch {
                Start-Sleep -Milliseconds 500
            }
        }
        if (-not $ready) { throw 'O servidor Next.js nao respondeu dentro de 120 segundos.' }
    }

    & $playwright test @args
    if ($LASTEXITCODE -ne 0) { throw "Os testes Playwright terminaram com codigo $LASTEXITCODE." }
} finally {
    if ($serverStartedHere -and $server) {
        Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    }
}
