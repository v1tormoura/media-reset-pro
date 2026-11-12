const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'release', 'win-unpacked');
const resources = path.join(appDir, 'resources');
const archive = path.join(resources, 'app.asar');
const checks = [];
const record = (name, ok, detail) => checks.push({ name, ok, detail });
const appExe = path.join(appDir, 'Media Reset Pro.exe');
record('Windows x64 Electron executable exists', fs.existsSync(appExe), appExe);
record('Electron application executable is PE x64', fs.existsSync(appExe) && readPeMachine(appExe) === 0x8664, fs.existsSync(appExe) ? `machine=0x${readPeMachine(appExe)?.toString(16)}` : appExe);
record('ASAR exists and is non-empty', fs.existsSync(archive) && fs.statSync(archive).size > 0, archive);

let files = [];
if (fs.existsSync(archive)) {
  try { files = asar.listPackage(archive, { isPack: false }).map(f => f.replaceAll('\\', '/').replace(/^\//, '')); } catch (e) { record('ASAR header readable', false, String(e)); }
}
for (const required of ['dist-electron/bootstrap.js', 'dist-electron/main.js', 'dist-electron/preload.js', 'dist/index.html']) {
  record(`ASAR contains ${required}`, files.includes(required), required);
}
record('ASAR contains renderer bundle', files.some(f => f.startsWith('dist/assets/index-') && f.endsWith('.js')), 'dist/assets/index-*.js');
record('ASAR contains app package metadata', files.includes('package.json'), 'package.json');

const nativeRoot = path.join(resources, 'app.asar.unpacked', 'node_modules', '@img');
const nativeFiles = fs.existsSync(nativeRoot) ? walk(nativeRoot) : [];
record('Sharp Win32 x64 native addon unpacked', nativeFiles.some(f => /sharp-win32-x64.*\.node$/i.test(f)), nativeRoot);
const sharpAddon = nativeFiles.find(f => /sharp-win32-x64.*\.node$/i.test(f));
record('Sharp native addon is PE x64', Boolean(sharpAddon) && readPeMachine(sharpAddon) === 0x8664, sharpAddon ? `machine=0x${readPeMachine(sharpAddon)?.toString(16)}` : 'not found');
record('Sharp/libvips Windows native library unpacked', nativeFiles.some(f => /libvips.*\.dll$/i.test(f)), nativeRoot);
record('Electron Chromium runtime libraries exist', ['ffmpeg.dll', 'resources.pak', 'icudtl.dat'].every(f => fs.existsSync(path.join(appDir, f))), appDir);
record('FFmpeg/FFprobe CLI external dependency documented', fs.existsSync(path.join(root, 'outputs', 'THIRD-PARTY-NOTICES.md')), 'Not bundled; selected and validated in app settings');

if (fs.existsSync(archive) && files.includes('dist-electron/main.js')) {
  const mainSource = asar.extractFile(archive, 'dist-electron/main.js').toString('utf8');
  const bootstrapSource = asar.extractFile(archive, 'dist-electron/bootstrap.js').toString('utf8');
  record('Packaged main resolves local state via userData', mainSource.includes('media-reset-state.json') && mainSource.includes('userData'), 'JSON state under Electron userData');
  record('Packaged main has default settings and output path', mainSource.includes('concurrency') && /getPath\(["']videos["']\)/.test(mainSource), 'default output and concurrency initialization');
  record('Packaged bootstrap configures startup logs', bootstrapSource.includes('MediaResetPro-startup.log'), 'temp startup log');
}
try {
  const sharpPath = path.join(resources, 'app.asar.unpacked', 'node_modules', 'sharp');
  const sharp = require(sharpPath);
  record('Packaged Sharp native binding loads in this Node host', Boolean(sharp.versions.sharp && sharp.versions.vips), `sharp=${sharp.versions.sharp}; libvips=${sharp.versions.vips}; host=${process.platform}/${process.arch}`);
} catch (e) {
  record('Packaged Sharp native binding loads in this Node host', false, String(e));
}

const report = { generatedAt: new Date().toISOString(), appVersion: require('../package.json').version, electron: require('../node_modules/electron/package.json').version, checks, result: checks.every(c => c.ok) ? 'PASS_STATIC_PACKAGING' : 'FAIL' };
const reportPath = path.join(root, 'outputs', 'logs', `packaging-integrity-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.result.startsWith('PASS')) process.exitCode = 1;

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(p)); else result.push(p);
  }
  return result;
}

function readPeMachine(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 2) !== 'MZ') return undefined;
  const offset = b.readUInt32LE(0x3c);
  if (b.toString('binary', offset, offset + 4) !== 'PE\0\0') return undefined;
  return b.readUInt16LE(offset + 4);
}
