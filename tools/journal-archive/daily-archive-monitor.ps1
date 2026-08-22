$ErrorActionPreference = "Continue"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$runner = Join-Path $here "run-monthly-word-archive.ps1"
$base = Join-Path $env:LOCALAPPDATA "PPR-Control\JournalArchive"
$logPath = Join-Path $base "archive.log"
New-Item -ItemType Directory -Force -Path $base | Out-Null

while ($true) {
  try {
    $currentMonth = Get-Date -Format "yyyy-MM"
    & $runner -Month $currentMonth -Snapshot -Force
    & $runner
  } catch {
    Add-Content -LiteralPath $logPath -Encoding UTF8 -Value "$(Get-Date -Format s) MONITOR ERROR: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 21600
}
