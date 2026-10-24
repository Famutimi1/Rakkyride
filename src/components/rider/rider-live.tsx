"use client";
import Script from "next/script";
import {useEffect,useRef,useState,type FormEvent} from "react";
import type {RiderTrip} from "@/contracts/rider";
import {loadRiderIdentity,riderApi} from "@/lib/rider-api";
import {useRiderLive,riderEvents,liveChanged,mergeMessages,messageKey,type LiveSocket,type LiveLocation,type LiveMessage} from "@/lib/rider-live";
import {ErrorNotice} from "./rider-common";
import {useRiderResource} from "./rider-resource";
import {RiderIcon} from "./rider-icon";

export function RiderLiveConnection({userId}:{userId:string}){
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    if(!ready)return;let stopped=false,timer:ReturnType<typeof setTimeout>|undefined,socket:LiveSocket|undefined;
    const io=(window as Window&{io?:(options:object)=>LiveSocket}).io;if(!io)return;
    async function connect(){
      if(stopped||!io)return;
      try{
        await loadRiderIdentity();if(stopped)return;
        useRiderLive.setState({phase:"connecting"});
        socket=io({path:"/api/rider/realtime",transports:["polling"],addTrailingSlash:false,upgrade:false,autoConnect:false,reconnection:false,forceNew:true,timeout:12000});
        useRiderLive.setState({socket});
        socket.on("connect",()=>{if(stopped)return;useRiderLive.setState({phase:"connected",error:""});const tripId=useRiderLive.getState().tripId;if(tripId)socket?.emit(riderEvents.join,tripId,(result:{ok:boolean})=>{if(!result?.ok)useRiderLive.setState({error:"The live trip could not be joined. Refresh the trip to try again."});});liveChanged("trip");liveChanged("wallet");liveChanged("notifications");});
        const retry=()=>{if(stopped)return;socket?.disconnect();useRiderLive.setState({phase:"offline",socket:null});if(timer)clearTimeout(timer);timer=setTimeout(()=>void connect(),12000);};
        socket.on("connect_error",retry);socket.on("disconnect",retry);
        socket.on(riderEvents.status,()=>liveChanged("trip"));socket.on(riderEvents.wallet,()=>liveChanged("wallet"));socket.on(riderEvents.notification,()=>liveChanged("notifications"));
        socket.on(riderEvents.location,(value)=>{const loc=value as Partial<LiveLocation>;if(typeof loc.tripId!=='string'||typeof loc.latitude!=='number'||typeof loc.longitude!=='number'||!Number.isFinite(loc.latitude)||!Number.isFinite(loc.longitude)||Math.abs(loc.latitude)>90||Math.abs(loc.longitude)>180||!Number.isFinite(loc.timestamp)||Math.abs(Date.now()-Number(loc.timestamp))>120000)return;useRiderLive.setState(state=>state.locations[loc.tripId!]?.timestamp>Number(loc.timestamp)?state:{locations:{...state.locations,[loc.tripId!]:loc as LiveLocation}});});
        socket.on(riderEvents.message,(value)=>{const message=value as Partial<LiveMessage>;if(typeof message.id!=='string'||typeof message.tripId!=='string'||typeof message.senderId!=='string'||typeof message.text!=='string'||message.text.length>1000||!Number.isFinite(message.sentAt)||(message.senderRole!=='rider'&&message.senderRole!=='driver'))return;useRiderLive.setState(state=>({messages:mergeMessages(state.messages,[message as LiveMessage]).slice(-100)}));});
        socket.on(riderEvents.messageError,(error)=>useRiderLive.setState({error:typeof error==='string'?error:"Message could not be sent."}));socket.connect();
      }catch{if(!stopped){useRiderLive.setState({phase:"offline"});timer=setTimeout(()=>void connect(),15000);}}
    }
    void connect();
    return()=>{stopped=true;if(timer)clearTimeout(timer);socket?.disconnect();useRiderLive.getState().reset();};
  },[ready,userId]);
  return <Script src="/api/rider/realtime/client.js" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>useRiderLive.setState({phase:"offline"})}/>;
}
export function RiderTripChat({trip,mode="rider"}:{trip:RiderTrip;mode?:"rider"|"driver"}){
  const socket=useRiderLive(s=>s.socket),phase=useRiderLive(s=>s.phase),messages=useRiderLive(s=>s.messages),liveError=useRiderLive(s=>s.error),[draft,setDraft]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[before,setBefore]=useState<string|null>(null);
  const history=useRiderResource<{messages:LiveMessage[];nextBefore:string|null}>(`trips/${trip.id}/messages${before?`?before=${before}`:""}`,true,before?0:15000,mode),pending=useRef<{text:string;id:string}|null>(null);
  const canChat=!!trip.driver_id&&['driver_assigned','driver_arrived','in_progress','returning'].includes(trip.status);
  const visible=before?history.data?.messages??[]:mergeMessages(history.data?.messages??[],messages.filter(m=>m.tripId===trip.id));
  useEffect(()=>{useRiderLive.setState({tripId:trip.id});if(socket?.connected)socket.emit(riderEvents.join,trip.id,(result:{ok:boolean})=>{if(!result?.ok)setError("The live trip could not be joined.");});return()=>{socket?.emit(riderEvents.leave,trip.id);if(useRiderLive.getState().tripId===trip.id)useRiderLive.setState({tripId:null});};},[socket,trip.id]);
  async function send(event:FormEvent){event.preventDefault();if(!canChat||busy||!draft.trim())return;setBusy(true);setError("");useRiderLive.setState({error:""});
    const text=draft.trim();if(pending.current?.text!==text)pending.current={text,id:crypto.randomUUID()};
    try{const result=await riderApi<{message:LiveMessage}>(`trips/${trip.id}/messages`,{method:"POST",body:{id:pending.current!.id,text},scope:mode});useRiderLive.setState(state=>({messages:mergeMessages(state.messages,[result.message]).slice(-100)}));setDraft("");pending.current=null;setBefore(null);history.reload();}catch(e){setError(e instanceof Error?e.message:"Message could not be saved. Retry to check this same message.");}finally{setBusy(false);}
  }
  return <section className="rr-panel rr-trip-chat"><div className="rr-section-heading"><h2>Your trip conversation.</h2><span className="rr-pill">{phase==='connected'?'Live':'Refreshing'}</span></div><div className="rr-chat-intro"><img src="/rider/rakky-account-care.webp" alt=""/><p className="rr-small">Messages are saved to this journey and remain available when you return. Only you and your {mode==='driver'?'customer':'driver'} can read this trip conversation.</p></div><ErrorNotice error={error||history.error||liveError} retry={history.reload}/>{(history.data?.nextBefore||before)&&<div className="rr-inline-actions">{history.data?.nextBefore&&<button className="rr-link" disabled={history.loading} onClick={()=>setBefore(history.data!.nextBefore)}>Earlier messages</button>}{before&&<button className="rr-link" onClick={()=>setBefore(null)}>Back to latest messages</button>}</div>}{history.loading&&<p className="rr-small" role="status">Loading saved messages…</p>}<div className="rr-conversation" aria-label="Driver conversation" aria-live={before?'off':'polite'}>{visible.map(m=><article key={messageKey(m)} className={m.senderRole===mode?'rr-my-message':''}><strong>{m.senderRole===mode?'You':mode==='driver'?'Customer':trip.driver_name??'Driver'}</strong><p>{m.text}</p><small>{new Date(m.sentAt).toLocaleString('en-NG',{timeZone:'Africa/Lagos',dateStyle:'short',timeStyle:'short'})}</small></article>)}</div>{!history.loading&&!visible.length&&!history.error&&<p className="rr-small">No saved messages for this journey yet. Messages sent before saved chat was introduced are unavailable.</p>}{!canChat?<p className="rr-info">This conversation is read-only until a driver is assigned, and after the trip ends.</p>:<form onSubmit={send}><label className="rr-field">Message your {mode==='driver'?'customer':'driver'}<textarea rows={2} required maxLength={1000} value={draft} disabled={busy} onChange={e=>setDraft(e.target.value)} placeholder="I’m by the main entrance…"/></label><button className="rr-primary" disabled={busy||!draft.trim()}>{busy?'Saving message…':'Send message'}<RiderIcon name="arrow"/></button></form>}{phase!=='connected'&&<p className="rr-small">Reconnecting live updates. Saved messages refresh every 15 seconds; you can still send a message.</p>}</section>;
}
