import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { upstream } from "@/lib/server";
import { readJsonRequest, RequestBodyError } from "@/lib/request-body";
import { isRiderIdentity, publicIdentity, riderCookies, riderJson, riderOriginAllowed } from "@/lib/rider-server";
import { riderOperationAllowed, riderQuery, validCheckoutUrl } from "@/lib/rider-policy";
import {nearbyQuery} from "@/lib/rider-geo";
async function handle(request: NextRequest, {params}: {params: Promise<{path: string[]}>}) {
  const path = (await params).path.join("/");
  if (!riderOperationAllowed(request.method,path)) return riderJson({error:"This operation is unavailable."},404);
  if (request.method !== "GET" && !riderOriginAllowed(request)) return riderJson({error:"Request origin denied."},403);
  const token = (await cookies()).get(riderCookies.access)?.value;
  if (!token) return riderJson({error:"Sign in to continue."},401);
  try {
    let payload = request.method === "GET" ? undefined : await readJsonRequest(request);
    if (payload !== undefined && (!payload || typeof payload !== "object" || Array.isArray(payload))) return riderJson({error:"Invalid request."},400);
    if (path === "auth/active-role") payload = {role:"rider"};
    if (path === "payments/topups") payload = {amountKobo:(payload as Record<string,unknown>).amountKobo,target:"wallet"};
    if(path === "notifications/preferences" && request.method === "PATCH"){
      const allowed=["pushEnabled","tripUpdatesEnabled","scheduledRemindersEnabled","walletUpdatesEnabled","promotionsEnabled","soundEnabled","vibrationEnabled"];
      payload=Object.fromEntries(Object.entries(payload as Record<string,unknown>).filter(([key])=>allowed.includes(key)));
    }
    const headers: Record<string,string> = {Authorization:`Bearer ${token}`};
    if (path === "trips" && request.method === "POST") {
      const key = request.headers.get("idempotency-key");
      if (!key || !/^[a-zA-Z0-9_-]{16,80}$/.test(key)) return riderJson({error:"A valid booking request key is required."},400);
      headers["Idempotency-Key"] = key;
    }
    const query=path==="location/nearby"?nearbyQuery(request.nextUrl.searchParams):riderQuery(path,request.nextUrl.searchParams);
    if(query===null)return riderJson({error:"Choose a valid pickup, service and a search radius from 1 to 25 km."},400);
    const response = await upstream(`${path}${query}`, {method:request.method, headers, body:payload === undefined ? undefined : JSON.stringify(payload)});
    const data: unknown = await response.json();
    if (!response.ok) return riderJson({error: response.status >= 500 ? "The service is temporarily unavailable. Please try again." : typeof (data as {error?:unknown})?.error === "string" ? (data as {error:string}).error : "The request could not be completed.",retryAfterSeconds:(data as {retryAfterSeconds?:number})?.retryAfterSeconds},response.status);
    if (path === "payments/topups" && request.method === "POST") {
      const checkout = data as {reference?:unknown;authorizationUrl?:unknown};
      if (typeof checkout.reference !== "string" || !validCheckoutUrl(checkout.authorizationUrl)) return riderJson({error:"The payment provider returned an invalid checkout. No payment was made."},502);
      return riderJson({reference:checkout.reference,authorizationUrl:checkout.authorizationUrl});
    }
    if (path === "auth/me" || path === "auth/profile" || path === "auth/phone-change/verify") return isRiderIdentity(data) ? riderJson(publicIdentity(data)) : riderJson({error:"Unexpected account response."},502);
    if(path === "notifications/preferences"){
      const {driverOffersEnabled:_driver,...preferences}=data as Record<string,unknown>;
      return riderJson(preferences);
    }
    return riderJson(data,response.status);
  } catch(error) { if (error instanceof RequestBodyError) return riderJson({error:error.message},error.status); return riderJson({error:"Unable to reach Rakky Ride. Please try again."},503); }
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE=handle;
