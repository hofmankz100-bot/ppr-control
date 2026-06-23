$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8080

$alreadyRunning = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($alreadyRunning) {
    exit 0
}

$node = Get-Command node.exe -ErrorAction SilentlyContinue
if ($node) {
    $nodePath = $node.Source
} else {
    $runtimeRoot = Join-Path $env:LOCALAPPDATA "OpenAI\Codex\runtimes\cua_node"
    $nodePath = Get-ChildItem $runtimeRoot -Filter node.exe -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}

if (-not $nodePath -or -not (Test-Path -LiteralPath $nodePath)) {
    throw "Node.js executable was not found."
}

$logDir = Join-Path $projectDir "data\logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

Start-Process `
    -FilePath $nodePath `
    -ArgumentList "`"$projectDir\server.js`"" `
    -WorkingDirectory $projectDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logDir "server-output.log") `
    -RedirectStandardError (Join-Path $logDir "server-error.log")
