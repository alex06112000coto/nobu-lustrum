$startPort = 8000
$workspaceDir = "c:\Users\a.cotovanu\Desktop\Nobu app"
$address = [System.Net.IPAddress]::Loopback

$server = $null
$port = $startPort

# Try to find a free port dynamically
while ($port -lt 9000) {
    try {
        $server = New-Object System.Net.Sockets.TcpListener($address, $port)
        $server.Start()
        break # Successfully bound!
    } catch {
        $port++
    }
}

if ($server -eq $null) {
    Write-Host "Failed to find any open port between 8000 and 9000"
    exit 1
}

$buffer = New-Object System.Byte[] 4096

try {
    Write-Host "===================================================="
    Write-Host "  TCP SOCKET WEB SERVER RUNNING ON http://127.0.0.1:$port/"
    Write-Host "  Root directory: $workspaceDir"
    Write-Host "  Press Ctrl+C inside terminal to stop the server"
    Write-Host "===================================================="
    
    while ($true) {
        $client = $null
        $stream = $null
        
        try {
            $client = $server.AcceptTcpClient()
            $stream = $client.GetStream()
            
            # Read the raw incoming HTTP request bytes
            $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
            if ($bytesRead -eq 0) {
                if ($client) { $client.Close() }
                continue
            }
            
            $requestStr = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
            $firstLine = ($requestStr -split "`r?`n")[0]
            
            # Parse the HTTP Request: GET /path HTTP/1.1
            if ($firstLine -match "^GET\s+(\S+)\s+HTTP") {
                $urlPath = $Matches[1]
                
                # Unescape URL path to handle spaces (e.g. /nobu%20logo.jpg -> /nobu logo.jpg)
                $urlPath = [System.Uri]::UnescapeDataString($urlPath)
                
                # Strip query parameters (e.g. /index.html?v=1 -> /index.html)
                if ($urlPath.Contains("?")) {
                    $urlPath = $urlPath.Substring(0, $urlPath.IndexOf("?"))
                }
                
                if ($urlPath -eq "/" -or $urlPath -eq "") {
                    $urlPath = "/index.html"
                }
                
                # Translate path separators to local OS layout
                $cleanPath = $urlPath.Replace("/", "\").TrimStart('\')
                $localPath = Join-Path $workspaceDir $cleanPath
                
                # Resolve physical paths
                $resolvedPath = [System.IO.Path]::GetFullPath($localPath)
                $resolvedWorkspace = [System.IO.Path]::GetFullPath($workspaceDir)
                
                # Enforce sandbox boundaries to prevent directory escapes
                if (-not $resolvedPath.StartsWith($resolvedWorkspace)) {
                    Write-Host "[403 Forbidden] Path traversal blocked: $urlPath"
                    $body = "403 Forbidden - Access Denied"
                    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
                    $headers = "HTTP/1.1 403 Forbidden`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                    $headBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                    
                    $stream.Write($headBytes, 0, $headBytes.Length)
                    $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                }
                elseif (Test-Path $resolvedPath -PathType Leaf) {
                    try {
                        $fileBytes = [System.IO.File]::ReadAllBytes($resolvedPath)
                        
                        # Map MIME types based on file extension
                        $ext = [System.IO.Path]::GetExtension($resolvedPath).ToLower()
                        $contentType = "text/plain"
                        
                        if ($ext -eq ".html") { $contentType = "text/html; charset=utf-8" }
                        elseif ($ext -eq ".css") { $contentType = "text/css; charset=utf-8" }
                        elseif ($ext -eq ".js") { $contentType = "application/javascript; charset=utf-8" }
                        elseif ($ext -eq ".json") { $contentType = "application/json; charset=utf-8" }
                        elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") { $contentType = "image/jpeg" }
                        elseif ($ext -eq ".png") { $contentType = "image/png" }
                        elseif ($ext -eq ".svg") { $contentType = "image/svg+xml" }
                        
                        # Create Conforming HTTP Headers
                        $headers = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($fileBytes.Length)`r`nConnection: close`r`nX-Content-Type-Options: nosniff`r`nX-Frame-Options: SAMEORIGIN`r`n`r`n"
                        $headBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                        
                        $stream.Write($headBytes, 0, $headBytes.Length)
                        $stream.Write($fileBytes, 0, $fileBytes.Length)
                        Write-Host "[200 OK] Served: $urlPath ($contentType)"
                    } catch {
                        Write-Host "[500 Internal Error] Failed to read: $urlPath - $_"
                        $body = "500 Internal Server Error"
                        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
                        $headers = "HTTP/1.1 500 Internal Error`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                        $headBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                        
                        $stream.Write($headBytes, 0, $headBytes.Length)
                        $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                    }
                } else {
                    Write-Host "[404 Not Found] Missing: $urlPath"
                    $body = "404 File Not Found"
                    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
                    $headers = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                    $headBytes = [System.Text.Encoding]::UTF8.GetBytes($headers)
                    
                    $stream.Write($headBytes, 0, $headBytes.Length)
                    $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                }
            }
        } catch {
            Write-Host "[Connection Error] Exception handled gracefully: $_"
        } finally {
            if ($stream) { $stream.Close() }
            if ($client) { $client.Close() }
        }
    }
} catch {
    Write-Host "Server failed: $_"
} finally {
    if ($server) {
        $server.Stop()
    }
}
