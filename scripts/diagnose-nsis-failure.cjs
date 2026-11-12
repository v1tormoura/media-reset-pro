const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const logPath = path.join(root, 'outputs', 'logs', 'dist-2026-11-02T12-00-59-773Z.log');
const archivedTarget = path.join(root, 'outputs', 'Media Reset Pro Setup 0.1.0 - INCOMPLETO (nao instalar) - 2026-11-02.exe');
const bytes = fs.readFileSync(archivedTarget);
const file = fs.statSync(archivedTarget);
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const pe = readPe(bytes);
const log = fs.readFileSync(logPath, 'utf8');
const failedStage = log.includes('WineVmManager.execWine') && log.includes('computeScriptAndSignUninstaller');
const imports = pe.imports.map(name => ({ name, siblingFound: fs.existsSync(path.join(path.dirname(archivedTarget), name)) }));
const output = command('whoami.exe', []) || 'unavailable';
const acl = command('icacls.exe', [archivedTarget]) || 'unavailable';
const signatureCommand = ['-NoProfile', '-Command', `Import-Module Microsoft.PowerShell.Security -ErrorAction SilentlyContinue; (Get-AuthenticodeSignature -LiteralPath '${archivedTarget.replace(/'/g, "''")}') | Select-Object Status,StatusMessage | ConvertTo-Json -Compress`];
const signatureText = command('pwsh.exe', signatureCommand) || command('powershell.exe', signatureCommand) || 'unavailable';
let signature;
try { signature = JSON.parse(signatureText); } catch { signature = { raw: signatureText.trim() }; }

const report = {
  generatedAt: new Date().toISOString(),
  sourceLog: path.resolve(logPath),
  electronBuilderOperation: failedStage ? 'NsisTarget.computeScriptAndSignUninstaller -> WineVmManager.execWine -> builder-util execFile' : 'See source log stack trace',
  processLaunch: {
    executableFromBuildLog: path.join(root, 'release', 'Media Reset Pro Setup 0.1.0.exe'),
    preservedIntermediateCopy: path.resolve(archivedTarget),
    arguments: [],
    environmentOverrides: { __COMPAT_LAYER: 'RunAsInvoker' },
    error: 'spawn UNKNOWN',
    win32ErrorNumber: null,
    note: 'The log omits Node errno/spawnargs and the OS Win32 error number; they cannot be recovered from that log alone. This diagnostic does not execute the file.',
  },
  processIdentityAtDiagnosis: output.trim(),
  file: {
    sizeBytes: file.size,
    createdUtc: file.birthtime.toISOString(),
    modifiedUtc: file.mtime.toISOString(),
    sha256,
    pe,
    authenticode: signature,
    acl,
  },
  imports,
  policyEvidence: {
    appLockerEventLog: 'Previous query was denied with Attempted to perform an unauthorized operation.',
    causeAttribution: 'Not established. The evidence proves Windows process creation failed with Node code UNKNOWN; it does not prove App Control or antivirus caused it.',
    securityChanges: 'None',
  },
};
const dest = path.join(root, 'outputs', 'logs', 'nsis-failure-forensics.json');
fs.writeFileSync(dest, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

function command(bin, args) {
  try { return execFileSync(bin, args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e) { return e.stdout?.toString() || e.stderr?.toString() || `${e.code || 'ERROR'}: ${e.message}`; }
}

function readPe(b) {
  if (b.toString('ascii', 0, 2) !== 'MZ') throw new Error('Intermediate file is not an MZ/PE image.');
  const peOffset = b.readUInt32LE(0x3c);
  if (b.toString('binary', peOffset, peOffset + 4) !== 'PE\0\0') throw new Error('Invalid PE signature.');
  const machine = b.readUInt16LE(peOffset + 4);
  const sectionCount = b.readUInt16LE(peOffset + 6);
  const optionalSize = b.readUInt16LE(peOffset + 20);
  const opt = peOffset + 24;
  const magic = b.readUInt16LE(opt);
  const is64 = magic === 0x20b;
  const directoryOffset = opt + (is64 ? 112 : 96);
  const importRva = b.readUInt32LE(directoryOffset + 8);
  const osMajor = b.readUInt16LE(opt + 40);
  const osMinor = b.readUInt16LE(opt + 42);
  const subsystem = b.readUInt16LE(opt + (is64 ? 88 : 68));
  const sectionStart = opt + optionalSize;
  const sections = [];
  for (let i = 0; i < sectionCount; i++) {
    const s = sectionStart + i * 40;
    sections.push({ virtualSize: b.readUInt32LE(s + 8), virtualAddress: b.readUInt32LE(s + 12), rawSize: b.readUInt32LE(s + 16), rawPointer: b.readUInt32LE(s + 20) });
  }
  const rvaToOffset = rva => {
    const s = sections.find(x => rva >= x.virtualAddress && rva < x.virtualAddress + Math.max(x.virtualSize, x.rawSize));
    if (!s) throw new Error(`PE RVA not mapped: 0x${rva.toString(16)}`);
    return s.rawPointer + rva - s.virtualAddress;
  };
  const imports = [];
  if (importRva) {
    let off = rvaToOffset(importRva);
    for (let count = 0; count < 512; count++, off += 20) {
      const nameRva = b.readUInt32LE(off + 12);
      if (!nameRva) break;
      let p = rvaToOffset(nameRva), end = p;
      while (b[end] !== 0 && end < b.length) end++;
      imports.push(b.toString('ascii', p, end));
    }
  }
  return {
    valid: true,
    machine: `0x${machine.toString(16).padStart(4, '0')}`,
    architecture: machine === 0x8664 ? 'x64' : machine === 0x14c ? 'x86' : 'other',
    optionalHeader: is64 ? 'PE32+' : magic === 0x10b ? 'PE32' : `unknown 0x${magic.toString(16)}`,
    subsystem: subsystem === 2 ? 'Windows GUI' : subsystem === 3 ? 'Windows console' : String(subsystem),
    declaredWindowsVersion: `${osMajor}.${osMinor}`,
    imports,
  };
}
