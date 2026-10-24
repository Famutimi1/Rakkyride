import {cookies} from 'next/headers';
import {NextRequest} from 'next/server';
import {upstream} from '@/lib/server';
import {readJsonRequest,RequestBodyError} from '@/lib/request-body';
import {riderCookies,riderJson,riderOriginAllowed,riderIdentity} from '@/lib/rider-server';
import {driverOperationAllowed,driverQuery} from '@/lib/driver-policy';
import {validCheckoutUrl} from '@/lib/rider-policy';
async function handle(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){
 const path=(await params).path.join('/');if(!driverOperationAllowed(request.method,path))return riderJson({error:'This driver operation is unavailable.'},404);
 if(request.method!=='GET'&&!riderOriginAllowed(request))return riderJson({error:'Request origin denied.'},403);
 const token=(await cookies()).get(riderCookies.access)?.value;if(!token)return riderJson({error:'Sign in to continue.'},401);
 try{
  const {identity,response:check}=await riderIdentity(token);if(!identity)return riderJson({error:check.status===401?'invalid_or_expired_token':'Account verification is unavailable.'},check.status===401?401:503);
  // Applications are available before approval. Backend guards still authorize every trip and payout.
  const setup=path.startsWith('driver/onboarding/')||path==='driver/application/status'||path==='driver/service-settings'||path==='driver/service-applications'||path==='driver/service-consent/withdraw'||path==='auth/active-role'||path.startsWith('notifications');
  if(!setup&&identity.activeRole!=='driver')return riderJson({error:'switch_to_driver_mode'},403);
  let body=request.method==='GET'?undefined:await readJsonRequest(request);if(body!==undefined&&(!body||typeof body!=='object'||Array.isArray(body)))return riderJson({error:'Invalid request.'},400);
  if(path==='auth/active-role'){const role=(body as {role?:unknown})?.role;if(role!=='driver'&&role!=='rider')return riderJson({error:'Invalid account mode.'},400);body={role};}
  if(path==='payments/topups')body={amountKobo:(body as {amountKobo?:unknown})?.amountKobo,target:'earnings'};
  if(path==='notifications/preferences'&&request.method==='PATCH'){const allowed=['pushEnabled','tripUpdatesEnabled','driverOffersEnabled','scheduledRemindersEnabled','walletUpdatesEnabled','promotionsEnabled','soundEnabled','vibrationEnabled'];body=Object.fromEntries(Object.entries(body as object).filter(([key])=>allowed.includes(key)));}
  const response=await upstream(path+driverQuery(path,request.nextUrl.searchParams),{method:request.method,headers:{Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();
  if(!response.ok)return riderJson({error:response.status>=500?'The service is temporarily unavailable. Refresh before retrying.':data.error??'The request could not be completed.',retryAfterSeconds:data.retryAfterSeconds},response.status);
  if(path==='payments/topups'){if(typeof data.reference!=='string'||!validCheckoutUrl(data.authorizationUrl))return riderJson({error:'Invalid checkout response. No payment was made.'},502);return riderJson({reference:data.reference,authorizationUrl:data.authorizationUrl});}
  return riderJson(data,response.status);
 }catch(error){if(error instanceof RequestBodyError)return riderJson({error:error.message},error.status);return riderJson({error:'Unable to reach Rakky Ride. Refresh to check the latest status before retrying.'},503);}
}
export const GET=handle;export const POST=handle;export const PATCH=handle;export const PUT=handle;export const DELETE=handle;
