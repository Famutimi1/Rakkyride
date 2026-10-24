"use client";
import Script from "next/script";
import {useEffect,useRef,useState} from "react";
import type {RiderIdentity} from "@/contracts/rider";
import {riderApi} from "@/lib/rider-api";
import {ErrorNotice} from "./rider-common";

interface GoogleId { initialize(options:{client_id:string;nonce:string;auto_select:boolean;ux_mode:"popup";callback:(response:{credential:string})=>void}):void;renderButton(element:HTMLElement,options:{type:"standard";theme:"outline";size:"large";text:"continue_with";shape:"rectangular";width:number}):void }
export function RiderGoogle({disabled,onPending,onResult}:{disabled:boolean;onPending:(value:boolean)=>void;onResult:(value:RiderIdentity|{needsPhoneVerification:true;name:string})=>void}){
  const clientId=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,container=useRef<HTMLDivElement>(null),callbacks=useRef({onPending,onResult}),[ready,setReady]=useState(false),[attempt,setAttempt]=useState(0),[phase,setPhase]=useState('loading'),[error,setError]=useState('');callbacks.current={onPending,onResult};
  useEffect(()=>{
    if(!ready||!clientId||!container.current)return;
    let active=true,submitting=false;const controller=new AbortController(),element=container.current;let observer:ResizeObserver|undefined;
    setError('');setPhase('loading');
    async function prepare(){
      const {nonce}=await riderApi<{nonce:string}>("session/google-challenge",{method:"POST",body:{},retryAuth:false,signal:controller.signal});
      if(!active)return;
      const google=(window as Window&{google?:{accounts?:{id?:GoogleId}}}).google?.accounts?.id;if(!google)throw new Error('Google could not load. Use your phone number.');
      google.initialize({client_id:clientId!,nonce,auto_select:false,ux_mode:'popup',callback:({credential})=>{
        if(!active||submitting)return;submitting=true;callbacks.current.onPending(true);setPhase('signing-in');
        void riderApi<RiderIdentity|{needsPhoneVerification:true;name:string}>("session/google",{method:"POST",body:{idToken:credential},retryAuth:false}).then(value=>{if(active)callbacks.current.onResult(value);}).catch(e=>{if(active){setError(e instanceof Error?e.message:'Google sign-in failed.');setPhase('error');}}).finally(()=>{callbacks.current.onPending(false);});
      }});
      let previous=0;const render=()=>{const width=Math.max(200,Math.min(400,Math.floor(element.clientWidth)));if(width===previous)return;previous=width;element.replaceChildren();google.renderButton(element,{type:'standard',theme:'outline',size:'large',text:'continue_with',shape:'rectangular',width});};render();observer=new ResizeObserver(render);observer.observe(element);setPhase('ready');
    }
    void prepare().catch(e=>{if(active){setError(e instanceof Error?e.message:'Google sign-in is unavailable.');setPhase('error');}});
    return()=>{active=false;controller.abort();observer?.disconnect();};
  },[ready,clientId,attempt]);
  if(!clientId)return <p className="rr-small">Google sign-in is unavailable. Continue with your phone number.</p>;
  return <div className="rr-rider-google"><Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={()=>setReady(true)} onError={()=>{setPhase('error');setError('Google could not load. Continue with your phone number.');}}/><div ref={container} inert={disabled||phase!=='ready'} hidden={phase==='error'}/>{phase==='loading'&&<p className="rr-small" role="status">Loading Google sign-in…</p>}{phase==='signing-in'&&<p role="status">Signing in with Google…</p>}<ErrorNotice error={error}/>{phase==='error'&&ready&&<button className="rr-link" disabled={disabled} onClick={()=>setAttempt(v=>v+1)}>Try Google again</button>}</div>;
}
