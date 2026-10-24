"use client";
import {useEffect,useState} from "react";
import {riderApi} from "@/lib/rider-api";
import {useRiderResource} from "./rider-resource";
import {ErrorNotice} from "./rider-common";
import {RiderIcon} from "./rider-icon";

function applicationKey(value:string){const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);return Uint8Array.from(atob(padded),character=>character.charCodeAt(0));}
function sameKey(existing:ArrayBuffer|null,key:Uint8Array){if(!existing)return false;const bytes=new Uint8Array(existing);return bytes.length===key.length&&bytes.every((value,index)=>value===key[index]);}
export function RiderBrowserPush({mode="rider"}:{mode?:"rider"|"driver"}={}){
  const config=useRiderResource<{configured:boolean;publicKey:string|null}>("notifications/browser/config",true,0,mode),[support,setSupport]=useState<"checking"|"supported"|"unsupported">("checking"),[permission,setPermission]=useState<NotificationPermission>('default'),[subscriptionId,setSubscriptionId]=useState<string|null>(null),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[version,setVersion]=useState(0);
  useEffect(()=>{
    let stopped=false;
    if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){setSupport('unsupported');return;}
    setSupport('supported');setPermission(Notification.permission);
    void navigator.serviceWorker.getRegistration('/rakky-sw.js').then(registration=>registration?.pushManager.getSubscription()).then(async subscription=>{
      if(!subscription||stopped){if(!stopped){setEnabled(false);setSubscriptionId(null);}return;}
      const status=await riderApi<{id:string|null;enabled:boolean}>("notifications/browser/status",{method:"POST",body:{endpoint:subscription.endpoint},scope:mode});
      if(!stopped){setSubscriptionId(status.id);setEnabled(status.enabled);}
    }).catch(e=>{if(!stopped)setError(e instanceof Error?e.message:"Browser notification status is unavailable.");});
    return()=>{stopped=true;};
  },[version,mode]);
  async function enable(){
    if(busy||!config.data?.publicKey)return;setBusy(true);setError("");setMessage("");
    try{
      // Keep this permission request directly attached to the user's button click.
      const allowed=Notification.permission==='granted'?'granted':await Notification.requestPermission();setPermission(allowed);
      if(allowed!=='granted'){setMessage(allowed==='denied'?"Notifications were blocked. You can change this in your browser’s site settings.":"Notifications stay off until you allow them.");return;}
      await navigator.serviceWorker.register('/rakky-sw.js',{scope:'/'});
      const registration=await navigator.serviceWorker.ready,key=applicationKey(config.data.publicKey);
      let subscription=await registration.pushManager.getSubscription();
      if(subscription&&!sameKey(subscription.options.applicationServerKey,key)){if(subscriptionId)await riderApi(`notifications/browser/subscriptions/${subscriptionId}`,{method:'DELETE',scope:mode});await subscription.unsubscribe();subscription=null;}
      subscription??=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
      const status=await riderApi<{id:string;enabled:boolean}>("notifications/browser/subscriptions",{method:"POST",body:subscription.toJSON(),scope:mode});
      setSubscriptionId(status.id);setEnabled(status.enabled);setMessage("Browser notifications are enabled for this account. Your push preferences below still apply.");
    }catch(e){setError(e instanceof Error?e.message:"Browser notifications could not be enabled. Try your browser’s site settings.");}finally{setBusy(false);}
  }
  async function disable(){
    if(busy)return;setBusy(true);setError("");setMessage("");
    try{if(subscriptionId)await riderApi(`notifications/browser/subscriptions/${subscriptionId}`,{method:'DELETE',scope:mode});setEnabled(false);setSubscriptionId(null);const registration=await navigator.serviceWorker.getRegistration('/rakky-sw.js');const subscription=await registration?.pushManager.getSubscription();await subscription?.unsubscribe();setMessage("Notifications for this browser are off. Your mobile app settings are unchanged.");}catch(e){setError(e instanceof Error?e.message:"Notification settings could not be changed.");setVersion(v=>v+1);}finally{setBusy(false);}
  }
  return <section className="rr-browser-push" aria-label="Browser push notifications"><div className="rr-section-heading"><div><span className="rr-eyebrow">Stay connected</span><h3>Updates on this browser.</h3></div><img src="/rider/rakky-account-care.webp" alt=""/></div><p className="rr-small">Get a heads-up when you’re away from this tab. Notifications show a private, general Rakky update; open your account for the details.</p><ErrorNotice error={error||config.error} retry={()=>{config.reload();setVersion(v=>v+1);}}/>{message&&<p className="rr-info" role="status">{message}</p>}{support==='unsupported'?<p className="rr-small">Push notifications aren’t supported here. Try a supported browser on a secure connection. Some mobile browsers need the website added to your home screen. Your inbox still works.</p>:support==='checking'||config.loading?<p className="rr-small" role="status">Checking notification support…</p>:!config.data?.configured?<p className="rr-small">Browser notifications are not available yet. Your inbox and live updates still work.</p>:<><div className="rr-inline-actions"><span className="rr-pill">{enabled&&permission==='granted'?'Enabled':permission==='denied'?'Blocked in browser':'Off'}</span>{enabled?<button type="button" className="rr-secondary" disabled={busy} onClick={()=>void disable()}>{busy?'Updating…':'Turn off for this browser'}</button>:<button type="button" className="rr-primary" disabled={busy||permission==='denied'} onClick={()=>void enable()}><RiderIcon name="bell"/>{busy?'Enabling…':'Enable notifications'}</button>}</div>{permission==='denied'&&<p className="rr-small">Allow notifications in your browser’s settings for this website, then reload this page.</p>}</>}</section>;
}
