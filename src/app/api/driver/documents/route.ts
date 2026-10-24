import {cookies} from 'next/headers';
import {riderCookies,riderOriginAllowed,riderJson} from '@/lib/rider-server';
const maximum=24*1024*1024+65536;
export async function POST(request:Request){
 if(!riderOriginAllowed(request))return riderJson({error:'Request origin denied.'},403);
 const token=(await cookies()).get(riderCookies.access)?.value;if(!token)return riderJson({error:'Sign in to continue.'},401);
 const version=request.headers.get('if-match');if(!version||!/^"?[a-zA-Z0-9-]{1,80}"?$/.test(version))return riderJson({error:'Reload your application before uploading documents.'},428);
 try{
  const contentType=request.headers.get('content-type');if(!contentType?.startsWith('multipart/form-data;'))return riderJson({error:'Choose your three application documents.'},415);
  if(Number(request.headers.get('content-length'))>maximum)return riderJson({error:'Documents must each be 8 MB or smaller.'},413);
  const reader=request.body?.getReader();if(!reader)return riderJson({error:'Choose your documents.'},400);
  const chunks:Uint8Array[]=[];let size=0;try{for(;;){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>maximum){void reader.cancel();return riderJson({error:'Documents must each be 8 MB or smaller.'},413);}chunks.push(item.value);}}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const received=await new Response(bytes,{headers:{'Content-Type':contentType}}).formData(),names=['license','vehicleRegistration','insurance'];
  if([...received.keys()].some(key=>!names.includes(key)))return riderJson({error:'Unexpected upload field.'},400);
  const body=new FormData();for(const name of names){const file=received.get(name);if(received.getAll(name).length!==1||!(file instanceof File)||!file.size||file.size>8*1024*1024)return riderJson({error:'Choose three documents, each 8 MB or smaller.'},400);if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))return riderJson({error:'Documents must be PDF, JPEG, PNG or WebP.'},415);body.set(name,file);}
  const base=(process.env.RAKKY_API_URL??'http://127.0.0.1:4000').replace(/\/$/,'');const response=await fetch(`${base}/api/driver/onboarding/documents`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'If-Match':version},body,cache:'no-store',signal:AbortSignal.any([request.signal,AbortSignal.timeout(150000)])});const data=await response.json();
  return response.ok?riderJson({documentsUploaded:true}):riderJson({error:response.status>=500?'Document upload could not be confirmed. Reload your application before retrying.':data.error??'Documents could not be saved.'},response.status);
 }catch{return riderJson({error:'Upload could not be confirmed. Reload your application before retrying.'},503);}
}
