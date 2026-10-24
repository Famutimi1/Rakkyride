'use client';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import type {RiderIdentity} from '@/contracts/rider';
import type {DriverApplication,DriverSettings,DriverTrip,DriverWallet} from '@/contracts/driver';
import {loadRiderIdentity,riderApi,RiderApiError,riderError} from '@/lib/rider-api';
import {driverApi} from '@/lib/driver-api';
import {driverEvents,freshBrowserPosition,socketAck} from '@/lib/driver-live';
import {useRiderLive,liveChanged} from '@/lib/rider-live';
import {RiderLiveConnection} from '../rider/rider-live';
import {RiderIcon} from '../rider/rider-icon';
import {DriverHero,ErrorNotice,Loading} from './driver-common';
import {useDriverResource} from './driver-resource';
import '../rider/rider-website.css';
import './driver.css';
type Position={latitude:number;longitude:number;timestamp:number;accuracy:number};
interface Context {identity:RiderIdentity;application:DriverApplication|undefined;settings:DriverSettings|undefined;active:DriverTrip|null|undefined;wallet:DriverWallet|undefined;refresh:()=>void;updateIdentity:(identity:RiderIdentity)=>void;wanted:boolean;online:boolean;location:Position|null;locationError:string;toggleOnline:()=>Promise<void>;loading:boolean;error:string;logout:()=>Promise<void>}
const DriverContext=createContext<Context|null>(null);
export function useDriver(){const value=useContext(DriverContext);if(!value)throw new Error('Driver provider required');return value;}
const nav=[['','Overview','home'],['trips','My trips','car'],['earnings','Earnings','wallet'],['payouts','Payouts','cash'],['application','Vehicle & services','shield'],['notifications','Inbox','bell'],['help','Help & support','help']] as const;
export function DriverProvider({children}:{children:ReactNode}){
 const path=usePathname(),router=useRouter(),[identity,setIdentity]=useState<RiderIdentity|null>(null),[authLoading,setAuthLoading]=useState(true),[authError,setAuthError]=useState(''),[version,setVersion]=useState(0),[busy,setBusy]=useState(false);
 const [wanted,setWanted]=useState(false),[location,setLocation]=useState<Position|null>(null),[locationError,setLocationError]=useState(''),[lastAck,setLastAck]=useState(0),[now,setNow]=useState(0),[visible,setVisible]=useState(true);
 const phase=useRiderLive(s=>s.phase),socket=useRiderLive(s=>s.socket),position=useRef<Position|null>(null),publishing=useRef(false);
 const application=useDriverResource<DriverApplication>('driver/application/status',!!identity),settings=useDriverResource<DriverSettings>('driver/service-settings',!!identity,30000),isDriver=identity?.activeRole==='driver';
 const active=useDriverResource<DriverTrip|null>('trips/active',!!isDriver,8000),wallet=useDriverResource<DriverWallet>('wallet',!!isDriver,15000);
 useEffect(()=>{let stopped=false;setAuthLoading(true);void loadRiderIdentity<RiderIdentity>().then(value=>{if(!stopped){setIdentity(value);setAuthError('');}}).catch(error=>{if(!stopped){if(error instanceof RiderApiError&&error.status===401)router.replace('/ride/sign-in?next=driver');else setAuthError(error instanceof Error?error.message:'Account unavailable.');}}).finally(()=>{if(!stopped)setAuthLoading(false);});return()=>{stopped=true;};},[version,router]);
 useEffect(()=>{const expired=()=>{setWanted(false);setIdentity(null);router.replace('/ride/sign-in?next=driver');};window.addEventListener('rakky-rider-expired',expired);return()=>window.removeEventListener('rakky-rider-expired',expired);},[router]);
 useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);const change=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',change);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',change);};},[]);
 const refresh=()=>{application.reload();settings.reload();active.reload();wallet.reload();};
 useEffect(()=>{if(!socket)return;const update=()=>{liveChanged('trip');liveChanged('wallet');settings.reload();application.reload();};socket.on(driverEvents.offer,update);socket.on(driverEvents.offerCancelled,update);socket.on(driverEvents.settings,update);},[socket,settings.reload,application.reload]);
 useEffect(()=>{
  if(!wanted||!isDriver)return;let stopped=false;const fail=(error:GeolocationPositionError)=>{if(!stopped){setLastAck(0);setLocationError(error.code===1?'Location permission was denied. Allow location in your browser settings, then try again.':'A fresh, accurate location is unavailable. Keep this page open and try again.');}};
  if(!navigator.geolocation){setLocationError('This browser does not support location.');return;}
  const receive=(sample:GeolocationPosition)=>{const point={latitude:sample.coords.latitude,longitude:sample.coords.longitude,timestamp:sample.timestamp,accuracy:sample.coords.accuracy};if(!stopped){position.current=point;setLocation(point);}};
  const options={enableHighAccuracy:true,timeout:10000,maximumAge:5000};const watch=navigator.geolocation.watchPosition(receive,fail,options);
  const tick=async()=>{
   if(stopped||document.hidden)return;
   navigator.geolocation.getCurrentPosition(receive,fail,options);
   const point=position.current;if(!point||!freshBrowserPosition(point)){setLastAck(0);setLocationError('Waiting for an accurate GPS location. Move to a place with a clearer signal.');return;}
   if(publishing.current)return;publishing.current=true;
   try{await socketAck(useRiderLive.getState().socket,driverEvents.location,{driverId:identity!.user.id,latitude:point.latitude,longitude:point.longitude,timestamp:point.timestamp});if(!stopped){setLastAck(Date.now());setLocationError('');}}
   catch(error){if(!stopped){setLastAck(0);setLocationError(riderError(error instanceof Error?error.message:'Location update unavailable.'));}}
   finally{publishing.current=false;}
  };
  void tick();const timer=setInterval(()=>void tick(),5000);
  return()=>{stopped=true;clearInterval(timer);navigator.geolocation.clearWatch(watch);setLastAck(0);};
 },[wanted,isDriver,identity?.user.id]);
 const online=wanted&&visible&&phase==='connected'&&lastAck>0&&now-lastAck<15000;
 async function toggleOnline(){setLocationError('');if(wanted){try{await socketAck(socket,driverEvents.offline);setWanted(false);setLastAck(0);}catch(error){setLocationError(riderError(error instanceof Error?error.message:'Unable to go offline.'));}}else{if(phase!=='connected'){setLocationError('Wait for the live connection before going online.');return;}setWanted(true);}}
 async function switchMode(role:'driver'|'rider'){setBusy(true);setAuthError('');try{if(wanted){await socketAck(socket,driverEvents.offline);setWanted(false);}await driverApi('auth/active-role',{method:'PATCH',body:{role}});const updated=await loadRiderIdentity<RiderIdentity>();setIdentity(updated);if(role==='rider')router.push('/ride');else refresh();}catch(error){setAuthError(error instanceof Error?error.message:'Mode could not be changed.');}finally{setBusy(false);}}
 async function logout(){if(wanted){await socketAck(socket,driverEvents.offline);setWanted(false);}await riderApi('session/logout',{method:'POST',body:{},retryAuth:false});router.replace('/');setIdentity(null);}
 const setupPath=['/drive/application','/drive/account','/drive/help','/drive/notifications'].includes(path);
 const content=authLoading?<Loading/>:authError&&!identity?<ErrorNotice error={authError} retry={()=>setVersion(v=>v+1)}/>:!identity?<Loading/>:!setupPath&&!isDriver?<><DriverHero art="home" title={identity.driverStatus==='approved'?'Your driver seat is ready.':'A new way to move forward.'} description={identity.driverStatus==='approved'?'Use your approved driver profile on the web. Your mobile app uses the same account mode.':'Apply to drive or deliver with Rakky Ride. Your passenger account stays with you.'}>{identity.driverStatus==='approved'?<button className="rr-primary" disabled={busy} onClick={()=>void switchMode('driver')}>{busy?'Switching…':'Switch to driver mode'}<RiderIcon name="arrow"/></button>:<Link className="rr-primary" href="/drive/application">{identity.driverStatus==='pending'?'View your application':'Start your application'}<RiderIcon name="arrow"/></Link>}</DriverHero><ErrorNotice error={authError}/></>:<DriverContext.Provider value={{identity,application:application.data,settings:settings.data,active:active.data,wallet:wallet.data,refresh,updateIdentity:setIdentity,wanted,online,location,locationError,toggleOnline,loading:application.loading,error:application.error||settings.error||active.error||wallet.error,logout}}>{children}</DriverContext.Provider>;
 return <div data-passenger-site data-driver-site>{identity&&<RiderLiveConnection key={`driver-live:${identity.user.id}`} userId={identity.user.id}/>}<aside className="dd-sidebar"><Link className="rr-brand" href="/drive" aria-label="Rakky Ride driver home"><img src="/brand/rakky-ride-logo.png" alt=""/><span>Rakky<span>Ride</span><small>DRIVER PARTNER</small></span></Link><span className="dd-nav-label">YOUR WORKSPACE</span><nav aria-label="Driver navigation">{nav.map(([route,label,icon])=><Link key={route} href={`/drive${route?`/${route}`:''}`} className={(route?path.startsWith(`/drive/${route}`):path==='/drive')?'active':''}><RiderIcon name={icon}/>{label}</Link>)}</nav><div className="dd-sidebar-bottom"><p>One account.<br/><strong>More ways to move.</strong></p>{identity?.activeRole==='driver'?<button className="rr-secondary" disabled={busy||!!active.data} onClick={()=>void switchMode('rider')}>Switch to passenger</button>:<Link className="rr-secondary" href="/ride">Passenger website<RiderIcon name="arrow"/></Link>}{active.data&&<small>Finish your active trip before switching.</small>}</div></aside><div className="dd-workspace"><header className="dd-topbar"><div><span className="rr-eyebrow">Rakky Ride for drivers</span><span className={`dd-status ${online?'is-online':''}`}>● {online?'Online':wanted?'Connecting location':'Offline'}</span></div><div className="rr-inline-actions"><Link href="/drive/notifications" aria-label="Driver notifications"><RiderIcon name="bell"/></Link><Link href="/drive/account" className="rr-avatar" aria-label="Driver account">{identity?.user.name?.charAt(0)??'D'}</Link></div></header><main className="dd-main" key={identity?.user.id??'anonymous'}>{content}</main><footer className="dd-footer">© {new Date().getFullYear()} Rakky Ride · Drive with purpose.<Link href="/drive/help">Driver support ↗</Link></footer></div></div>;
}
