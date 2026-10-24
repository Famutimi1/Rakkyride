"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import type {RiderIdentity} from "@/contracts/rider";
import {loadRiderIdentity,riderApi,RiderApiError} from "@/lib/rider-api";
import {useRiderDraft} from "@/lib/rider-store";
import {useRiderResource} from "./rider-resource";
import {RiderLiveConnection} from "./rider-live";
import {RiderAuth} from "./rider-auth";
import {RiderHome,PublicWelcome} from "./rider-home";
import {RiderBooking} from "./rider-booking";
import {RiderHistory,RiderTripDetail,RiderActiveTrip} from "./rider-trips";
import {RiderWallet} from "./rider-wallet";
import {RiderAccount,RiderHelp,RiderNotifications,RiderSafety} from "./rider-care";
import {ErrorNotice,Loading} from "./rider-common";
import {RiderIcon} from "./rider-icon";
import "./rider-website.css";

export type RiderView="welcome"|"home"|"book"|"schedule"|"courier"|"trips"|"trip"|"wallet"|"safety"|"help"|"account"|"notifications"|"sign-in"|"register";
const nav=[{name:"Home",path:"/ride",view:"home",icon:"home"},{name:"My rides",path:"/ride/trips",view:"trips",icon:"car"},{name:"Wallet",path:"/ride/wallet",view:"wallet",icon:"wallet"},{name:"Safety",path:"/ride/safety",view:"safety",icon:"shield"},{name:"Help",path:"/ride/help",view:"help",icon:"help"}];
export function RiderWebsite({view="welcome",tripId,appLinks={android:null,ios:null}}:{view?:RiderView;tripId?:string;appLinks?:{android:string|null;ios:string|null}}){
  const router=useRouter(),[identity,setIdentity]=useState<RiderIdentity|null>(null),[state,setState]=useState<"loading"|"ready"|"anonymous"|"error">("loading"),[error,setError]=useState(""),[version,setVersion]=useState(0),[switching,setSwitching]=useState(false);
  const publicView=["welcome","help","safety","sign-in","register"].includes(view);
  useEffect(()=>{let disposed=false;setError("");setState("loading");loadRiderIdentity<RiderIdentity>().then(value=>{if(!disposed){setIdentity(value);setState("ready");}}).catch(e=>{if(!disposed){if(e instanceof RiderApiError&&e.status===401){setIdentity(null);setState("anonymous");}else{setState("error");setError(e instanceof Error?e.message:"Your account could not be loaded.");}}});return()=>{disposed=true;};},[version]);
  useEffect(()=>{const expired=()=>{setIdentity(null);setState("anonymous");useRiderDraft.getState().reset();};window.addEventListener("rakky-rider-expired",expired);return()=>window.removeEventListener("rakky-rider-expired",expired);},[]);
  useEffect(()=>{if(state==="anonymous"&&!publicView)router.replace(`/ride/sign-in?next=${encodeURIComponent(["book","schedule","courier","wallet","account"].includes(view)?view:"home")}`);},[state,view,publicView,router]);
  function signedIn(value:RiderIdentity){setIdentity(value);setState("ready");setError("");}
  async function logout(){await riderApi("session/logout",{method:"POST",body:{},retryAuth:false});if(identity)try{sessionStorage.removeItem(`rakky-rider-topup:${identity.user.id}`);}catch{}useRiderDraft.getState().reset();setIdentity(null);setState("anonymous");router.replace("/");}
  async function riderMode(){setSwitching(true);setError("");try{await riderApi("auth/active-role",{method:"PATCH",body:{role:"rider"}});setVersion(v=>v+1);}catch(e){setError(e instanceof Error?e.message:"Your role could not be switched.");}finally{setSwitching(false);}}
  function body(){
    if(view==="welcome")return <PublicWelcome signedIn={!!identity} appLinks={appLinks}/>;
    if(view==="help")return <RiderHelp signedIn={!!identity}/>;
    if(view==="safety")return <RiderSafety/>;
    if(view==="sign-in"||view==="register")return <RiderAuth key={view} register={view==="register"} onSignedIn={signedIn}/>;
    if(state==="loading")return <Loading/>;
    if(state==="error")return <ErrorNotice error={error} retry={()=>setVersion(v=>v+1)}/>;
    if(!identity)return <Loading/>;
    if(identity.activeRole!=="rider")return <section className="rr-panel rr-account"><h1>Ready to ride as a passenger?</h1><p>Your account is currently in driver mode. Switching to passenger mode also changes the mode used by the mobile app.</p><ErrorNotice error={error}/><button className="rr-primary" disabled={switching} onClick={()=>void riderMode()}>{switching?"Switching…":"Switch to passenger mode"}</button></section>;
    switch(view){case"home":return <RiderHome identity={identity}/>;case"book":case"schedule":case"courier":return <RiderBooking mode={view}/>;case"trips":return tripId?<RiderTripDetail id={tripId}/>:<RiderHistory/>;case"trip":return <RiderActiveTrip/>;case"wallet":return <RiderWallet userId={identity.user.id}/>;case"account":return <RiderAccount identity={identity} onUpdate={signedIn} onLogout={logout}/>;case"notifications":return <RiderNotifications/>;default:return null;}
  }
  return <div data-passenger-site>{identity&&<RiderLiveConnection key={identity.user.id} userId={identity.user.id}/>}<header className="rr-header"><Link href="/" className="rr-brand" aria-label="Rakky Ride home"><img src="/brand/rakky-ride-logo.png" alt=""/><span>Rakky<span>Ride</span><small>GO YOUR WAY.</small></span></Link><nav aria-label="Passenger navigation">{view==="welcome"?<><Link href="/ride/book">Ride</Link><Link href="/ride/courier">Deliver</Link><Link href="/ride/safety">Safety</Link><Link href="/ride/help">Help</Link></>:nav.map(n=><Link key={n.path} href={n.path} className={view===n.view?"active":""} aria-current={view===n.view?"page":undefined}>{n.name}</Link>)}</nav><div className="rr-account-actions"><Link className={`rr-link rr-driver-entry ${identity?'':'rr-driver-entry-guest'}`} href="/drive">{identity?.driverStatus==='approved'?'Driver mode':'Drive with Rakky'}</Link>{identity?<><Link href="/ride/notifications" className="rr-icon-button" aria-label="Notifications"><RiderIcon name="bell"/><RiderUnreadCount/></Link><Link href="/ride/account" className="rr-avatar" aria-label="Your account">{identity.user.avatarUrl?<img src={identity.user.avatarUrl} alt="" referrerPolicy="no-referrer"/>:identity.user.name.split(" ").map(v=>v[0]).slice(0,2).join("")}</Link></>:<><Link className="rr-link" href="/ride/sign-in">Log in</Link><Link className="rr-primary" href="/ride/register">Get started<RiderIcon name="arrow"/></Link></>}</div></header><main className="rr-main" key={`passenger:${identity?.user.id??"public"}`}>{body()}</main><footer className="rr-footer"><span>© {new Date().getFullYear()} Rakky Ride. Every journey matters.</span><div><Link href="/ride/safety">Safety</Link><Link href="/ride/help">Get help<RiderIcon name="external"/></Link><Link href="/drive">Drive with Rakky</Link><Link href="/open-app">Get the app</Link></div></footer>{view!=="welcome"&&<nav className="rr-mobile-nav" aria-label="Mobile navigation">{nav.map(n=><Link key={n.path} href={n.path} className={view===n.view?"active":""} aria-current={view===n.view?"page":undefined}><RiderIcon name={n.icon}/>{n.name}</Link>)}</nav>}</div>;
}

function RiderUnreadCount(){const unread=useRiderResource<{count:number}>("notifications/unread-count",true,30000);return unread.data&&unread.data.count>0?<span className="rr-unread-count" aria-label={`${unread.data.count} unread notifications`}>{unread.data.count>99?"99+":unread.data.count}</span>:null;}
