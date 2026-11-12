const fs = require('node:fs');
const path = require('node:path');

const pkg = require('../package.json');
const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  if (!ok) failures.push(name);
};
check('Windows host', process.platform === 'win32', process.platform);
check('x64 Node host', process.arch === 'x64', process.arch);
check('Pinned Node runtime', process.version === `v${pkg.engines.node}`, process.version);
check('Pinned npm runtime', process.env.npm_config_user_agent?.includes(`npm/${pkg.engines.npm}`) ?? false, process.env.npm_config_user_agent || 'not invoked by npm');
const electronVersion = require('electron/package.json').version;
const builderVersion = require('electron-builder/package.json').version;
check('Electron dependency matches pin', electronVersion === pkg.devDependencies.electron, electronVersion);
check('electron-builder dependency matches pin', builderVersion === pkg.devDependencies['electron-builder'], builderVersion);
let sharpVersion = 'unavailable', vipsVersion = 'unavailable', addonPath = '';
try {
  const sharp = require('sharp');
  sharpVersion = sharp.versions.sharp;
  vipsVersion = sharp.versions.vips;
  // Sharp intentionally exposes no package entry point for its platform addon.
  // Inspect the known optional-dependency file directly after the binding loads.
  const nativeDir = path.resolve(__dirname, '..', 'node_modules', '@img', 'sharp-win32-x64', 'lib');
  addonPath = fs.existsSync(nativeDir)
    ? path.join(nativeDir, fs.readdirSync(nativeDir).find(name => /^sharp-win32-x64.*\.node$/i.test(name)) || '')
    : '';
  if (!addonPath || !fs.existsSync(addonPath)) addonPath = '';
} catch (e) { failures.push('Sharp native binding loads'); console.error(e); }
check('Sharp pinned package loads native binding', sharpVersion === pkg.dependencies.sharp, `${sharpVersion}; libvips=${vipsVersion}; addon=${addonPath}`);
check('Sharp binary target is Win32 x64', addonPath.includes('sharp-win32-x64'), addonPath);

const report = { generatedAt: new Date().toISOString(), platform: process.platform, arch: process.arch, node: process.version, npm: process.env.npm_config_user_agent || null, electron: electronVersion, electronBuilder: builderVersion, sharp: sharpVersion, libvips: vipsVersion, addonPath, result: failures.length ? 'FAIL' : 'PASS' };
const out = path.resolve(__dirname, '..', 'outputs', 'logs', `native-integrity-${Date.now()}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
