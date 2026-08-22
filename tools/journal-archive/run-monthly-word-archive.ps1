param([string]$Month = "", [switch]$Snapshot, [switch]$Force)
$ErrorActionPreference = "Stop"
$base = Join-Path $env:LOCALAPPDATA "PPR-Control\JournalArchive"
$configPath = Join-Path $base "config.json"
$credPath = Join-Path $base "credential.xml"
$logPath = Join-Path $base "archive.log"
New-Item -ItemType Directory -Force -Path $base | Out-Null
function Log([string]$Text) { Add-Content -LiteralPath $logPath -Encoding UTF8 -Value "$(Get-Date -Format s) $Text" }
try {
  if (!(Test-Path -LiteralPath $configPath) -or !(Test-Path -LiteralPath $credPath)) { throw "Run setup-word-archive.ps1 first" }
  $cfg = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
  $cred = Import-Clixml -LiteralPath $credPath
  if (!$Month) { $Month = (Get-Date -Day 1).AddMonths(-1).ToString("yyyy-MM") }
  $year,$monthNumber = $Month.Split('-')
  $target = Join-Path $cfg.OutputRoot "$year\$Month"
  $zipName = if ($Snapshot) { "PPR_snapshot_$(Get-Date -Format 'yyyy-MM-dd').zip" } else { "PPR_journals_$Month.zip" }
  $zipPath = Join-Path $target $zipName
  if ((Test-Path -LiteralPath $zipPath) -and !$Force) { Log "ZIP archive $Month already exists"; exit 0 }
  $health = Invoke-RestMethod -Uri "$($cfg.SiteUrl.TrimEnd('/'))/api/health" -Method Get
  $headers = @{}
  if ($health.version) { $headers['X-App-Version'] = [string]$health.version }
  $body = @{ identifier=$cred.UserName; password=$cred.GetNetworkCredential().Password } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri "$($cfg.SiteUrl.TrimEnd('/'))/api/auth/login" -Method Post -ContentType "application/json" -Headers $headers -Body $body -SessionVariable web
  if (!$login.ok) { throw "Login failed" }
  $jsonPath = Join-Path $base "export-$Month.json"
  Invoke-WebRequest -Uri "$($cfg.SiteUrl.TrimEnd('/'))/api/export/all" -Headers $headers -WebSession $web -OutFile $jsonPath
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  $manifestPath = Join-Path $base "manifest-$Month.txt"
  $archiveKind = if ($Snapshot) { "Daily working snapshot" } else { "Final monthly archive" }
  @("PPR Control", "Archive type: $archiveKind", "Journal month: $Month", "Created: $(Get-Date -Format s)", "The JSON file is a complete recovery copy") | Set-Content -LiteralPath $manifestPath -Encoding UTF8
  $archiveItems = @($jsonPath,$manifestPath)
  $pdfSuffix = if ($Snapshot) { Get-Date -Format "yyyy-MM-dd" } else { "final" }
  $pdfDir = Join-Path $base "PDF-$Month-$pdfSuffix"
  if ($true) {
    if ($Force -and (Test-Path -LiteralPath $pdfDir)) { Remove-Item -LiteralPath $pdfDir -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $pdfDir | Out-Null
    $env:PPR_SITE_URL = $cfg.SiteUrl
    $env:PPR_IDENTIFIER = $cred.UserName
    $env:PPR_PASSWORD = $cred.GetNetworkCredential().Password
    $env:PPR_ARCHIVE_MONTH = $Month
    $env:PPR_PDF_OUTPUT = $pdfDir
    $env:PPR_BROWSER_EXE = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    $env:NODE_PATH = "C:\Users\A.Kairat.CORP\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
    $node = "C:\Users\A.Kairat.CORP\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
    $pdfScript = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "export-original-pdfs.js"
    & $node $pdfScript
    if ($LASTEXITCODE -ne 0) { throw "Original PDF generation failed" }
    $pdfManifest = Join-Path $pdfDir "PDF-manifest.json"
    $validator = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "validate-pdf-archive.py"
    & $cfg.PythonExe $validator $pdfDir $pdfManifest
    if ($LASTEXITCODE -ne 0) { throw "PDF archive validation failed; ZIP was not created" }
    $archiveItems += $pdfDir
  }
  $env:PPR_PASSWORD = $null
  Compress-Archive -LiteralPath $archiveItems -DestinationPath $zipPath -CompressionLevel Optimal -Force
  if (!(Test-Path -LiteralPath $zipPath) -or (Get-Item -LiteralPath $zipPath).Length -lt 100) { throw "ZIP archive is missing or empty" }
  Remove-Item -LiteralPath $jsonPath -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $manifestPath -Force -ErrorAction SilentlyContinue
  Log "$archiveKind created for ${Month}: $zipPath"
} catch {
  Log "ERROR: $($_.Exception.Message)"
  throw
}
