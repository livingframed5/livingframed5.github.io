# start-n8n.ps1
# Starts the self-hosted n8n instance for the "Weekly Pricing Intelligence Brief" agent.
# On first run this generates a docker-compose.yml with random secrets.

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$composeFile = Join-Path $projectRoot 'docker-compose.yml'
$dataDir = Join-Path $projectRoot 'data'
$outputDir = Join-Path $dataDir 'output'

if (-not (Test-Path -LiteralPath $dataDir))   { New-Item -ItemType Directory -Path $dataDir | Out-Null }
if (-not (Test-Path -LiteralPath $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

if (-not (Test-Path -LiteralPath $composeFile)) {
    Write-Host 'First run: generating docker-compose.yml with random secrets...' -ForegroundColor Yellow
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    $encKey = -join ((1..48) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    $jwt    = -join ((1..48) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    $hostDataPath = ($dataDir -replace '\\', '/')

    $compose = @"
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n
    container_name: n8n-pricing-agent
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_ENCRYPTION_KEY=$encKey
      - N8N_USER_MANAGEMENT_JWT_SECRET=$jwt
      - N8N_RESTRICT_FILE_ACCESS_TO=/home/node/.n8n-files;/data
      - N8N_SECURE_COOKIE=false
      - GENERIC_TIMEZONE=America/New_York
      - N8N_DEFAULT_BINARY_DATA_MODE=filesystem
    volumes:
      - n8n_data:/home/node/.n8n
      - "${hostDataPath}:/data"
volumes:
  n8n_data:
"@
    Set-Content -LiteralPath $composeFile -Value $compose -Encoding UTF8
    Write-Host "Created $composeFile" -ForegroundColor Green
}

Write-Host 'Starting n8n (the first pull of the image can take several minutes)...' -ForegroundColor Yellow
docker compose up -d
if ($LASTEXITCODE -ne 0) { Write-Host 'docker compose failed. Is Docker Desktop running?' -ForegroundColor Red; exit 1 }

Write-Host 'Waiting for n8n to become ready...' -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -Uri 'http://localhost:5678/healthz' -UseBasicParsing -TimeoutSec 3
        if ($resp.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
}

if ($ready) {
    Write-Host ''
    Write-Host 'n8n is running at  http://localhost:5678' -ForegroundColor Green
    Write-Host 'Opening your browser...'
    Start-Process 'http://localhost:5678'
} else {
    Write-Host 'n8n did not respond yet. Check logs with:  docker compose logs n8n' -ForegroundColor Yellow
}
