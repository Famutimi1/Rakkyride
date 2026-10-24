import {cookies} from "next/headers";
import {riderCookies,riderOriginAllowed,riderJson,isRiderIdentity,publicIdentity} from "@/lib/rider-server";

const limit=5*1024*1024+16384;
async function handle(request:Request){
  if(!riderOriginAllowed(request))return riderJson({error:"Request origin denied."},403);
  const token=(await cookies()).get(riderCookies.access)?.value;
  if(!token)return riderJson({error:"Sign in to continue."},401);
  const version=request.headers.get("if-match");
  if(!version||!/^"?[a-zA-Z0-9-]{1,80}"?$/.test(version))return riderJson({error:"Reload your account before changing its photo."},428);
  try{
    let body:FormData|undefined;
    if(request.method==="POST"){
      const contentType=request.headers.get("content-type");
      if(!contentType?.startsWith("multipart/form-data;"))return riderJson({error:"Choose a photo to upload."},415);
      if(Number(request.headers.get("content-length"))>limit)return riderJson({error:"Choose a photo smaller than 5 MB."},413);
      const reader=request.body?.getReader();if(!reader)return riderJson({error:"Choose a photo."},400);
      const chunks:Uint8Array[]=[];let size=0;
      try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){void reader.cancel();return riderJson({error:"Choose a photo smaller than 5 MB."},413);}chunks.push(part.value);}}finally{reader.releaseLock();}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      const form=await new Response(bytes,{headers:{"Content-Type":contentType}}).formData();
      const file=form.get("avatar");
      if(form.getAll("avatar").length!==1||[...form.keys()].some(key=>key!=="avatar")||!(file instanceof File))return riderJson({error:"Choose one profile photo."},400);
      if(file.size>5*1024*1024)return riderJson({error:"Choose a photo smaller than 5 MB."},413);
      if(!["image/jpeg","image/png","image/webp"].includes(file.type))return riderJson({error:"Use a JPEG, PNG or WebP photo."},415);
      body=new FormData();body.set("avatar",file);
    }
    const base=(process.env.RAKKY_API_URL??"http://127.0.0.1:4000").replace(/\/$/,"");
    const response=await fetch(`${base}/api/auth/profile/avatar`,{method:request.method,headers:{Authorization:`Bearer ${token}`,"If-Match":version},body,cache:"no-store",signal:AbortSignal.any([request.signal,AbortSignal.timeout(150000)])});
    const data:unknown=await response.json();
    if(!response.ok)return riderJson({error:response.status>=500?"Photo service is unavailable. Reload your account before retrying.":(data as {error?:string}).error??"Photo could not be updated."},response.status);
    return isRiderIdentity(data)?riderJson(publicIdentity(data)):riderJson({error:"Reload your account to check the photo."},502);
  }catch{return riderJson({error:"Your photo could not be confirmed. Reload your account before retrying."},503);}
}
export const POST=handle;
export const DELETE=handle;
