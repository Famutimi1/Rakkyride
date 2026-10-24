"use client";
import {useCallback,useEffect,useState} from "react";
import type {NearbyDriver,Place} from "@/contracts/rider";
import {riderApi} from "@/lib/rider-api";
import {nearbyQuery,validCoordinate} from "@/lib/rider-geo";
import {ErrorNotice} from "./rider-common";
import {RiderIcon} from "./rider-icon";

export function useNearbyDrivers(pickup:Place|null,service:"ride"|"courier",radius:number){
  const query=pickup?nearbyQuery(new URLSearchParams({latitude:String(pickup.latitude),longitude:String(pickup.longitude),serviceType:service,radiusKm:String(radius)})):null;
  const path=query?`location/nearby${query}`:null;
  const [result,setResult]=useState<{path:string;drivers:NearbyDriver[];at:number}|null>(null),[failure,setFailure]=useState<{path:string;message:string}|null>(null),[version,setVersion]=useState(0),[clock,setClock]=useState(0);
  const reload=useCallback(()=>setVersion(v=>v+1),[]);
  useEffect(()=>{setClock(Date.now());const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{
    if(!path)return;let stopped=false,busy=false;const controller=new AbortController();
    async function load(){if(stopped||busy||document.hidden)return;busy=true;try{
      const response=await riderApi<{drivers:NearbyDriver[]}>(path!,{signal:controller.signal});
      if(!Array.isArray(response.drivers))throw new Error("Driver availability could not be read.");
      const unique=new Map<string,NearbyDriver>();
      for(const item of response.drivers){if(!item||typeof item.driverId!=="string"||!validCoordinate(item)||!Number.isFinite(item.distanceKm)||item.distanceKm<0||item.distanceKm>radius)throw new Error("Driver availability could not be read.");unique.set(item.driverId,item);}
      if(!stopped){setResult({path:path!,drivers:[...unique.values()].sort((a,b)=>a.distanceKm-b.distanceKm),at:Date.now()});setFailure(null);}
    }catch(e){if(!stopped&&!controller.signal.aborted)setFailure({path:path!,message:e instanceof Error?e.message:"Driver availability is unavailable."});}finally{busy=false;}}
    const first=setTimeout(()=>void load(),350),timer=setInterval(()=>void load(),15000);document.addEventListener("visibilitychange",load);
    return()=>{stopped=true;clearTimeout(first);clearInterval(timer);controller.abort();document.removeEventListener("visibilitychange",load);};
  },[path,radius,version]);
  const error=failure?.path===path?failure.message:"",current=result?.path===path?result:null,stale=!!current&&clock-current.at>=30000;
  return {drivers:!error&&!stale?current?.drivers??[]:[],loaded:!!current&&!error&&!stale,loading:!!path&&!current&&!error,error,stale,at:current?.at??null,reload};
}
export function NearbyDrivers({pickup,service,scheduled,radius,onRadius,availability}:{pickup:Place|null;service:"ride"|"courier";scheduled:boolean;radius:number;onRadius:(value:number)=>void;availability:ReturnType<typeof useNearbyDrivers>}){
  const {drivers,loaded,loading,error,stale,at,reload}=availability;
  return <section className="rr-nearby" aria-label="Drivers around your pickup"><div className="rr-nearby-heading"><div><span className="rr-eyebrow">Around your pickup</span><h3>{service==="courier"?"A courier, close by.":"Your next ride is nearby."}</h3></div><img src="/rider/rakky-nearby-drivers.webp" alt=""/></div><div className="rr-nearby-controls"><label>Search radius<select value={radius} onChange={e=>onRadius(Number(e.target.value))}>{[5,10,25].map(km=><option key={km} value={km}>{km} km</option>)}</select></label><button type="button" className="rr-link" disabled={!pickup||loading} onClick={reload}><RiderIcon name="refresh"/>Refresh</button></div>{!pickup?<p className="rr-small">Select your pickup to see available {service==="courier"?"courier ":""}drivers nearby.</p>:<><ErrorNotice error={error} retry={reload}/>{loading&&<p className="rr-small" role="status">Checking nearby drivers…</p>}{stale&&!error&&<p className="rr-small" role="status">This availability check is out of date. Refresh to check again.</p>}{loaded&&<><p className="rr-nearby-count" role="status"><strong>{drivers.length}</strong> {service==="courier"?"courier ":""}{drivers.length===1?"driver":"drivers"} available within {radius} km</p>{drivers.length>0?<ol className="rr-nearby-list">{drivers.slice(0,3).map((driver,index)=><li key={driver.driverId}><span className="rr-ride-icon"><RiderIcon name={service==="courier"?"box":"car"}/></span><span>Nearby {service==="courier"?"courier":"driver"} {index+1}</span><strong>{driver.distanceKm<0.1?"< 0.1":driver.distanceKm.toFixed(1)} km</strong></li>)}</ol>:<p className="rr-small">No available drivers were found in this area right now. Try a wider radius or check again shortly.</p>}<small>Checked {at?new Date(at).toLocaleTimeString("en-NG",{timeZone:"Africa/Lagos",hour:"2-digit",minute:"2-digit",second:"2-digit"}):"just now"} · refreshes every 15 seconds</small></>}{scheduled&&<p className="rr-small">This is availability now. A driver for your scheduled pickup is matched closer to the time.</p>}<p className="rr-small">Distances show proximity, not arrival time. Availability can change before your request is matched.</p></>}</section>;
}
