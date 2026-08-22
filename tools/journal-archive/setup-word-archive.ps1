$ErrorActionPreference = "Stop"
$base = Join-Path $env:LOCALAPPDATA "PPR-Control\JournalArchive"
New-Item -ItemType Directory -Force -Path $base | Out-Null
$site = Read-Host "Site URL (Enter for default)"; if (!$site) { $site = "https://ppr-control-ramazan.onrender.com" }
$root = Read-Host "Archive folder (Enter for default)"; if (!$root) { $root = Join-Path ([Environment]::GetFolderPath('MyDocuments')) "PPR-Control\Journals" }
$credential = Get-Credential -Message "Enter PPR Control admin ID/phone and password"
$credential | Export-Clixml -LiteralPath (Join-Path $base "credential.xml")
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = "C:\Users\A.Kairat.CORP\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if (!(Test-Path -LiteralPath $python)) { $python = (Get-Command python -ErrorAction Stop).Source }
@{ SiteUrl=$site.TrimEnd('/'); OutputRoot=$root; PythonExe=$python; Generator=(Join-Path $here 'monthly_word_archive.py') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $base 'config.json') -Encoding UTF8
$runner = Join-Path $here 'run-monthly-word-archive.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$triggers = @((New-ScheduledTaskTrigger -Daily -At 8am), (New-ScheduledTaskTrigger -AtLogOn))
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$taskInstalled = $false
try {
  Register-ScheduledTask -TaskName 'PPR Control - monthly journal ZIP' -Action $action -Trigger $triggers -Settings $settings -Description 'Automatically saves a ZIP with all PPR Control journals for the previous month' -Force -ErrorAction Stop | Out-Null
  $taskInstalled = $true
} catch {
  Write-Host "Windows did not allow a scheduled task without administrator rights. Startup fallback will be used."
}
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'PPR - ZIP to Word.lnk'
$shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'powershell.exe'; $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $here 'convert-archive-to-word.ps1')`""; $shortcut.WorkingDirectory = $here; $shortcut.Save()
$startup = [Environment]::GetFolderPath('Startup')
$startupShortcutPath = Join-Path $startup 'PPR monthly journal archive.lnk'
$monitor = Join-Path $here 'daily-archive-monitor.ps1'
$startupShortcut = $shell.CreateShortcut($startupShortcutPath)
$startupShortcut.TargetPath = 'powershell.exe'
$startupShortcut.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$monitor`""
$startupShortcut.WorkingDirectory = $here
$startupShortcut.Save()
Write-Host "Setup complete. Creating a test ZIP for the previous month..."
& $runner
Write-Host "Done. ZIP archives: $root"
Write-Host "Use desktop shortcut PPR - ZIP to Word when Word files are needed"
if (!$taskInstalled) { Write-Host "Automatic archive check will run whenever this Windows user signs in" }
