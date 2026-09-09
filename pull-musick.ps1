## Pull live Musick Auction catalog lots into musick-catalog.json
## Usage: .\pull-musick.ps1 [-AuctionIds 898,896,899] [-OutFile musick-catalog.json]
## Renders each catalog through the r.jina.ai reader (the site is a JS SPA
## that blocks plain requests) and extracts title/lot/current/asking/bids.
Param(
  [int[]]$AuctionIds = @(898, 899, 896, 897),
  [string]$OutFile = (Join-Path $PSScriptRoot 'musick-catalog.json'),
  [string]$EbayCid = '',
  [string]$EbaySecret = '',
  [switch]$SkipEbay
)

$ErrorActionPreference = 'Stop'
## Force UTF-8 so jina.ai's text isn't re-mangled by the Windows console
## (fixes mojibake like "PokÃ©mon" / "Pok├⌐mon")
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
$reader   = 'https://r.jina.ai/'
$UA       = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
$Result   = New-Object System.Collections.Generic.List[object]

## ---------- eBay sold comps (Browse API) ----------
## Needs a free application at developer.ebay.com (client-credentials OAuth).
function Get-EbayToken {
  param([string]$Cid, [string]$Secret)
  $cred = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("$Cid`:$Secret"))
  $body = 'grant_type=client_credentials&scope=' + [Uri]::EscapeDataString('https://api.ebay.com/oauth/api_scope')
  $r = Invoke-WebRequest -Uri 'https://api.ebay.com/identity/v1/oauth2/token' -Method POST `
        -Headers @{'Authorization' = "Basic $cred"; 'Content-Type' = 'application/x-www-form-urlencoded'} `
        -Body $body -UseBasicParsing -TimeoutSec 30
  $j = $r.Content | ConvertFrom-Json
  return $j.access_token
}
function Get-EbaySoldMedian {
  param([string]$Token, [string]$Query)
  $url = 'https://api.ebay.com/buy/browse/v1/item_summary/search?' +
         'q=' + [Uri]::EscapeDataString($Query) +
         '&filter=soldItems:true&sort=endTimeRecent&limit=15'
  try {
    $r = Invoke-WebRequest -Uri $url -Headers @{
      'Authorization' = "Bearer $Token"
      'X-EBAY-C-MARKETPLACE-ID' = 'EBAY_US'
      'Content-Type' = 'application/json'
    } -UseBasicParsing -TimeoutSec 25
    $j = $r.Content | ConvertFrom-Json
    if (-not $j.itemSummaries) { return $null }
    $prices = @($j.itemSummaries | ForEach-Object { $_.price.value } | Where-Object { $_ -match '^\d+(\.\d+)?$' } | ForEach-Object { [double]$_ } | Sort-Object)
    if ($prices.Count -eq 0) { return $null }
    $mid = [int][Math]::Floor($prices.Count / 2)
    $median = if ($prices.Count % 2 -eq 1) { $prices[$mid] } else { ($prices[$mid-1] + $prices[$mid]) / 2 }
    return @{ n = $prices.Count; median = [int][Math]::Round($median); min = [int]$prices[0]; max = [int]$prices[$prices.Count-1] }
  } catch {
    return $null
  }
}
function Clean-Query([string]$t){
  # strip punctuation/emoji, keep letters+digits; cap to ~7 meaningful words
  $t = $t -replace '[^\p{L}\p{N} ]', ' '
  $t = $t -replace '\s+', ' ' -replace '^ | $', ''
  $short = (($t -split ' ') | Where-Object { $_ -and $_.Length -gt 2 } | Select-Object -First 7) -join ' '
  return $short
}

foreach ($id in $AuctionIds) {
  $catUrl = "https://bid.musickauction.com/auctions/catalog/id/$id"
  Write-Host "Fetching catalog $id ..." -ForegroundColor Cyan
  try {
    $text = & curl.exe -sL --max-time 90 "$reader$catUrl" -A $UA -H 'Accept: text/plain'
    $text = ($text -join "`n")
    if (-not $text -or $text.Length -lt 200) { throw 'empty response' }
  } catch {
    Write-Host "  FAILED to fetch $id : $($_.Exception.Message)" -ForegroundColor Yellow
    continue
  }

  # each lot = image-link block + following field text, until next block
  $pat = '(?s)\[!\[Image \d+:\s*(?<title>.*?)\]\(https://[^)]*\)\]\(https://bid\.musickauction\.com/lot-details/index/catalog/(?<cat>\d+)/lot/(?<lot>\d+)/.*?\n(?<body>.*?)(?=\n\*   \[!\[Image \d+:|$)'
  $ms = [regex]::Matches($text, $pat)
  $n = 0
  foreach ($m in $ms) {
    $title = $m.Groups['title'].Value.Trim()
    $body  = $m.Groups['body'].Value
    $cur = 0; $ask = 0; $bids = 0; $endsEpoch = $null
    if ($body -match 'Current bid\s*\$([\d,]+)') { $cur = [int]($Matches[1] -replace ',', '') }
    if ($body -match 'Asking bid\s*\$([\d,]+)')  { $ask = [int]($Matches[1] -replace ',', '') }
    if ($body -match 'Starting\s*\$([\d,]+)')    { if ($cur -eq 0) { $cur = [int]($Matches[1] -replace ',', '') }; if ($ask -eq 0) { $ask = [int]($Matches[1] -replace ',', '') } }
    if ($body -match 'Bidding history\s*\(\s*(\d+)\s*') { $bids = [int]$Matches[1] }
    # Time left: [1d 5h 17m 36s] -> store the absolute end timestamp (epoch secs, UTC)
    if ($body -match 'Time left:\s*\[(?<tl>[^\]]+)\]') {
      $tl = $Matches['tl']
      $d=0;$h=0;$mi=0;$s=0
      if ($tl -match '(\d+)d')  { $d  = [int]$Matches[1] }
      if ($tl -match '(\d+)h')  { $h  = [int]$Matches[1] }
      if ($tl -match '(\d+)m')  { $mi = [int]$Matches[1] }
      if ($tl -match '(\d+)s')  { $s  = [int]$Matches[1] }
      $totSec = (($d*24)+$h)*3600 + $mi*60 + $s
      $unixEpoch = [DateTime]::SpecifyKind([DateTime]'1970-01-01', [DateTimeKind]::Utc)
      $endsEpoch = [int][Math]::Floor(([DateTime]::UtcNow - $unixEpoch).TotalSeconds) + $totSec
    }
    $Result.Add([pscustomobject]@{
      title      = $title
      category   = $null
      condition  = $null
      currentBid = $cur
      askingBid  = $ask
      bidCount   = $bids
      lot        = [int]$m.Groups['lot'].Value
      auctionId  = [int]$m.Groups['cat'].Value
      endsAt     = $endsEpoch
    })
    $n++
  }
  Write-Host "  parsed $n lots" -ForegroundColor Green
}

## ---------- attach eBay sold comps ----------
$token = $null
if (-not $SkipEbay -and $EbayCid -and $EbaySecret) {
  Write-Host 'Fetching eBay sold comps ...' -ForegroundColor Cyan
  try { $token = Get-EbayToken -Cid $EbayCid -Secret $EbaySecret; Write-Host '  token OK' -ForegroundColor Green }
  catch { Write-Host "  eBay token FAILED: $($_.Exception.Message)" -ForegroundColor Yellow }
}
if ($token) {
  $ok = 0; $fail = 0; $i = 0
  foreach ($lot in $Result) {
    $q = Clean-Query $lot.title
    if ($q) {
      $comp = Get-EbaySoldMedian -Token $token -Query $q
      if ($comp) { $lot | Add-Member -NotePropertyName 'ebay' -NotePropertyValue $comp -Force; $ok++ } else { $fail++ }
      $i++
      if ($i % 15 -eq 0) { Write-Host "  comps $i/$($Result.Count) (ok $ok)" -ForegroundColor DarkCyan }
      Start-Sleep -Milliseconds 180   # stay under Browse API rate limits
    }
  }
  Write-Host "eBay comps done: $ok matched, $fail no data" -ForegroundColor Green
} elseif (-not $SkipEbay) {
  Write-Host 'eBay comps skipped - pass -EbayCid and -EbaySecret to fetch sold prices.' -ForegroundColor Yellow
}

$json = $Result | ConvertTo-Json -Depth 5
$fullOut = if ([System.IO.Path]::IsPathRooted($OutFile)) { $OutFile } else { Join-Path $PSScriptRoot $OutFile }
[System.IO.File]::WriteAllText($fullOut, $json, (New-Object System.Text.UTF8Encoding($false)))
## Also write a .js sidecar that works when the page is opened via file://
## (browsers block fetch() of local files, but <script src> loads fine).
$jsOut = [System.IO.Path]::ChangeExtension($fullOut, '.js')
[System.IO.File]::WriteAllText($jsOut, 'window.MUSICK_LIVE=' + $json + ';', (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Wrote $($Result.Count) lots to $OutFile (+$([System.IO.Path]::GetFileName($jsOut)))" -ForegroundColor Green