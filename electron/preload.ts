import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('mediaApi', {
  chooseFiles: () => ipcRenderer.invoke('choose-files'), chooseFolder: () => ipcRenderer.invoke('choose-folder'),
  chooseOutput: () => ipcRenderer.invoke('choose-output'), chooseTool:(name:'ffmpeg'|'ffprobe')=>ipcRenderer.invoke('choose-tool',name), validateTools:()=>ipcRenderer.invoke('validate-tools'), setConcurrency:(n:number)=>ipcRenderer.invoke('set-concurrency',n),
  addPaths: (paths:string[],recursive:boolean) => ipcRenderer.invoke('add-paths',paths,recursive),
  getState: () => ipcRenderer.invoke('get-state'), start: (settings:unknown) => ipcRenderer.invoke('start',settings),
  clearQueue: () => ipcRenderer.invoke('clear-queue'),
  pause: () => ipcRenderer.invoke('pause'), resume: () => ipcRenderer.invoke('resume'), cancel: () => ipcRenderer.invoke('cancel'), cancelJob:(id:string)=>ipcRenderer.invoke('cancel-job',id), retryJob:(id:string)=>ipcRenderer.invoke('retry-job',id),
  onState: (callback:(state:unknown)=>void) => { const fn=(_:unknown,s:unknown)=>callback(s); ipcRenderer.on('state',fn); return ()=>ipcRenderer.removeListener('state',fn); },
  openOutput: () => ipcRenderer.invoke('open-output'), openReport:(file:string)=>ipcRenderer.invoke('open-report',file),
});
