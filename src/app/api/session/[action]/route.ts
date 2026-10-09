import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { cookieNames, isStaff, upstream } from "@/lib/server";
function result(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function tokenPair(
  value: unknown,
): value is { tokens: { accessToken: string; refreshToken: string } } {
  return Boolean(
    value &&
    typeof value === "object" &&
    "tokens" in value &&
    value.tokens &&
    typeof value.tokens === "object" &&
    "accessToken" in value.tokens &&
    typeof value.tokens.accessToken === "string" &&
    "refreshToken" in value.tokens &&
    typeof value.tokens.refreshToken === "string",
  );
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const origin =
    process.env.DASHBOARD_ORIGIN ??
    (process.env.NODE_ENV === "development" ? "http://127.0.0.1:3015" : null);
  if (!origin || request.headers.get("origin") !== origin)
    return result({ error: "Request origin denied." }, 403);
  const { action } = await params;
  if (!["initiate", "verify", "refresh", "logout"].includes(action))
    return result({ error: "Not found." }, 404);
  const jar = await cookies();
  const clear = () => {
    jar.delete(cookieNames.access);
    jar.delete(cookieNames.refresh);
  };
  try {
    if (action === "logout") {
      const access = jar.get(cookieNames.access)?.value,
        refresh = jar.get(cookieNames.refresh)?.value;
      try {
        if (access && refresh)
          await upstream("auth/logout", {
            method: "POST",
            headers: { Authorization: `Bearer ${access}` },
            body: JSON.stringify({ refreshToken: refresh }),
          });
      } finally {
        clear();
      }
      return result({ success: true });
    }
    const input: unknown = action === "refresh" ? {} : await request.json();
    if (!input || typeof input !== "object")
      return result({ error: "Invalid request." }, 400);
    let body: object;
    if (action === "refresh") {
      const refreshToken = jar.get(cookieNames.refresh)?.value;
      if (!refreshToken) {
        clear();
        return result({ error: "Sign in again." }, 401);
      }
      body = { refreshToken };
    } else {
      const phone = "phone" in input ? input.phone : null;
      const code = "code" in input ? input.code : null;
      if (typeof phone !== "string" || !/^\+234\d{10}$/.test(phone))
        return result(
          { error: "Use a Nigerian phone number in +234 format." },
          400,
        );
      if (
        action === "verify" &&
        (typeof code !== "string" || !/^\d{6}$/.test(code))
      )
        return result({ error: "Enter the six-digit verification code." }, 400);
      body = action === "verify" ? { phone, code } : { phone };
    }
    const response = await upstream(
      action === "refresh" ? "auth/refresh" : `auth/login/${action}`,
      { method: "POST", body: JSON.stringify(body) },
    );
    if (!response.ok) {
      if (action === "refresh" && response.status === 401) clear();
      return result(
        {
          error:
            response.status === 429
              ? "Too many attempts. Wait before trying again."
              : response.status >= 500
                ? "The sign-in service is unavailable."
                : "Sign-in could not be completed. Check your details or request a new code.",
        },
        response.status,
      );
    }
    const data: unknown = await response.json();
    if (action === "initiate") return result({ success: true });
    if (!tokenPair(data))
      return result({ error: "Unexpected sign-in response." }, 502);
    const me = await upstream("auth/me", {
      headers: { Authorization: `Bearer ${data.tokens.accessToken}` },
    });
    const identity: unknown = me.ok ? await me.json() : null;
    if (
      !identity ||
      typeof identity !== "object" ||
      !("user" in identity) ||
      !isStaff(identity.user)
    ) {
      await upstream("auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.tokens.accessToken}` },
        body: JSON.stringify({ refreshToken: data.tokens.refreshToken }),
      });
      clear();
      return result({ error: "This account does not have staff access." }, 403);
    }
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict" as const,
      path: "/",
    };
    jar.set(cookieNames.access, data.tokens.accessToken, options);
    jar.set(cookieNames.refresh, data.tokens.refreshToken, options);
    return result({ success: true });
  } catch {
    return result(
      { error: "The sign-in service is unavailable. Try again shortly." },
      503,
    );
  }
}
