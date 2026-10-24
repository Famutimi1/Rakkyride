"use client";
import {useCallback,useEffect,useState} from "react";
import {riderApi} from "@/lib/rider-api";
export function useRiderResource<T>(path:string,enabled=true,interval=0,scope:"rider"|"driver"="rider"){
  const[data,setData]=useState<T>(),[error,setError]=useState(""),[loading,setLoading]=useState(enabled),[version,setVersion]=useState(0),[updatedAt,setUpdatedAt]=useState<number|null>(null);
  const reload=useCallback(()=>setVersion(v=>v+1),[]);
  useEffect(()=>{if(!enabled)return;let disposed=false,busy=false;const controller=new AbortController();setData(undefined);setError("");setLoading(true);
    const load=async()=>{if(disposed||busy)return;busy=true;try{const value=await riderApi<T>(path,{signal:controller.signal,scope});if(!disposed){setData(value);setError("");setUpdatedAt(Date.now());}}catch(e){if(!disposed&&!controller.signal.aborted)setError(e instanceof Error?e.message:"This information is unavailable.");}finally{busy=false;if(!disposed)setLoading(false);}};
    void load();const timer=interval?setInterval(()=>{if(document.visibilityState==="visible")void load();},interval):null;const visibility=()=>{if(document.visibilityState==="visible")void load();};if(interval)document.addEventListener("visibilitychange",visibility);
    const realtime=(event:Event)=>{const kind=(event as CustomEvent<string>).detail;if(kind==="trip"&&path.startsWith("trips/")||kind==="wallet"&&path.startsWith("wallet")||kind==="notifications"&&path.startsWith("notifications"))void load();};
    window.addEventListener("rakky-rider-live",realtime);
    return()=>{window.removeEventListener("rakky-rider-live",realtime);disposed=true;controller.abort();if(timer)clearInterval(timer);document.removeEventListener("visibilitychange",visibility);};
  },[path,enabled,interval,version,scope]);
  return{data,error,loading,reload,updatedAt};
}
