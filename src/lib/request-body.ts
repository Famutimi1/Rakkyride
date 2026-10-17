export class RequestBodyError extends Error {
  readonly status:number;
  constructor(status:number,message:string){super(message);this.status=status;}
}

/** Bound bytes while reading, including chunked bodies without Content-Length. */
export async function readJsonRequest(request:Request,maxBytes=16384):Promise<unknown> {
  const declared=request.headers.get('content-length');
  if(declared!==null&&Number(declared)>maxBytes)throw new RequestBodyError(413,'Request is too large.');
  if(!request.body)return {};
  const reader=request.body.getReader();
  const chunks:Uint8Array[]=[];let size=0;
  try{
    for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;
      if(size>maxBytes){void reader.cancel().catch(()=>undefined);throw new RequestBodyError(413,'Request is too large.');}
      chunks.push(part.value);
    }
  }finally{reader.releaseLock();}
  if(size===0)return {};
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json')throw new RequestBodyError(415,'Use application/json.');
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown;}
  catch{throw new RequestBodyError(400,'Invalid request.');}
}
