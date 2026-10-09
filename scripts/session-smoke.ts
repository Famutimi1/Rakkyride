import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

// Local stub only: no SMS, Paystack, or real accounts are contacted.
async function body(req: IncomingMessage) {
  let raw = "";
  for await (const part of req) raw += part;
  return raw ? (JSON.parse(raw) as Record<string, string>) : {};
}
const directoryRequests: string[] = [];
let receivedGoogleNonce = "";
const mock = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/api/auth/login/initiate") {
    res.end(JSON.stringify({ phone: "+2348000000000" }));
    return;
  }
  if (req.url === "/api/auth/login/verify") {
    const data = await body(req);
    res.end(
      JSON.stringify({
        tokens: {
          accessToken: data.code === "111111" ? "staff-test" : "user-test",
          refreshToken: "refresh-test",
        },
      }),
    );
    return;
  }
  if (req.url === "/api/auth/google/staff") {
    const data = await body(req);
    receivedGoogleNonce = data.expectedNonce;
    if (data.idToken === "google-invalid-test-credential") {
      res.statusCode = 401;
      res.end("{}");
      return;
    }
    res.end(
      JSON.stringify({
        tokens: {
          accessToken:
            data.idToken === "google-staff-test-credential"
              ? "staff-test"
              : "user-test",
          refreshToken: "refresh-test",
        },
      }),
    );
    return;
  }
  if (req.url === "/api/auth/refresh") {
    res.end(
      JSON.stringify({
        tokens: { accessToken: "staff-test", refreshToken: "rotated-test" },
      }),
    );
    return;
  }
  if (req.url === "/api/auth/me") {
    res.end(
      JSON.stringify({
        user: {
          id: "test-user",
          name: "Local Test",
          platformRole:
            req.headers.authorization === "Bearer staff-test"
              ? "admin"
              : "user",
        },
      }),
    );
    return;
  }
  if (req.url === "/api/admin/environment") {
    res.end(
      JSON.stringify({ nodeEnvironment: "test", paymentEnvironment: "test" }),
    );
    return;
  }
  if (req.url?.startsWith("/api/admin/users?")) {
    if (req.headers.authorization !== "Bearer staff-test") {
      res.statusCode = 403;
      res.end("{}");
      return;
    }
    directoryRequests.push(req.url);
    const query = new URL(req.url, "http://stub.invalid").searchParams;
    const page = Number(query.get("page")),
      size = Number(query.get("limit"));
    const from = (page - 1) * size + 1,
      to = Math.min(page * size, 108);
    res.end(
      JSON.stringify({
        items: Array.from({ length: to - from + 1 }, (_, index) => ({
          id: `00000000-0000-0000-0000-${String(from + index).padStart(12, "0")}`,
          name: `Test person ${from + index}`,
          phoneMasked: "••• 0000",
          emailMasked: "Not supplied",
          active: true,
          joinedAt: "2026-10-09T10:00:00Z",
          trips: 0,
          driver: null,
        })),
        nextCursor: null,
        count: { value: 108, exact: true },
        asOf: "2026-10-09T10:00:00Z",
        pagination: {
          page,
          pageSize: size,
          total: 108,
          totalPages: Math.ceil(108 / size),
          from,
          to,
          hasPrevious: page > 1,
          hasNext: to < 108,
        },
        scope: { dateBasis: "created_at" },
      }),
    );
    return;
  }
  if (req.url === "/api/admin/search" && req.method === "POST") {
    const input = await body(req);
    if (req.headers.authorization !== "Bearer staff-test") {
      res.statusCode = 403;
      res.end("{}");
      return;
    }
    if (input.query !== "Local Test") {
      res.statusCode = 400;
      res.end("{}");
      return;
    }
    res.end(
      JSON.stringify({
        groups: [
          {
            scope: "people",
            label: "People",
            items: [
              {
                id: "00000000-0000-0000-0000-000000000001",
                type: "person",
                title: "Local Test",
                subtitle: "••• 0000",
                href: "/admin/riders/00000000-0000-0000-0000-000000000001",
              },
            ],
            hasMore: false,
            nextCursor: null,
          },
        ],
        asOf: new Date().toISOString(),
        limitPerGroup: 20,
      }),
    );
    return;
  }
  if (req.url === "/api/auth/logout") {
    res.end(JSON.stringify({ success: true }));
    return;
  }
  res.statusCode = 404;
  res.end("{}");
});
mock.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => mock.once("listening", resolve));
const reservation = createServer();
reservation.listen(0, "127.0.0.1");
await new Promise<void>((resolve) => reservation.once("listening", resolve));
const port = (reservation.address() as AddressInfo).port;
await new Promise<void>((resolve) => reservation.close(() => resolve()));
const base = `http://127.0.0.1:${port}`;
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: {
      ...process.env,
      NODE_ENV: "production",
      DASHBOARD_ORIGIN: base,
      DASHBOARD_PREVIEW: "true",
      RAKKY_API_URL: `http://127.0.0.1:${(mock.address() as AddressInfo).port}`,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: "session-test.apps.googleusercontent.com",
    },
    stdio: "pipe",
  },
);
let output = "";
child.stderr.on("data", (chunk) => {
  output += String(chunk);
});
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(base + "/login");
      ready = true;
      break;
    } catch {
      await delay(100);
    }
  }
  assert.ok(ready, `Next did not start: ${output}`);
  const protectedPage = await fetch(base + "/admin", { redirect: "manual" });
  assert.equal(
    protectedPage.status,
    307,
    "production cannot enable fixture bypass",
  );
  assert.equal(protectedPage.headers.get("location"), "/login");
  const post = (action: string, payload: object, origin = base, cookie = "") =>
    fetch(`${base}/api/session/${action}`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(payload),
    });
  assert.equal(
    (
      await post(
        "verify",
        { phone: "+2348000000000", code: "111111" },
        "https://other.invalid",
      )
    ).status,
    403,
    "cross-origin session mutation denied",
  );
  const denied = await post("verify", {
    phone: "+2348000000000",
    code: "222222",
  });
  assert.equal(
    denied.status,
    403,
    "ordinary accounts cannot create staff sessions",
  );
  const signedIn = await post("verify", {
    phone: "+2348000000000",
    code: "111111",
  });
  assert.equal(signedIn.status, 200, await signedIn.clone().text());
  const cookies = signedIn.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  for (const cookie of cookies) {
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /Secure/i);
    assert.match(cookie, /SameSite=strict/i);
    assert.match(cookie, /__Host-/);
  }
  const payload = await signedIn.text();
  assert.equal(payload.includes("staff-test"), false);
  assert.equal(payload.includes("refresh-test"), false);
  const cookieHeader = cookies.map((cookie) => cookie.split(";")[0]).join("; ");
  const directory = await fetch(
    base + "/admin/riders?page=2&limit=20&mode=active",
    { headers: { Cookie: cookieHeader } },
  );
  assert.equal(directory.status, 200);
  const directoryHtml = await directory.text();
  const directoryText = directoryHtml.replace(/<[^>]*>/g, "");
  assert.ok(
    directoryText.includes("Showing 21–40 of 108 users"),
    "server renders the API total and range",
  );
  assert.ok(directoryText.includes("Page 2 of 6"));
  assert.ok(
    directoryRequests.includes("/api/admin/users?page=2&limit=20&mode=active"),
  );
  assert.equal(directoryHtml.includes("staff-test"), false);
  await fetch(base + "/admin/riders", { headers: { Cookie: cookieHeader } });
  assert.ok(
    directoryRequests.includes("/api/admin/users?page=1&limit=20"),
    "directory defaults use API pagination",
  );
  const recordSearch = (origin: string, cookie: string) =>
    fetch(`${base}/api/admin/search`, {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: cookie,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "Local Test", scope: "people" }),
    });
  assert.equal(
    (await recordSearch("https://other.invalid", cookieHeader)).status,
    403,
  );
  assert.equal((await recordSearch(base, "")).status, 401);
  const found = await recordSearch(base, cookieHeader);
  assert.equal(found.status, 200, await found.clone().text());
  assert.equal(found.headers.get("cache-control"), "no-store");
  const foundBody = await found.text();
  assert.ok(foundBody.includes("Local Test"));
  assert.equal(foundBody.includes("staff-test"), false);
  assert.equal(
    (
      await fetch(`${base}/api/admin/search?query=Local%20Test`, {
        headers: { Cookie: cookieHeader },
      })
    ).status,
    404,
    "search text cannot be sent by GET",
  );
  assert.equal((await post("refresh", {}, base, cookieHeader)).status, 200);
  const loggedOut = await post("logout", {}, base, cookieHeader);
  assert.equal(loggedOut.status, 200);
  assert.ok(
    loggedOut.headers
      .getSetCookie()
      .every((cookie) => /Expires=Thu, 01 Jan 1970/i.test(cookie)),
  );
  assert.equal(
    (await post("google-challenge", {}, "https://other.invalid")).status,
    403,
  );
  assert.equal(
    (await post("google", { idToken: "google-staff-test-credential" })).status,
    400,
    "Google requires a browser-bound challenge",
  );
  const googleChallenge = await post("google-challenge", {});
  assert.equal(googleChallenge.status, 200);
  const nonce = ((await googleChallenge.json()) as { nonce: string }).nonce;
  assert.match(nonce, /^[A-Za-z0-9_-]{43}$/);
  const nonceCookie = googleChallenge.headers.getSetCookie()[0];
  assert.match(nonceCookie, /HttpOnly/i);
  assert.match(nonceCookie, /Secure/i);
  assert.match(nonceCookie, /SameSite=strict/i);
  assert.match(nonceCookie, /Max-Age=600/i);
  const challengeHeader = nonceCookie.split(";")[0];
  const googleSession = await post(
    "google",
    {
      idToken: "google-staff-test-credential",
      expectedNonce: "client-tampering-ignored",
    },
    base,
    challengeHeader,
  );
  assert.equal(googleSession.status, 200, await googleSession.clone().text());
  assert.equal(
    receivedGoogleNonce,
    nonce,
    "only HttpOnly cookie supplies backend expected nonce",
  );
  const googleCookies = googleSession.headers.getSetCookie();
  assert.ok(
    googleCookies.some(
      (cookie) =>
        cookie.startsWith("__Host-rakky-google-nonce=") &&
        /Expires=Thu, 01 Jan 1970/i.test(cookie),
    ),
  );
  assert.ok(
    googleCookies
      .filter((cookie) => !cookie.startsWith("__Host-rakky-google-nonce="))
      .every((cookie) => /HttpOnly/i.test(cookie) && /Secure/i.test(cookie)),
  );
  assert.equal((await googleSession.text()).includes("staff-test"), false);
  assert.equal(
    (
      await post(
        "google",
        { idToken: "google-user-test-credential" },
        base,
        challengeHeader,
      )
    ).status,
    403,
    "nonstaff Google cannot establish a staff cookie",
  );
  assert.equal(
    (
      await post(
        "google",
        { idToken: "google-invalid-test-credential" },
        base,
        challengeHeader,
      )
    ).status,
    401,
  );
  console.log(
    "PASS: production fixture isolation, route guard, CSRF rejection, nonstaff rejection, secure cookies, token redaction, refresh, logout, body-only authenticated record search, server-rendered API pagination, filtered query forwarding and Google browser challenge/staff session checks.",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => mock.close(() => resolve()));
}
