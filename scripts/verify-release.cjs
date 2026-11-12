const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const release = path.join(root, 'release');
const installer = path.join(release, `Media Reset Pro Setup ${require('../package.json').version}.exe`);
const unpackedExe = path.join(release, 'win-unpacked', 'Media Reset Pro.exe');
const pkg = require('../package.json');
const lockPath = path.join(root, 'package-lock.json');
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok, detail });

check('x64 Windows verification host', process.platform === 'win32' && process.arch === 'x64', `${process.platform}/${process.arch}`);
check('Installer exists under expected versioned name', fs.existsSync(installer), installer);
check('Unpacked Electron x64 executable exists', fs.existsSync(unpackedExe) && peMachine(unpackedExe) === 0x8664, unpackedExe);
let stat;
if (fs.existsSync(installer)) {
  stat = fs.statSync(installer);
  check('Installer is larger than an incomplete NSIS stub', stat.size > 1024 * 1024, `${stat.size} bytes; minimum 1048577`);
  check('Installer is a PE executable', peMachine(installer) !== undefined, `machine=0x${peMachine(installer)?.toString(16)}`);
  const start = Number(process.env.MRP_BUILD_START_MS || 0);
  if (process.env.MRP_REQUIRE_FRESH_BUILD === '1') check('Installer was generated in this workflow run', start > 0 && stat.mtimeMs >= start - 5000, `mtime=${stat.mtime.toISOString()}; buildStart=${start ? new Date(start).toISOString() : 'missing'}`);
}

const sha256 = fs.existsSync(installer) ? hash(installer) : undefined;
if (sha256) check('Installer SHA-256 computed', /^[A-F0-9]{64}$/.test(sha256), sha256);
const lockSha256 = fs.existsSync(lockPath) ? hash(lockPath) : undefined;
const report = {
  generatedAt: new Date().toISOString(),
  result: checks.every(x => x.ok) ? 'PASS' : 'FAIL',
  appVersion: pkg.version,
  node: process.version,
  npm: process.env.npm_config_user_agent || null,
  electron: require('../node_modules/electron/package.json').version,
  electronBuilder: require('../node_modules/electron-builder/package.json').version,
  architecture: process.arch,
  installer: fs.existsSync(installer) ? { path: installer, sizeBytes: stat.size, modifiedUtc: stat.mtime.toISOString(), sha256 } : null,
  packageLockSha256: lockSha256,
  sourceRevision: process.env.GITHUB_SHA || null,
  checks,
};
const logs = path.join(root, 'outputs', 'logs');
fs.mkdirSync(logs, { recursive: true });
fs.writeFileSync(path.join(logs, 'release-integrity.json'), JSON.stringify(report, null, 2));
if (report.result === 'PASS') {
  const manifestPath = path.join(root, 'outputs', 'build-manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'outputs', 'SHA256SUMS.txt'), `${sha256}  ${path.basename(installer)}\n${lockSha256}  package-lock.json\n`);
}
console.log(JSON.stringify(report, null, 2));
if (report.result !== 'PASS') process.exitCode = 1;

function hash(file) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex').toUpperCase();
}
function peMachine(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 2) !== 'MZ') return undefined;
  const offset = b.readUInt32LE(0x3c);
  if (b.toString('binary', offset, offset + 4) !== 'PE\0\0') return undefined;
  return b.readUInt16LE(offset + 4);
}
