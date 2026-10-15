<#
    Searchii Local Server & TinyFish Proxy
    Uses native Windows .NET HttpListener (no node/npm installation required)
#>

param(
    [int]$Port = 8080
)

# Determine the directory where this script resides
$scriptDir = $PSScriptRoot
if (-not $scriptDir -and $MyInvocation.MyCommand.Definition) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
}
if (-not $scriptDir) {
    $scriptDir = (Get-Location).Path
}

# Load .env file if present (keeps secrets safe from git)
$envFile = Join-Path $scriptDir ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($k, $v, "Process")
        }
    }
}

# Attempt to bind to the requested port or next available port
$listener = $null
$boundPort = $Port
$maxPortAttempts = 5

for ($i = 0; $i -lt $maxPortAttempts; $i++) {
    $testPort = $Port + $i
    $prefix = "http://localhost:$testPort/"
    $candidateListener = New-Object System.Net.HttpListener
    $candidateListener.Prefixes.Add($prefix)

    try {
        $candidateListener.Start()
        $listener = $candidateListener
        $boundPort = $testPort
        break
    } catch {
        $candidateListener.Close()
        if ($i -eq ($maxPortAttempts - 1)) {
            Write-Host "Failed to start listener on ports ${Port} through ${testPort}: $_" -ForegroundColor Red
            Write-Host "Please ensure no other process is blocking these ports and try again." -ForegroundColor Yellow
            exit 1
        }
    }
}

$prefix = "http://localhost:$boundPort/"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Searchii - Job Finder powered by TinyFish AI" -ForegroundColor Green
Write-Host " Local Web Server & API Proxy running on: $prefix" -ForegroundColor Yellow
Write-Host " Open your browser to: $prefix" -ForegroundColor White
Write-Host " Press Ctrl+C in this terminal to stop the server" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

# Auto-open default browser safely
try {
    Start-Process $prefix
} catch {
    Write-Host "Notice: Could not automatically open browser. Please navigate to: $prefix" -ForegroundColor Yellow
}

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
        } catch {
            # Break cleanly if listener was stopped
            break
        }

        try {
            $request = $context.Request
            $response = $context.Response

            # Standard CORS Headers
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key")

            $rawPath = $request.Url.LocalPath

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 200
                $response.ContentLength64 = 0
                $response.Close()
                continue
            }

            # --- Proxy Endpoint: /api/search ---
            if ($rawPath -eq "/api/search") {
                $query = $request.QueryString["query"]
                if (-not $query) { $query = "Software Engineer" }

                $apiKey = $request.Headers["X-API-Key"]
                if (-not $apiKey) { $apiKey = $env:TINYFISH_API_KEY }

                if (-not $apiKey) {
                    Write-Host "[Search Warning] TinyFish API key is missing. Set TINYFISH_API_KEY in .env or the Settings modal." -ForegroundColor Yellow
                    $errJson = @{ error = "TinyFish API key missing. Set TINYFISH_API_KEY in .env or enter it in the Settings modal." } | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                    $response.StatusCode = 401
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    $response.Close()
                    continue
                }

                Write-Host "[TinyFish Search] Query: $query" -ForegroundColor Cyan

                try {
                    $targetUrl = "https://api.search.tinyfish.ai?query=" + [System.Uri]::EscapeDataString($query)
                    $tfHeaders = @{ 'X-API-Key' = $apiKey }
                    
                    # Fetch raw response from TinyFish API
                    $webRes = Invoke-WebRequest -Uri $targetUrl -Headers $tfHeaders -Method Get -UseBasicParsing -TimeoutSec 30
                    $jsonOutput = $webRes.Content

                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonOutput)
                    $response.StatusCode = 200
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                } catch {
                    Write-Host "[Search Error] $_" -ForegroundColor Red
                    $errMsg = $_.Exception.Message
                    $errJson = @{ error = $errMsg } | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                    $response.StatusCode = 500
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                $response.Close()
                continue
            }

            # --- Proxy Endpoint: /api/agent ---
            if ($rawPath -eq "/api/agent") {
                $apiKey = $request.Headers["X-API-Key"]
                if (-not $apiKey) { $apiKey = $env:TINYFISH_API_KEY }

                if (-not $apiKey) {
                    Write-Host "[Agent Warning] TinyFish API key is missing. Set TINYFISH_API_KEY in .env or the Settings modal." -ForegroundColor Yellow
                    $errJson = @{ error = "TinyFish API key missing. Set TINYFISH_API_KEY in .env or enter it in the Settings modal." } | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                    $response.StatusCode = 401
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                    $response.Close()
                    continue
                }

                $encoding = if ($request.ContentEncoding) { $request.ContentEncoding } else { [System.Text.Encoding]::UTF8 }
                $reader = New-Object System.IO.StreamReader($request.InputStream, $encoding)
                $requestBody = $reader.ReadToEnd()

                Write-Host "[TinyFish Agent] Running autonomous agent..." -ForegroundColor Magenta

                try {
                    $tfHeaders = @{
                        'X-API-Key' = $apiKey
                        'Content-Type' = 'application/json'
                    }
                    $agentRes = Invoke-WebRequest -Uri "https://agent.tinyfish.ai/v1/automation/run" -Headers $tfHeaders -Method Post -Body $requestBody -TimeoutSec 90 -UseBasicParsing
                    $jsonOutput = $agentRes.Content

                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($jsonOutput)
                    $response.StatusCode = 200
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                } catch {
                    Write-Host "[Agent Error] $_" -ForegroundColor Red
                    $errMsg = $_.Exception.Message
                    $errJson = @{ error = $errMsg } | ConvertTo-Json
                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($errJson)
                    $response.StatusCode = 500
                    $response.ContentType = "application/json; charset=utf-8"
                    $response.ContentLength64 = $buffer.Length
                    $response.OutputStream.Write($buffer, 0, $buffer.Length)
                }
                $response.Close()
                continue
            }

            # --- Static File Serving ---
            $filePath = if ($rawPath -eq "/" -or $rawPath -eq "") { "index.html" } else { $rawPath.TrimStart("/") }
            $cleanRelative = $filePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar.ToString())
            $fullPath = [System.IO.Path]::GetFullPath((Join-Path $scriptDir $cleanRelative))

            # Security check: ensure path stays within scriptDir
            if ($fullPath.StartsWith($scriptDir, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path $fullPath -PathType Leaf)) {
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                
                $extension = [System.IO.Path]::GetExtension($fullPath).ToLower()
                $mime = switch ($extension) {
                    ".html"  { "text/html; charset=utf-8" }
                    ".css"   { "text/css; charset=utf-8" }
                    ".js"    { "application/javascript; charset=utf-8" }
                    ".json"  { "application/json; charset=utf-8" }
                    ".svg"   { "image/svg+xml" }
                    ".png"   { "image/png" }
                    ".jpg"   { "image/jpeg" }
                    ".jpeg"  { "image/jpeg" }
                    ".gif"   { "image/gif" }
                    ".webp"  { "image/webp" }
                    ".ico"   { "image/x-icon" }
                    ".woff"  { "font/woff" }
                    ".woff2" { "font/woff2" }
                    ".ttf"   { "font/ttf" }
                    default  { "application/octet-stream" }
                }

                $response.StatusCode = 200
                $response.ContentType = $mime
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $response.ContentType = "text/plain; charset=utf-8"
                $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentLength64 = $notFoundBytes.Length
                $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
            }

            $response.Close()
        } catch {
            # Catch and continue on broken pipes or browser refreshes
            try { $response.Close() } catch { }
        }
    }
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
        $listener.Close()
    }
}
