import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {readJsonRequest,RequestBodyError} from '@/lib/request-body';
import { cookieNames, previewEnabled, upstream } from "@/lib/server";
const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const readRules = [
  /^emails(\/(configuration|templates|preferences))?$/i,
  new RegExp(`^emails/${uuid}$`, "i"),
  /^support-settings$/i,
  /^live$/i,
  new RegExp(`^trips/${uuid}/location$`, "i"),
  /^reports\/export$/i,
  new RegExp(`^operations/${uuid}$`, "i"),
  new RegExp(`^driver-applications/${uuid}$`, "i"),
  new RegExp(
    `^driver-applications/${uuid}/documents/(license|registration|insurance)$`,
    "i",
  ),
];
const mutationRules = [
  /^emails\/preferences$/i,
  /^emails\/test$/i,
  new RegExp(`^emails/${uuid}/retry$`, "i"),
  /^support-settings$/i,
  /^search$/i,
  /^(support|safety)$/i,
  new RegExp(`^(support|safety)/${uuid}/activity$`, "i"),
  /^payments\/(refunds|adjustments|settings)$/i,
  new RegExp(`^payments/accounts/${uuid}/freeze$`, "i"),
  new RegExp(`^driver-applications/${uuid}/review$`, "i"),
  /^pricing\/[a-z][a-z0-9_]{0,19}$/,
  new RegExp(`^users/${uuid}$`, "i"),
  new RegExp(`^trips/${uuid}/schedule$`, "i"),
];
const json = (value: unknown, status = 200) =>
  NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
async function handle(
  request: NextRequest,
  params: Promise<{ path: string[] }>,
) {
  const path = (await params).path.join("/");
  const read = request.method === "GET";
  const inspection = read || path === "search";
  if (!(read ? readRules : mutationRules).some((rule) => rule.test(path)))
    return json({ error: "This operation is unavailable." }, 404);
  const patch =
    path === "emails/preferences" ||
    path === "support-settings" ||
    path === "payments/settings" ||
    path.startsWith("pricing/") ||
    /^users\//.test(path);
  if (
    !read &&
    ((patch && request.method !== "PATCH") ||
      (!patch && request.method === "PATCH"))
  )
    return json({ error: "Unsupported operation." }, 405);
  if (previewEnabled())
    return json(
      { error: "Development preview never calls operational APIs." },
      409,
    );
  if (!read) {
    const origin =
      process.env.DASHBOARD_ORIGIN ??
      (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3015" : null);
    if (!origin || request.headers.get("origin") !== origin)
      return json({ error: "Request origin denied." }, 403);
    if (
      path.startsWith("payments/") &&
      path !== "payments/settings" &&
      process.env.ENABLE_ADMIN_MONEY_ACTIONS !== "true"
    )
      return json(
        {
          error:
            "Money actions are disabled until payment rollout checks are approved.",
        },
        403,
      );
  }
  const token = (await cookies()).get(cookieNames.access)?.value;
  if (!token)
    return json({ error: "Your session expired. Sign in again." }, 401);
  try {
    const body = read ? undefined : JSON.stringify(await readJsonRequest(request));
    const response = await upstream(
      `admin/${path}${read ? request.nextUrl.search : ""}`,
      {
        method: request.method,
        headers: { Authorization: `Bearer ${token}` },
        body,
      },
    );
    if (path === "reports/export" && response.ok)
      return new NextResponse(await response.text(), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=rakky-report.csv",
          "Cache-Control": "no-store",
        },
      });
    if (path.includes("/documents/") && response.ok) {
      const type = response.headers.get("content-type") ?? "";
      if (
        !["image/png", "image/jpeg", "image/webp", "application/pdf"].some(
          (allowed) => type.startsWith(allowed),
        )
      )
        return json({ error: "Unsupported document content." }, 415);
      return new NextResponse(await response.arrayBuffer(), {
        headers: {
          "Content-Type": type,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "SAMEORIGIN",
          "Content-Security-Policy": "default-src 'none'; sandbox",
          "Content-Disposition": "inline",
        },
      });
    }
    const data: unknown = await response.json();
    return json(data, response.status);
  } catch (error) {
    if(error instanceof RequestBodyError)return json({error:error.message},error.status);
    return json(
      {
        error: inspection
          ? "The staff service is unavailable."
          : "The outcome is uncertain. Check status before repeating the identical operation.",
      },
      503,
    );
  }
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handle(request, params);
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return handle(request, params);
}

export const PATCH = POST;
