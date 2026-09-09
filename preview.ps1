## Local preview server - opens http://localhost:8080
Param([int]$Port = 8080)

$root = $PSScriptRoot
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Preview running at http://localhost:$Port" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop."
Start-Process "http://localhost:$Port/index.html"

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $path = $ctx.Request.Url.LocalPath.TrimStart('/') -replace '/', [System.IO.Path]::DirectorySeparatorChar
    if ($path -eq '') { $path = 'index.html' }
    $file = Join-Path $root $path
    if (Test-Path -LiteralPath $file) {
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        $types = @{'.html'='text/html'; '.css'='text/css'; '.js'='application/javascript'; '.json'='application/json'; '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.csv'='text/csv'}
        $mime = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ctx.Response.ContentType = $mime
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $ctx.Response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - $path")
        $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
}