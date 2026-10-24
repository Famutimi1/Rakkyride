import {cookies} from "next/headers";
import {riderCookies,riderJson,riderOriginAllowed} from "@/lib/rider-server";

// Socket.IO long-polling stays same-origin. Bearer credentials exist only on this server.
async function handle(request:Request,{params}:{params:Promise<{segments?:string[]}>}){
  if(request.method==='POST'&&!riderOriginAllowed(request))return riderJson({error:'Request origin denied.'},403);
  if(request.headers.get('sec-fetch-site')==='cross-site')return riderJson({error:'Request origin denied.'},403);
  const token=(await cookies()).get(riderCookies.access)?.value;
  if(!token)return riderJson({error:'Sign in to continue.'},401);
  const parts=(await params).segments??[],script=parts.length===1&&parts[0]==='client.js';
  if(parts.length&&!script||script&&request.method!=='GET')return riderJson({error:'Not found.'},404);
  const incoming=new URL(request.url),query=new URLSearchParams();
  if(!script){
    if(incoming.searchParams.get('EIO')!=='4'||incoming.searchParams.get('transport')!=='polling')return riderJson({error:'Unsupported transport.'},400);
    query.set('EIO','4');query.set('transport','polling');
    const sid=incoming.searchParams.get('sid');if(sid){if(!/^[A-Za-z0-9_-]{1,100}$/.test(sid))return riderJson({error:'Invalid connection.'},400);query.set('sid',sid);}
    const stamp=incoming.searchParams.get('t');if(stamp&&stamp.length<100)query.set('t',stamp);
  }
  try{
    let body:Uint8Array|undefined;
    if(request.method==='POST'){
      const reader=request.body?.getReader();if(!reader)return riderJson({error:'Missing packet.'},400);
      const chunks:Uint8Array[]=[];let size=0;
      try{for(;;){const result=await reader.read();if(result.done)break;size+=result.value.length;if(size>64000){void reader.cancel();return riderJson({error:'Message is too large.'},413);}chunks.push(result.value);}}finally{reader.releaseLock();}
      body=new Uint8Array(size);let position=0;for(const chunk of chunks){body.set(chunk,position);position+=chunk.length;}
    }
    const base=(process.env.RAKKY_API_URL??'http://127.0.0.1:4000').replace(/\/$/,'');
    const response=await fetch(`${base}/socket.io/${script?'socket.io.min.js':`?${query}`}`,{method:request.method,headers:{Authorization:`Bearer ${token}`,...(request.method==='POST'?{'Content-Type':'text/plain;charset=UTF-8'}:{})},body:body as BodyInit|undefined,cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(40000)])});
    return new Response(response.body,{status:response.status,headers:{'Content-Type':script?'application/javascript; charset=utf-8':'text/plain; charset=utf-8','Cache-Control':'no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'}});
  }catch{return riderJson({error:'Live connection unavailable.'},503);}
}
export const GET=handle;
export const POST=handle;
