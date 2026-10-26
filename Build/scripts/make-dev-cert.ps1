# Creates a self-signed code-signing certificate for signing the VSTO ClickOnce
# manifests locally, and points the project at it.
#
# Why this is needed: KleiKodeshVsto.csproj hardcodes ManifestCertificateThumbprint
# 248FB758... which only exists in the original maintainer's certificate store, and
# KleiKodesh_TemporaryKey.pfx is gitignored. A clean clone fails with MSB3323, and
# /p:SignManifests=false is explicitly rejected by the VSTO Office targets.
#
# Two deliberate choices:
#   1. Legacy CAPI provider + KeySpec Signature. ClickOnce's SignFile task fails on
#      CNG keys ("Invalid provider type specified"), so a CNG cert would build nothing.
#   2. The new thumbprint goes into KleiKodeshVsto.csproj.user, not the csproj.
#      Microsoft.Common.CurrentVersion.targets imports that file AFTER the project
#      body, so its value wins; *.user is gitignored; and the installer's nested
#      MSBuild invocation imports it too, which a /p: switch would not reach.

[CmdletBinding()]
param(
    # Derived from this script's own location, like build-helpers.ps1 does, so the
    # repo's Hebrew folder name never appears as a literal here - Windows PowerShell
    # 5.1 reads a .ps1 without a BOM as ANSI and would mangle it.
    [string]$ProjectRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = 'Stop'

$vstoDir  = Join-Path $ProjectRoot 'KleiKodeshVsto'
$userFile = Join-Path $vstoDir 'KleiKodeshVsto.csproj.user'
$subject  = 'CN=Klei Kodesh Local Development'

if (-not (Test-Path (Join-Path $vstoDir 'KleiKodeshVsto.csproj'))) {
    throw "KleiKodeshVsto.csproj not found under '$vstoDir'. Pass -ProjectRoot explicitly."
}

# Reuse an existing one rather than littering the store on every run.
$existing = Get-ChildItem Cert:\CurrentUser\My |
    Where-Object { $_.Subject -eq $subject -and $_.NotAfter -gt (Get-Date) } |
    Sort-Object NotAfter -Descending |
    Select-Object -First 1

if ($existing) {
    Write-Host "Reusing the existing certificate: $($existing.Thumbprint)" -ForegroundColor Cyan
    $cert = $existing
} else {
    $cert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject $subject `
        -CertStoreLocation 'Cert:\CurrentUser\My' `
        -KeyExportPolicy Exportable `
        -KeySpec Signature `
        -KeyLength 2048 `
        -HashAlgorithm SHA256 `
        -Provider 'Microsoft Enhanced Cryptographic Provider v1.0' `
        -NotAfter (Get-Date).AddYears(10)
    Write-Host "Created the certificate: $($cert.Thumbprint)" -ForegroundColor Green
}

# No PFX backup on purpose. -ProtectTo needs a domain account, and a password-based
# export would mean keeping a password somewhere for a certificate that protects
# nothing. This script is idempotent instead: it reuses the certificate if it is
# still there, and if it is gone a re-run mints a new one and rewrites the
# thumbprint below to match.

$userXml = @"
<?xml version="1.0" encoding="utf-8"?>
<!--
  Local development only. Gitignored via *.user, and imported by
  Microsoft.Common.CurrentVersion.targets AFTER the project body, so this
  thumbprint overrides the one hardcoded in KleiKodeshVsto.csproj.

  It names the self-signed certificate "$subject" in this account's personal
  store. If that certificate is gone, re-run Build\scripts\make-dev-cert.ps1:
  it mints a new one and rewrites this thumbprint to match.

  Releases must be signed with the real certificate, not this one.
-->
<Project ToolsVersion="4.0" xmlns="http://schemas.microsoft.com/developer/msbuild/2003">
  <PropertyGroup>
    <ManifestCertificateThumbprint>$($cert.Thumbprint)</ManifestCertificateThumbprint>
  </PropertyGroup>
</Project>
"@

[System.IO.File]::WriteAllText($userFile, $userXml, (New-Object System.Text.UTF8Encoding $false))
Write-Host "Wrote $userFile" -ForegroundColor Green
Write-Host ''
Write-Host "Thumbprint: $($cert.Thumbprint)"
Write-Host "Expires:    $($cert.NotAfter)"
