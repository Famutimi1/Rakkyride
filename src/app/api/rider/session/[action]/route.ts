import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { upstream } from "@/lib/server";
import { readJsonRequest, RequestBodyError } from "@/lib/request-body";
import { clearRiderTokens, publicIdentity, riderCookies, riderIdentity, riderJson, riderOriginAllowed, storeRiderTokens } from "@/lib/rider-server";

export async function GET(_request: NextRequest, {params}: {params: Promise<{action: string}>}) {
  if ((await params).action !== "me") return riderJson({error: "Not found."}, 404);
  const token = (await cookies()).get(riderCookies.access)?.value;
  if (!token) return riderJson({error: "Sign in to continue."}, 401);
  try { const {response,identity} = await riderIdentity(token); return identity ? riderJson(publicIdentity(identity)) : riderJson({error: response.status === 401 ? "Sign in again to continue." : "Your account could not be loaded."}, response.status === 401 ? 401 : 503); }
  catch { return riderJson({error: "The account service is unavailable. Please try again."}, 503); }
}
const authPaths: Record<string,string> = { "login-initiate": "login/initiate", "login-verify": "login/verify", "register-initiate": "register/initiate", "register-verify": "register/verify", resend: "otp/resend", refresh: "refresh", logout: "logout", google:"google/web", "google-challenge":"google/web", "google-reset":"google/web" };
export async function POST(request: NextRequest, {params}: {params: Promise<{action: string}>}) {
  if (!riderOriginAllowed(request)) return riderJson({error: "Request origin denied."}, 403);
  const action = (await params).action;
  if (!Object.hasOwn(authPaths,action)) return riderJson({error: "Not found."}, 404);
  try {
    const raw = await readJsonRequest(request);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return riderJson({error:"Invalid request."},400);
    const input = raw as Record<string,unknown>;
    const jar=await cookies();
    const options={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict" as const,path:"/",maxAge:600};
    if(action==="google-reset"){jar.delete(riderCookies.googlePhone);jar.delete(riderCookies.googleNonce);return riderJson({success:true});}
    if(action==="google-challenge"){
      if(!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)return riderJson({error:"Google sign-in is not configured. Use your phone number."},503);
      const nonce=randomBytes(32).toString("base64url");jar.set(riderCookies.googleNonce,nonce,options);return riderJson({nonce});
    }
    const nonce=jar.get(riderCookies.googleNonce)?.value;
    if(action==="google"&&(!nonce||typeof input.idToken!=="string"||input.idToken.length>12000))return riderJson({error:"Restart Google sign-in and try again."},400);
    if(action==="google")jar.delete(riderCookies.googleNonce);
    const refreshToken = jar.get(riderCookies.refresh)?.value;
    if (action === "logout") {
      // Keep the credential available for retry if revocation is temporarily unavailable.
      if (refreshToken) { const response = await upstream("auth/logout", {method: "POST", body: JSON.stringify({refreshToken})}); if (!response.ok) return riderJson({error:"Sign-out could not be completed. Try again."},503); }
      await clearRiderTokens(); return riderJson({success:true});
    }
    if (action === "refresh" && !refreshToken) return riderJson({error:"Sign in again to continue."},401);
    const payload = action === "google" ? {idToken:input.idToken,expectedNonce:nonce} : action === "refresh" ? {refreshToken} : action.startsWith("register-") ? {fullName: input.fullName, phone: input.phone, email: input.email, code: input.code, accountType:"rider",...(action==="register-verify"?{phoneVerificationToken:input.googlePhoneLink===true?jar.get(riderCookies.googlePhone)?.value:undefined}:{})} : action === "resend" ? {phone: input.phone, purpose: input.purpose} : {phone:input.phone, code: input.code};
    const response = await upstream(`auth/${authPaths[action]}`, {method:"POST", headers:{"User-Agent":"Rakky Ride passenger website"}, body:JSON.stringify(payload)});
    const data = await response.json() as Record<string,unknown>;
    if (!response.ok) {
      if (action === "refresh" && response.status === 401) await clearRiderTokens();
      return riderJson({error: typeof data.error === "string" && response.status < 500 ? data.error : "The sign-in service is unavailable. Try again shortly.", retryAfterSeconds: data.retryAfterSeconds},response.status);
    }
    if(action==="google"&&data.needsPhoneVerification===true){
      if(typeof data.phoneVerificationToken!=="string")return riderJson({error:"Unexpected Google account response."},502);
      jar.set(riderCookies.googlePhone,data.phoneVerificationToken,options);
      const user=data.user as {name?:unknown}|undefined;
      return riderJson({needsPhoneVerification:true,name:typeof user?.name==="string"?user.name:""});
    }
    if (!action.endsWith("verify") && action !== "refresh" && action!=="google") return riderJson({success:true,phone:data.phone,retryAfterSeconds:data.retryAfterSeconds});
    const tokens = data.tokens as {accessToken?:unknown;refreshToken?:unknown} | undefined;
    if (!tokens || typeof tokens.accessToken !== "string" || typeof tokens.refreshToken !== "string") return riderJson({error:"Unexpected sign-in response."},502);
    // Refresh rotates the credential; persist it even if the identity read is unavailable.
    await storeRiderTokens({accessToken:tokens.accessToken, refreshToken:tokens.refreshToken});
    jar.delete(riderCookies.googlePhone);
    const {identity} = await riderIdentity(tokens.accessToken);
    if (!identity) return riderJson({error:"Signed in, but account details could not load. Please retry."},503);
    return riderJson(publicIdentity(identity));
  } catch (error) {
    if (error instanceof RequestBodyError) return riderJson({error:error.message},error.status);
    return riderJson({error:"The sign-in service is unavailable. Please try again."},503);
  }
}
