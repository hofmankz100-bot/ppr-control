param(
  [string]$AgentToken = "",
  [string]$AgentTokenFile = "",
  [string]$AppUrl = "https://ppr-control-ramazan.onrender.com",
  [string]$RepoDir = (Split-Path -Parent $PSScriptRoot),
  [string]$CodexBin = "C:\Users\A.Kairat.CORP\.codex\plugins\.plugin-appserver\codex.exe"
)

$ErrorActionPreference = "Stop"
$installDir = Join-Path $env:LOCALAPPDATA "PPR-Control\CodexAgent"
$configPath = Join-Path $installDir "agent.env.ps1"
$launcherPath = Join-Path $installDir "start-agent.ps1"
$startupDir = [Environment]::GetFolderPath("Startup")
$startupPath = Join-Path $startupDir "PPR-Control Codex Agent.cmd"
$nodeBin = (Get-Command node).Source
$bridgePath = Join-Path $PSScriptRoot "codex-bridge.mjs"
$logPath = Join-Path $installDir "agent.log"

if (-not $AgentToken -and $AgentTokenFile) {
  $AgentToken = (Get-Content -Raw -LiteralPath $AgentTokenFile).Trim()
}
if (-not $AgentToken) {
  throw "AgentToken or AgentTokenFile is required."
}

New-Item -ItemType Directory -Path $installDir -Force | Out-Null

$config = @"
`$env:PPR_APP_URL = '$($AppUrl.Replace("'", "''"))'
`$env:CODEX_AGENT_TOKEN = '$($AgentToken.Replace("'", "''"))'
`$env:PPR_REPO_DIR = '$($RepoDir.Replace("'", "''"))'
`$env:CODEX_BIN = '$($CodexBin.Replace("'", "''"))'
`$env:CODEX_AGENT_POLL_MS = '5000'
"@
Set-Content -LiteralPath $configPath -Value $config -Encoding UTF8

$launcher = @"
`$ErrorActionPreference = 'Stop'
. '$($configPath.Replace("'", "''"))'
& '$($nodeBin.Replace("'", "''"))' '$($bridgePath.Replace("'", "''"))' *>> '$($logPath.Replace("'", "''"))'
"@
Set-Content -LiteralPath $launcherPath -Value $launcher -Encoding UTF8
Set-Content -LiteralPath $startupPath -Value "@echo off`r`nstart `"`" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$launcherPath`"`r`n" -Encoding ASCII

$acl = Get-Acl -LiteralPath $configPath
$acl.SetAccessRuleProtection($true, $false)
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule($env:USERNAME, "FullControl", "Allow")
$acl.SetAccessRule($rule)
Set-Acl -LiteralPath $configPath -AclObject $acl
if ($AgentTokenFile -and (Test-Path -LiteralPath $AgentTokenFile)) {
  Remove-Item -LiteralPath $AgentTokenFile -Force
}

Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$launcherPath`""
Write-Output "PPR-Control Codex Agent installed and started."
