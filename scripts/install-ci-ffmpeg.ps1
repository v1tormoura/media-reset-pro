$ErrorActionPreference = 'Stop'

# Test-only toolchain. FFmpeg's download page lists BtbN's Windows builds.
# This dated GPL build is used only for integration tests and is never packaged.
$tag = 'autobuild-2026-11-01-12-49'
$archiveName = 'ffmpeg-N-128273-g836436cfb9-win64-gpl.zip'
$expectedSha256 = 'ad99b0b94e68f2932391ad982c193b847c93ba41f17b7cafbf50710e15d45185'
$url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/$tag/$archiveName"
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$toolDir = Join-Path $root 'work\ci-ffmpeg'
$archivePath = Join-Path $toolDir $archiveName
$extractDir = Join-Path $toolDir 'unpacked'

New-Item -ItemType Directory -Path $toolDir -Force | Out-Null
Invoke-WebRequest -Uri $url -OutFile $archivePath
$actualSha256 = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualSha256 -ne $expectedSha256) {
  throw "FFmpeg test archive SHA-256 mismatch. Expected $expectedSha256, got $actualSha256."
}

if (Test-Path -LiteralPath $extractDir) { Remove-Item -LiteralPath $extractDir -Recurse -Force }
Expand-Archive -LiteralPath $archivePath -DestinationPath $extractDir -Force
$ffmpeg = Get-ChildItem -LiteralPath $extractDir -Filter ffmpeg.exe -File -Recurse | Select-Object -First 1
if (-not $ffmpeg) { throw 'Pinned archive did not contain ffmpeg.exe.' }
$ffprobe = Join-Path $ffmpeg.DirectoryName 'ffprobe.exe'
if (-not (Test-Path -LiteralPath $ffprobe -PathType Leaf)) { throw 'Pinned archive did not contain sibling ffprobe.exe.' }

$ffmpegVersion = (& $ffmpeg.FullName -version 2>&1 | Select-Object -First 1).ToString()
if ($LASTEXITCODE -ne 0 -or $ffmpegVersion -notmatch 'N-128273-g836436cfb9') {
  throw "Unexpected FFmpeg build/version: $ffmpegVersion"
}
if ($env:GITHUB_PATH) { Add-Content -LiteralPath $env:GITHUB_PATH -Value $ffmpeg.DirectoryName }
$env:PATH = "$($ffmpeg.DirectoryName);$env:PATH"

$manifest = [ordered]@{
  source = 'https://ffmpeg.org/download.html -> BtbN/FFmpeg-Builds'
  releaseTag = $tag
  asset = $archiveName
  sha256 = $actualSha256
  version = $ffmpegVersion
  scope = 'CI integration tests only; not copied into the application installer'
  licenseVariant = 'GPL static build; review upstream license and component list'
}
$logDir = Join-Path $root 'outputs\logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$manifest | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $logDir 'ci-ffmpeg.json') -Encoding utf8
Write-Output "FFmpeg pinned test tools verified: $ffmpegVersion"
