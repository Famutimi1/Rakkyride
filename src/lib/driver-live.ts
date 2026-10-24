import type {LiveSocket} from './rider-live.ts';
export const driverEvents={location:'driver:location:update',offline:'driver:offline',offer:'trip:offer',offerCancelled:'trip:offer_cancelled',settings:'driver:service-settings',locationError:'location:error'} as const;
export function socketAck(socket:LiveSocket|null,event:string,value?:object){return new Promise<void>((resolve,reject)=>{
 if(!socket?.connected){reject(new Error('Live connection unavailable. Keep this page open and reconnect.'));return;}
 const timer=setTimeout(()=>reject(new Error('Update was not confirmed. Refresh your status before retrying.')),8000);
 const ack=(result:{ok?:boolean;error?:string})=>{clearTimeout(timer);if(result?.ok)resolve();else reject(new Error(result?.error??'The update could not be confirmed.'));};
 if(value)socket.emit(event,value,ack);else socket.emit(event,ack);
});}
export function freshBrowserPosition(point:{latitude:number;longitude:number;timestamp:number;accuracy:number},now=Date.now()){
 return Number.isFinite(point.latitude)&&Math.abs(point.latitude)<=90&&Number.isFinite(point.longitude)&&Math.abs(point.longitude)<=180&&Number.isFinite(point.timestamp)&&now-point.timestamp>=-5000&&now-point.timestamp<=15000&&Number.isFinite(point.accuracy)&&point.accuracy<=200;
}
