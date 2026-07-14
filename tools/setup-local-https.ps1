$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$certDir = Join-Path $root "data\certs"
$pfxPath = Join-Path $certDir "ppr-local.pfx"
$cerPath = Join-Path $certDir "ppr-root-ca.cer"
$envPath = Join-Path $root ".env"
$ipAddress = "10.0.0.125"
$httpsPort = "8443"

New-Item -ItemType Directory -Force -Path $certDir | Out-Null

$rootCert = New-SelfSignedCertificate `
  -Type Custom `
  -Subject "CN=PPR Control Root CA" `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -KeyExportPolicy Exportable `
  -KeyUsage CertSign, CRLSign, DigitalSignature `
  -TextExtension @("2.5.29.19={critical}{text}ca=TRUE") `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotAfter (Get-Date).AddYears(5)

$serverCert = New-SelfSignedCertificate `
  -Type Custom `
  -Subject "CN=$ipAddress" `
  -Signer $rootCert `
  -KeyAlgorithm RSA `
  -KeyLength 2048 `
  -HashAlgorithm SHA256 `
  -KeyExportPolicy Exportable `
  -KeyUsage DigitalSignature, KeyEncipherment `
  -TextExtension @("2.5.29.17={text}IPAddress=$ipAddress&DNS=localhost&DNS=ppr.local", "2.5.29.37={text}1.3.6.1.5.5.7.3.1") `
  -CertStoreLocation "Cert:\CurrentUser\My" `
  -NotAfter (Get-Date).AddYears(5)

$pass = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$securePass = ConvertTo-SecureString -String $pass -AsPlainText -Force

Export-PfxCertificate -Cert $serverCert -FilePath $pfxPath -Password $securePass | Out-Null
Export-Certificate -Cert $rootCert -FilePath $cerPath | Out-Null

$lines = @()
if (Test-Path $envPath) {
  $lines = Get-Content -Encoding UTF8 -LiteralPath $envPath
}
$settings = [ordered]@{
  "HTTPS_PORT" = $httpsPort
  "HTTPS_PFX_FILE" = "data/certs/ppr-local.pfx"
  "HTTPS_PFX_PASS" = $pass
}

foreach ($key in $settings.Keys) {
  $value = $settings[$key]
  $found = $false
  $lines = $lines | ForEach-Object {
    if ($_ -match "^$([regex]::Escape($key))=") {
      $found = $true
      "$key=$value"
    } else {
      $_
    }
  }
  if (-not $found) {
    $lines += "$key=$value"
  }
}

Set-Content -Encoding UTF8 -LiteralPath $envPath -Value $lines

Write-Host ""
Write-Host "Done: trusted root CA and HTTPS server certificate created." -ForegroundColor Green
Write-Host ("Address after server restart: https://{0}:{1}/?v=96" -f $ipAddress, $httpsPort)
Write-Host ("Root certificate for phone installation: {0}" -f $cerPath)
Write-Host ""
