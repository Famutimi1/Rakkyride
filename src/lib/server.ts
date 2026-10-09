import "server-only";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
export const previewEnabled = () =>
  process.env.NODE_ENV === "development" &&
  process.env.DASHBOARD_PREVIEW === "true";
export const cookieNames = {
  googleNonce:
    process.env.NODE_ENV === "production"
      ? "__Host-rakky-google-nonce"
      : "rakky-google-nonce",
  access:
    process.env.NODE_ENV === "production"
      ? "__Host-rakky-access"
      : "rakky-access",
  refresh:
    process.env.NODE_ENV === "production"
      ? "__Host-rakky-refresh"
      : "rakky-refresh",
};
export interface Staff {
  id: string;
  name: string;
  platformRole: "admin" | "super_admin";
}
export function isStaff(value: unknown): value is Staff {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "platformRole" in value &&
    (value.platformRole === "admin" || value.platformRole === "super_admin"),
  );
}
export async function upstream(path: string, options: RequestInit = {}) {
  const base = process.env.RAKKY_API_URL ?? "http://127.0.0.1:4000";
  return fetch(`${base.replace(/\/$/, "")}/api/${path}`, {
    ...options,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: { "Content-Type": "application/json", ...options.headers },
  });
}
export async function requireStaff(): Promise<Staff> {
  const token = (await cookies()).get(cookieNames.access)?.value;
  if (!token) redirect("/login");
  let response: Response;
  try {
    response = await upstream("auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    redirect("/login?reason=unavailable");
  }
  if (response.status === 401) redirect("/login?reason=expired");
  if (!response.ok) redirect("/login?reason=unavailable");
  const data: unknown = await response.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("user" in data) ||
    !isStaff(data.user)
  )
    redirect("/login?reason=forbidden");
  return data.user;
}
export class InvalidStaffQuery extends Error {}
export async function adminRead<T>(path: string): Promise<T> {
  // This helper is server-only. All caller paths are fixed by the route registry.
  const token = (await cookies()).get(cookieNames.access)?.value;
  if (!token) redirect("/login");
  const response = await upstream(`admin/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) redirect("/login?reason=expired");
  if (response.status === 403) redirect("/login?reason=forbidden");
  if (response.status === 400)
    throw new InvalidStaffQuery(
      "Check the record ID or filters, then try again.",
    );
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error(`Staff API returned ${response.status}`);
  return (await response.json()) as T;
}
