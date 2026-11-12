export type QueueStatus='pending'|'processing'|'done'|'failed'|'cancelled';
export interface QueueItem {id:string;status:QueueStatus;progress:number;error?:string;committing?:boolean;}
export interface QueueControl {isCancelled:()=>boolean;waitIfPaused:()=>Promise<void>;reportProgress:(percent:number)=>void;}
type QueueHooks<T extends QueueItem>={process:(item:T,control:QueueControl)=>Promise<void>;cancelActive:(id:string)=>void;changed:()=>void;concurrency:()=>number};

/** Queue lifecycle used by the Electron app and exercised independently by integration tests. */
export class QueueEngine<T extends QueueItem>{
  running=false;paused=false;private cancelBatch=false;private cancelled=new Set<string>();
  constructor(readonly items:T[],private hooks:QueueHooks<T>){}
  private changed(){this.hooks.changed();}
  recover(){for(const item of this.items)if(item.status==='processing'){item.status='pending';item.progress=0;}this.running=false;this.paused=false;this.changed();}
  pause(){if(this.running&&!this.paused){this.paused=true;this.changed();}}
  resume(){if(this.paused){this.paused=false;this.changed();}}
  cancelOne(id:string){const item=this.items.find(x=>x.id===id);if(!item||item.committing||!['pending','processing','failed'].includes(item.status))return false;this.cancelled.add(id);item.status='cancelled';item.error='Cancelado pelo usuário';this.hooks.cancelActive(id);this.changed();return true;}
  cancelAll(){if(!this.running)return false;this.cancelBatch=true;this.paused=false;for(const item of this.items){if((item.status==='pending'||item.status==='processing')&&!item.committing){this.cancelled.add(item.id);item.status='cancelled';item.error='Lote cancelado pelo usuário';this.hooks.cancelActive(item.id);}}this.changed();return true;}
  retry(id:string){const item=this.items.find(x=>x.id===id);if(!item||this.running||!['failed','cancelled'].includes(item.status))return false;this.cancelled.delete(id);item.status='pending';item.progress=0;delete item.error;this.changed();return true;}
  async start():Promise<void>{if(this.running)return;this.running=true;this.cancelBatch=false;this.changed();const waitIfPaused=async()=>{while(this.paused&&!this.cancelBatch)await new Promise(resolve=>setTimeout(resolve,40));};const worker=async()=>{while(!this.cancelBatch){await waitIfPaused();if(this.cancelBatch)return;const item=this.items.find(x=>x.status==='pending');if(!item)return;item.status='processing';item.progress=Math.max(1,item.progress);delete item.error;this.changed();const control:QueueControl={isCancelled:()=>this.cancelBatch||this.cancelled.has(item.id)||item.status==='cancelled',waitIfPaused,reportProgress:p=>{if(!control.isCancelled()){item.progress=Math.max(0,Math.min(99,Number.isFinite(p)?p:0));this.changed();}}};try{await this.hooks.process(item,control);if(control.isCancelled()&&!item.committing){item.status='cancelled';item.error=item.error||'Cancelado pelo usuário';}else{item.status='done';item.progress=100;item.committing=false;delete item.error;}}catch(e){if(control.isCancelled()){item.status='cancelled';item.error=item.error||'Cancelado pelo usuário';}else{item.status='failed';item.error=e instanceof Error?e.message:String(e);}}this.changed();}};try{const count=Math.max(1,Math.min(8,Math.floor(this.hooks.concurrency())||1));await Promise.all(Array.from({length:count},worker));}finally{this.running=false;this.paused=false;this.cancelBatch=false;this.changed();}}
}
