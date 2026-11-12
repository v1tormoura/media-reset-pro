import { app, BrowserWindow, WebContents } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const logFile = path.join(app.getPath('temp'), 'MediaResetPro-startup.log');
function log(level: string, message: unknown) {
  const line = `${JSON.stringify({ timestamp: new Date().toISOString(), level, processId: process.pid, appVersion: app.getVersion(), packaged: app.isPackaged, message: message instanceof Error ? message.stack || message.message : String(message) })}\r\n`;
  try { fs.appendFileSync(logFile, line, 'utf8'); } catch { /* stderr remains available if the temp folder is unavailable */ }
  if (level === 'ERROR') process.stderr.write(line);
}

log('INFO', `bootstrap start; version=${app.getVersion()}; packaged=${app.isPackaged}; cwd=${process.cwd()}; dirname=${__dirname}`);
process.on('uncaughtException', e => log('ERROR', e));
process.on('unhandledRejection', e => log('ERROR', `unhandled rejection: ${String(e)}`));
app.on('child-process-gone', (_event, details) => log('ERROR', `child process gone: ${JSON.stringify(details)}`));
app.on('web-contents-created', (_event, contents: WebContents) => {
  contents.on('preload-error', (_event, preloadPath, error) => log('ERROR', `preload error ${preloadPath}: ${error.stack || error.message}`));
  contents.on('did-fail-load', (_event, code, description, url, isMainFrame) => log('ERROR', `did-fail-load code=${code} description=${description} url=${url} mainFrame=${isMainFrame}`));
  contents.on('console-message', (_event, level, message, line, sourceId) => { if (level >= 2) log('ERROR', `renderer console ${sourceId}:${line} ${message}`); });
});
app.on('browser-window-created', (_event, window: BrowserWindow) => {
  log('INFO', `window created; preload=${path.join(__dirname, 'preload.js')}; packaged=${app.isPackaged}`);
  window.once('ready-to-show', () => log('INFO', 'window ready-to-show'));
  window.webContents.on('render-process-gone', (_event, details) => log('ERROR', `renderer process gone: ${JSON.stringify(details)}`));
  window.webContents.once('dom-ready', () => log('INFO', `renderer DOM ready: ${window.webContents.getURL()}`));
});

try { require('./main.js'); log('INFO', 'main module loaded'); }
catch (e) { log('ERROR', `main module threw during require: ${String(e)}`); app.exit(1); }
