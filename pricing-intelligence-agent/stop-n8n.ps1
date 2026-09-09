# stop-n8n.ps1
# Stops the n8n container but keeps your data volume and workflows.
# Start it again anytime with start-n8n.ps1

$ErrorActionPreference = 'Stop'
docker compose down
Write-Host 'n8n stopped. Restart anytime with start-n8n.ps1' -ForegroundColor Green
