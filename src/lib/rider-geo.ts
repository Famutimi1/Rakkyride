export interface Coordinate {latitude:number;longitude:number}
export function validCoordinate(point:Coordinate){return Number.isFinite(point.latitude)&&Number.isFinite(point.longitude)&&Math.abs(point.latitude)<=90&&Math.abs(point.longitude)<=180;}
export function nearbyQuery(input:URLSearchParams):string|null{
  const latitude=input.get("latitude"),longitude=input.get("longitude"),rawRadius=input.get("radiusKm")??"5",service=input.get("serviceType")??"ride";
  if(!latitude?.trim()||!longitude?.trim()||!rawRadius.trim()||!["ride","courier"].includes(service))return null;
  const point={latitude:Number(latitude),longitude:Number(longitude)},radius=Number(rawRadius);
  if(!validCoordinate(point)||!Number.isFinite(radius)||radius<1||radius>25)return null;
  return `?${new URLSearchParams({latitude:String(point.latitude),longitude:String(point.longitude),radiusKm:String(radius),serviceType:service})}`;
}
export function freshDriver(point:(Coordinate&{timestamp:number})|null|undefined,now:number){return !!point&&validCoordinate(point)&&Number.isFinite(point.timestamp)&&now-point.timestamp>=-5000&&now-point.timestamp<30000;}
/** Decode Google's backend-provided E5 route; invalid or oversized input is never drawn. */
export function decodeRoute(encoded:string|null|undefined):{lat:number;lng:number}[]{
  if(!encoded||encoded.length>200000)return [];
  const points:{lat:number;lng:number}[]=[];let index=0,lat=0,lng=0;
  function next(){let result=0,shift=0;for(;;){if(index>=encoded!.length||shift>30)throw new Error("Invalid route");const byte=encoded!.charCodeAt(index++)-63;if(byte<0||byte>63)throw new Error("Invalid route");result|=(byte&31)<<shift;shift+=5;if(byte<32)return result&1?~(result>>>1):result>>>1;}}
  try{while(index<encoded.length){lat+=next();lng+=next();const point={latitude:lat/1e5,longitude:lng/1e5};if(!validCoordinate(point)||points.length>=20000)return [];points.push({lat:point.latitude,lng:point.longitude});}return points;}catch{return [];}
}
