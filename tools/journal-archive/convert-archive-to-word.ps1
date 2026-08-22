param([string]$ZipPath = "", [string]$OutputPath = "")
$ErrorActionPreference = "Stop"
$base = Join-Path $env:LOCALAPPDATA "PPR-Control\JournalArchive"
$cfg = Get-Content -Raw -LiteralPath (Join-Path $base 'config.json') | ConvertFrom-Json
if (!$ZipPath) {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.OpenFileDialog
  $dialog.Filter = "PPR archives (*.zip)|*.zip"; $dialog.Title = "Select monthly PPR archive"
  if ($dialog.ShowDialog() -ne 'OK') { exit 0 }
  $ZipPath = $dialog.FileName
}
$month = [regex]::Match([IO.Path]::GetFileName($ZipPath),'\d{4}-\d{2}').Value
if (!$month) { throw "ZIP file name has no YYYY-MM month" }
if (!$OutputPath) { $OutputPath = Join-Path ([IO.Path]::GetDirectoryName($ZipPath)) "Word_$month" }
$temp = Join-Path $base "activate-$month"
New-Item -ItemType Directory -Force -Path $temp | Out-Null
Expand-Archive -LiteralPath $ZipPath -DestinationPath $temp -Force
$json = Get-ChildItem -LiteralPath $temp -Filter "export-$month.json" | Select-Object -First 1
if (!$json) { throw "Journal data is missing in archive" }
& $cfg.PythonExe $cfg.Generator --input $json.FullName --month $month --output $OutputPath
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath (Join-Path $OutputPath 'READY.txt'))) { throw "Word conversion failed" }
Write-Host "Done. Word journals: $OutputPath"
Start-Process explorer.exe -ArgumentList $OutputPath
