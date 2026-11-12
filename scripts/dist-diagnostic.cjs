const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const localData = path.join(root, 'work', 'build-localappdata');
const temp = path.join(root, 'work', 'build-temp');
const logDir = path.join(root, 'outputs', 'logs');
fs.mkdirSync(localData, { recursive: true });
fs.mkdirSync(temp, { recursive: true });
fs.mkdirSync(logDir, { recursive: true });
const logPath = path.join(logDir, `dist-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);

const diag = {
  timestamp: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  cwd: root,
  originalLocalAppData: process.env.LOCALAPPDATA,
  alternateLocalAppData: localData,
  originalTemp: process.env.TEMP,
  alternateTemp: temp,
  electron: require('../node_modules/electron/package.json').version,
  electronBuilder: require('../node_modules/electron-builder/package.json').version,
  activeElectronOrNodeProcesses: 'No processes are terminated; inspect the process snapshot below.',
};
const header = [`Media Reset Pro dist diagnostic`, JSON.stringify(diag, null, 2), '--- npm run dist output ---', ''].join('\n');
fs.writeFileSync(logPath, header, 'utf8');
if (process.platform === 'win32') {
  const processSnapshot = spawnSync('powershell.exe', ['-NoProfile', '-Command', 'Get-Process electron,node,makensis -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path,StartTime | ConvertTo-Json -Compress'], { encoding: 'utf8', windowsHide: true });
  fs.appendFileSync(logPath, `\n--- active process snapshot (before build) ---\n${processSnapshot.stdout || processSnapshot.stderr || 'No matching processes or snapshot unavailable.'}\n`, 'utf8');
}

const env = {
  ...process.env,
  LOCALAPPDATA: localData,
  TEMP: temp,
  TMP: temp,
  // electron-builder may use this for its own cache; @electron/get uses LOCALAPPDATA.
  ELECTRON_BUILDER_CACHE: path.join(root, 'work', 'builder-cache'),
};
for (const dir of [env.ELECTRON_BUILDER_CACHE, path.join(localData, 'electron', 'Cache')]) {
  fs.mkdirSync(dir, { recursive: true });
  fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
}

const shell = process.platform === 'win32';
const result = spawnSync('npm', ['run', 'dist'], {
  cwd: root,
  env,
  encoding: 'utf8',
  shell,
  windowsHide: true,
  maxBuffer: 32 * 1024 * 1024,
});
const output = `${result.stdout || ''}${result.stderr || ''}`;
fs.appendFileSync(logPath, output, 'utf8');

if (result.error || result.status !== 0) {
  const eprem = output.match(/EPERM[^\r\n]*/i);
  const rename = output.match(/rename ['"]([^'"\r\n]+)['"]\s*(?:->|to)\s*['"]([^'"\r\n]+)['"]/i);
  const spawnFailure = output.match(/Cannot spawn ([^\r\n]+?):\s*Error:\s*spawn ([A-Z0-9_]+)/i);
  const networkFailure = output.match(/getaddrinfo\s+([A-Z0-9_]+)\s+([^\r\n]+)/i);
  const commandFailure = output.match(/([A-Z]:\\[^\r\n]+?makensis\.cmd) process failed ([A-Z0-9_]+)/i);
  const nsisTarget = output.match(/target=nsis file=([^\s]+\.exe)/i);
  const spawnUnknownDuringUninstaller = /spawn UNKNOWN/i.test(output) && /WineVmManager\.execWine|computeScriptAndSignUninstaller/i.test(output);
  const attemptedPath = spawnFailure?.[1] || commandFailure?.[1] || (spawnUnknownDuringUninstaller && nsisTarget ? path.resolve(root, 'release', nsisTarget[1]) : undefined);
  const summary = {
    timestamp: new Date().toISOString(),
    exitCode: result.status,
    spawnError: result.error?.message,
    failure: eprem?.[0] || spawnFailure?.[0] || commandFailure?.[0] || (spawnUnknownDuringUninstaller ? 'Windows could not launch the intermediate NSIS executable while electron-builder was extracting the uninstaller.' : undefined) || networkFailure?.[0] || 'Build failed; inspect full command output above.',
    operation: spawnUnknownDuringUninstaller ? 'electron-builder NsisTarget.computeScriptAndSignUninstaller -> WineVmManager.execWine' : undefined,
    sourcePath: rename?.[1],
    destinationPath: rename?.[2] || attemptedPath,
    systemError: spawnFailure?.[2] || commandFailure?.[2] || networkFailure?.[1],
    cacheEnv: { LOCALAPPDATA: localData, TEMP: temp, TMP: temp, ELECTRON_BUILDER_CACHE: env.ELECTRON_BUILDER_CACHE },
  };
  fs.appendFileSync(logPath, `\n--- structured failure summary ---\n${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  process.stderr.write(`Build falhou. Diagnóstico e operação/caminhos (quando reportados) em: ${logPath}\n`);
  process.exit(result.status || 1);
}

fs.appendFileSync(logPath, `\nBuild concluído em ${new Date().toISOString()}\n`, 'utf8');
process.stdout.write(`Build concluído. Log: ${logPath}\n`);
