import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { upstream } from "./server";
import type { RiderIdentity } from "@/contracts/rider";
export const riderCookies = {
  googleNonce: process.env.NODE_ENV === "production" ? "__Host-rakky-rider-google-nonce" : "rakky-rider-google-nonce",
  googlePhone: process.env.NODE_ENV === "production" ? "__Host-rakky-rider-google-phone" : "rakky-rider-google-phone",
  access: process.env.NODE_ENV === "production" ? "__Host-rakky-rider-access" : "rakky-rider-access",
  refresh: process.env.NODE_ENV === "production" ? "__Host-rakky-rider-refresh" : "rakky-rider-refresh",
};
export const riderJson = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "no-store", "Vary": "Cookie" } });
export function riderOriginAllowed(request: Request) {
  const expected = process.env.RIDER_ORIGIN ?? process.env.DASHBOARD_ORIGIN ?? (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3015" : null);
  return Boolean(expected && request.headers.get("origin") === expected);
}
export function isRiderIdentity(value: unknown): value is RiderIdentity {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<RiderIdentity>;
  return Boolean(v.user && typeof v.user.id === "string" && typeof v.user.name === "string" && (v.activeRole === "rider" || v.activeRole === "driver"));
}
export async function storeRiderTokens(tokens: {accessToken: string; refreshToken: string}) {
  const jar = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/" };
  jar.set(riderCookies.access, tokens.accessToken, options);
  jar.set(riderCookies.refresh, tokens.refreshToken, options);
}
export async function clearRiderTokens() { const jar = await cookies(); for(const name of Object.values(riderCookies))jar.delete(name); }
/** Never return auth credentials or provider internals to the browser. */
export async function riderIdentity(token: string) {
  const response = await upstream("auth/me", { headers: { Authorization: `Bearer ${token}` } });
  const data: unknown = response.ok ? await response.json() : null;
  return { response, identity: isRiderIdentity(data) ? data : null };
}
export function publicIdentity(identity: RiderIdentity) { return { user: identity.user, activeRole: identity.activeRole, driverStatus: identity.driverStatus }; }
