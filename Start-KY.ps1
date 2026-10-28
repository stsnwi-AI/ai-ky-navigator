# AI KY Navigator - Windows built-in PowerShell launcher. No Node.js required.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$base = 'http://127.0.0.1:3000/'
$api = 'http://127.0.0.1:50021'
$files = @{ '/'='index.html'; '/index.html'='index.html'; '/app.js'='app.js'; '/style.css'='style.css'; '/flow.js'='flow.js'; '/ui.js'='ui.js'; '/voicevox.js'='voicevox.js'; '/helmet.svg'='helmet.svg'; '/site-scene.svg'='site-scene.svg' }
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.svg'='image/svg+xml' }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($base)
try {
  $listener.Start()
} catch {
  Write-Host '起動できませんでした。別のKYアプリ画面を閉じ、再度お試しください。' -ForegroundColor Red
  Read-Host 'Enterキーで終了'
  exit 1
}
Write-Host 'KY活動ナビゲーターを起動しました。VOICEVOXも起動してください。' -ForegroundColor Green
Write-Host ('開くアドレス: '+$base)
Write-Host '終了するときはこの画面で Ctrl+C を押してください。'
Start-Process $base
try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $response.Headers.Add('Cache-Control','no-store')
    $response.Headers.Add('X-Content-Type-Options','nosniff')
    try {
      $path = $request.Url.AbsolutePath
      if ($path.StartsWith('/voicevox/')) {
        $sub = $path.Substring(9)
        if (@('/speakers','/audio_query','/synthesis') -cnotcontains $sub -or @('GET','POST') -cnotcontains $request.HttpMethod) {
          $response.StatusCode = 404
        } else {
          $remote = [System.Net.HttpWebRequest]::Create($api+$sub+$request.Url.Query)
          $remote.Method = $request.HttpMethod
          $remote.Timeout = 30000
          $remote.ReadWriteTimeout = 30000
          if ($request.HttpMethod -eq 'POST') {
            if ($request.ContentLength64 -gt 1048576) { throw 'リクエストが大きすぎます。' }
            $remote.ContentType = if ($request.ContentType) {$request.ContentType} else {'application/json'}
            $inputData = New-Object System.IO.MemoryStream
            $request.InputStream.CopyTo($inputData)
            if ($inputData.Length -gt 1048576) {throw 'リクエストが大きすぎます。'}
            $remote.ContentLength = $inputData.Length
            $stream = $remote.GetRequestStream()
            $bytes = $inputData.ToArray()
            $stream.Write($bytes,0,$bytes.Length)
            $stream.Dispose()
            $inputData.Dispose()
          }
          try { $upstreamResponse=$remote.GetResponse() }
          catch [System.Net.WebException] {
            if ($_.Exception.Response) { $upstreamResponse=$_.Exception.Response } else { throw }
          }
          try {
            $response.StatusCode = [int]$upstreamResponse.StatusCode
            $response.ContentType = $upstreamResponse.ContentType
            $copy = $upstreamResponse.GetResponseStream()
            $copy.CopyTo($response.OutputStream)
          } finally { $upstreamResponse.Dispose() }
        }
      } elseif ($request.HttpMethod -ne 'GET' -or -not $files.ContainsKey($path)) {
        $response.StatusCode = 404
      } else {
        $filename = $files[$path]
        $data = [System.IO.File]::ReadAllBytes((Join-Path $root $filename))
        $response.ContentType = $mime[[IO.Path]::GetExtension($filename)]
        $response.ContentLength64 = $data.Length
        $response.OutputStream.Write($data,0,$data.Length)
      }
    } catch {
      Write-Host ('通信エラー: '+$_.Exception.Message) -ForegroundColor Yellow
      try { $response.StatusCode=502 } catch {}
    } finally {
      try {$response.OutputStream.Close()} catch {}
    }
  }
} finally { $listener.Stop();$listener.Close() }
