"use client";
import {useEffect,useRef,useState} from "react";
import type {NearbyDriver,Place} from "@/contracts/rider";
import {loadGoogleMaps,MAPS_AUTH_FAILURE,type GoogleMap,type GoogleMarker,type MapsRuntime} from "@/lib/google-maps";
import {decodeRoute,freshDriver,validCoordinate} from "@/lib/rider-geo";
import {RiderIcon,paths} from "./rider-icon";

type DriverPosition={latitude:number;longitude:number;timestamp:number};
interface RouteLine {setMap(map:GoogleMap|null):void;setPath(points:{lat:number;lng:number}[]):void}
type RiderMaps=MapsRuntime&{event?:{clearInstanceListeners(instance:object):void};Polyline:new(options:{map:GoogleMap;path:{lat:number;lng:number}[];strokeColor:string;strokeWeight:number;strokeOpacity:number;geodesic:boolean})=>RouteLine};
function markerContent(kind:"pickup"|"destination"|"driver"|"nearby"){
  const wrapper=document.createElement("span");wrapper.className=`rr-google-marker rr-google-${kind}`;
  if(kind==="driver"||kind==="nearby"){
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");svg.setAttribute("viewBox","0 0 24 24");svg.setAttribute("fill","none");svg.setAttribute("stroke","currentColor");svg.setAttribute("stroke-width","1.7");svg.setAttribute("aria-hidden","true");const path=document.createElementNS("http://www.w3.org/2000/svg","path");path.setAttribute("d",paths.car);svg.append(path);wrapper.append(svg);
  }else wrapper.textContent=kind==="pickup"?"P":"D";
  return wrapper;
}
export function RiderMap({pickup,dropoff,driver,nearby=[],nearbyAt,encodedPolyline}:{pickup:Place|null;dropoff:Place|null;driver?:DriverPosition|null;nearby?:NearbyDriver[];nearbyAt?:number|null;encodedPolyline?:string|null}){
  const embedKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY,jsKey=process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY;
  const [failed,setFailed]=useState(false),[mapError,setMapError]=useState(""),[ready,setReady]=useState(false),[clock,setClock]=useState(0),[follow,setFollow]=useState(true);
  const element=useRef<HTMLDivElement>(null),map=useRef<GoogleMap|null>(null),api=useRef<RiderMaps|null>(null),markers=useRef(new Map<string,GoogleMarker>()),line=useRef<RouteLine|null>(null),fitted=useRef("");
  const from=pickup?`${pickup.latitude},${pickup.longitude}`:null,to=dropoff?`${dropoff.latitude},${dropoff.longitude}`:null;
  const routeKey=`${from??"none"}:${to??"none"}`;
  const initial=useRef(pickup??dropoff??null);initial.current=pickup??dropoff??null;
  const driverFresh=freshDriver(driver,clock),nearbyFresh=!!nearbyAt&&clock-nearbyAt<30000;
  useEffect(()=>{setClock(Date.now());const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{const unavailable=()=>{setMapError("The live map could not load. Your journey and driver availability remain available.");setReady(false);};window.addEventListener(MAPS_AUTH_FAILURE,unavailable);return()=>window.removeEventListener(MAPS_AUTH_FAILURE,unavailable);},[]);
  const hasPoint=!!(pickup||dropoff);
  useEffect(()=>{
    if(!jsKey||!hasPoint||!element.current)return;
    let stopped=false;setMapError("");
    void loadGoogleMaps(jsKey).then(runtime=>{
      if(stopped||!element.current||!initial.current)return;
      api.current=runtime as RiderMaps;
      map.current=new runtime.Map(element.current,{center:{lat:initial.current.latitude,lng:initial.current.longitude},zoom:14,mapId:process.env.NEXT_PUBLIC_GOOGLE_MAP_ID||"DEMO_MAP_ID",mapTypeControl:false,streetViewControl:false,fullscreenControl:true,gestureHandling:"cooperative"});
      setReady(true);
    }).catch(()=>{if(!stopped)setMapError("The live map could not load. Your journey and driver availability remain available.");});
    return()=>{stopped=true;setReady(false);for(const marker of markers.current.values()){try{marker.map=null;}catch{/* A rejected provider map may already have removed its internal nodes. */}}markers.current.clear();try{line.current?.setMap(null);if(map.current)api.current?.event?.clearInstanceListeners(map.current);}catch{/* Provider cleanup must not interrupt navigation. */}line.current=null;map.current=null;api.current=null;fitted.current="";};
  },[jsKey,hasPoint]);
  useEffect(()=>{
    if(!ready||!map.current||!api.current)return;
    try{
    const desired=new Map<string,{point:{latitude:number;longitude:number};title:string;kind:"pickup"|"destination"|"driver"|"nearby"}>();
    if(pickup&&validCoordinate(pickup))desired.set("pickup",{point:pickup,title:`Pickup: ${pickup.address}`,kind:"pickup"});
    if(dropoff&&validCoordinate(dropoff))desired.set("destination",{point:dropoff,title:`Destination: ${dropoff.address}`,kind:"destination"});
    if(driverFresh&&driver)desired.set("driver",{point:driver,title:"Your driver's latest position",kind:"driver"});
    if(nearbyFresh)for(const [index,item] of nearby.slice(0,50).entries())if(validCoordinate(item))desired.set(`nearby:${item.driverId}`,{point:item,title:`Nearby available driver ${index+1}`,kind:"nearby"});
    for(const [id,marker] of markers.current)if(!desired.has(id)){marker.map=null;markers.current.delete(id);}
    for(const [id,value] of desired){
      const position={lat:value.point.latitude,lng:value.point.longitude},existing=markers.current.get(id);
      if(existing)existing.position=position;
      else markers.current.set(id,new api.current.marker.AdvancedMarkerElement({map:map.current,position,title:value.title,content:markerContent(value.kind),gmpClickable:false}));
    }
    const route=decodeRoute(encodedPolyline);
    if(route.length){if(!line.current)line.current=new api.current.Polyline({map:map.current,path:route,strokeColor:getComputedStyle(element.current!).getPropertyValue("--primary").trim(),strokeWeight:4,strokeOpacity:.8,geodesic:false});else line.current.setPath(route);}else{line.current?.setMap(null);line.current=null;}
    if(fitted.current!==routeKey){const points=[...desired.values()].map(value=>value.point);if(points.length>1)map.current.fitBounds({south:Math.min(...points.map(p=>p.latitude)),north:Math.max(...points.map(p=>p.latitude)),west:Math.min(...points.map(p=>p.longitude)),east:Math.max(...points.map(p=>p.longitude))},55);else if(points.length)map.current.panTo({lat:points[0].latitude,lng:points[0].longitude});fitted.current=routeKey;}
    if(driverFresh&&driver&&follow)map.current.panTo({lat:driver.latitude,lng:driver.longitude});
    }catch{setMapError("The live map could not load. Your journey and driver availability remain available.");setReady(false);}
  },[ready,pickup,dropoff,driver,driverFresh,nearby,nearbyFresh,encodedPolyline,routeKey,follow]);
  const query=new URLSearchParams({key:embedKey??"",...(from&&to?{origin:from,destination:to,mode:"driving",units:"metric"}:{q:from??"Lagos,Nigeria",zoom:"12"})});
  return <section className="rr-map" aria-label="Trip route and driver map">
    {jsKey&&hasPoint&&<div ref={element} className={`rr-google-map ${!ready||mapError?"rr-map-hidden":""}`} aria-label="Google map with pickup, destination and driver markers"/>}
    {(!ready||mapError)&&<>{embedKey&&!failed?<iframe key={query.toString()} title={from&&to?"Google Maps estimated driving route":"Google Maps pickup area"} src={`https://www.google.com/maps/embed/v1/${from&&to?"directions":"place"}?${query}`} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onError={()=>setFailed(true)}/>:<div className="rr-map-message"><RiderIcon name="pin"/><h3>{failed?"The map couldn’t load.":"Your journey, at a glance."}</h3><p>{from&&to?`${pickup?.address} → ${dropoff?.address}`:"Choose pickup and destination to plan your journey."}</p><small>Your selected addresses remain available.</small></div>}</>}
    {ready&&!mapError&&<div className="rr-map-toolbar"><span><i className="rr-marker"/>Pickup <i className="rr-marker rr-drop"/>Destination</span>{driverFresh&&<button type="button" className="rr-secondary" aria-pressed={follow} onClick={()=>setFollow(v=>!v)}>{follow?"Following driver":"Follow driver"}</button>}</div>}
    <div className="rr-map-caption"><span>{mapError||(!jsKey&&driver?"The live car marker is unavailable on this map.":ready?"Real driver positions. Route line shows the estimated journey.":"Google’s estimated route, not the actual travelled path.")}</span>{driverFresh&&driver&&<span role="status">Driver location updated {new Date(driver.timestamp).toLocaleTimeString("en-NG",{timeZone:"Africa/Lagos",hour:"2-digit",minute:"2-digit",second:"2-digit"})}.{(!ready||!!mapError)&&<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${driver.latitude},${driver.longitude}`)}`} target="_blank" rel="noreferrer">View latest driver position ↗</a>}</span>}{driver&&!driverFresh&&<span role="status">Driver location is out of date. Waiting for a fresh update.</span>}{ready&&nearbyFresh&&nearby.length>0&&<span>{Math.min(50,nearby.length)} available {nearby.length===1?"driver":"drivers"} shown{nearby.length>50?` of ${nearby.length} nearby`:""}.</span>}</div>
  </section>;
}
