# Windows x64 reproducible build

## Requirements

- Windows x64, Node.js `24.15.0` from `.nvmrc`, npm `11.12.1` from `package.json`.
- A private GitHub repository for workflow artifact upload. The workflow requests only `contents: read`, does not create Releases, and retains artifacts for seven days. Repository readers can download workflow artifacts.
- FFmpeg/FFprobe are external runtime dependencies for the application. The CI helper downloads one checksum-pinned GPL FFmpeg build solely to run integration tests; it is not copied into the installer. Review FFmpeg/component licensing before distributing any FFmpeg binary.

## Reproduce locally on an authorized Windows host

From the project root in PowerShell:

```powershell
node --version                 # v24.15.0
npm --version                  # 11.12.1
npm ci
./scripts/install-ci-ffmpeg.ps1
npm run verify:native
npm run build
npm test
$env:MRP_BUILD_START_MS = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()
$env:MRP_REQUIRE_FRESH_BUILD = '1'
npm run dist:diagnose
npm run verify:package
npm run verify:release
```

The FFmpeg helper is intended for CI/integration testing, not application runtime distribution. On an ordinary local host, use a separately obtained FFmpeg/FFprobe whose licensing and source obligations are understood. `dist:diagnose` keeps its logs under `outputs/logs/` and redirects Electron/electron-builder caches and temp files to project `work/`. Do not rerun NSIS repeatedly on a host where Windows refuses to launch the generated intermediate; use the workflow or an authorized build host and preserve the full diagnostic log.

## GitHub Actions

Commit the project to a **private** repository, push to `main` or open a pull request, or run **Media Reset Pro - Windows x64** through Actions → Run workflow. `.github/workflows/windows-build.yml` uses the GitHub-hosted `windows-2025` x64 runner and pinned official Actions. It checks architecture and runtime pins, installs checksum-verified test FFmpeg, runs `npm ci`, native checks, build, all tests, NSIS, package integrity, and installer freshness/hash verification. Failure stops the job; an `always()` artifact step preserves available logs. Successful binaries/logs are uploaded only when GitHub marks the repository private. No public release or repository publication is performed.

Expected outputs: `release/Media Reset Pro Setup 0.1.0.exe`, blockmap, `outputs/build-manifest.json`, `outputs/SHA256SUMS.txt`, and `outputs/logs/`. The manifest records byte size, UTC time, installer SHA-256, lockfile SHA-256 and version. The release verifier rejects an old installer and a small intermediate stub.

## Desktop validation is separate

The workflow proves build/package structure; it does not install or interact with the desktop app. Use an authorized interactive Windows test machine and follow [outputs/VALIDACAO-WINDOWS.md](outputs/VALIDACAO-WINDOWS.md). Preserve the startup log, screenshots, input/output hashes, FFprobe/Sharp inspection, metadata reports, and each queue-control result. A successful CI run is not evidence that Windows installed/launched the application or that the UI flow passed.

## Diagnosing a blocked executable

The current local forensic report identifies the electron-builder operation, but `spawn UNKNOWN` did not include a numeric Win32 `errno` or native status. The intermediate file is unsigned and has only standard Windows DLL imports. The available evidence does not prove App Control, antivirus, permission denial, or a loader defect as the cause. Do not change security settings. On an authorized administrator-managed machine, capture the complete runner/build log and Windows Code Integrity/App Control/Defender events for the exact UTC attempt; have the administrator determine whether policy denied it. If no policy event exists, retain the full `spawn` stack and investigate loader/runtime compatibility with the tool vendor.
