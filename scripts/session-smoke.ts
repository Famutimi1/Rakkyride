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
const mutationRequests: {path: string; method: string; payload: object}[] = [];
let receivedGoogleNonce = "";
let logoutStatus = 200;
let meStatus = 200;
const logoutRequests: {authorization?: string; refreshToken?: string}[] = [];
const fixtureEmail={id:'00000000-0000-0000-0000-000000000001',userId:null,audience:'customer',recipient:'a•••@•••',template:'welcome_rider',subject:'Fixture welcome email',status:'blocked',attempts:0,lastError:null,createdAt:'2026-10-17T09:00:00Z',updatedAt:'2026-10-17T09:00:00Z',acceptedAt:null,deliveredAt:null,providerId:null,version:'fixture-email-version',canRetry:false};
const mock = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/api/auth/login/initiate") {
    res.end(JSON.stringify({ phone: "+2348000000000" }));
    return;
  }
  if (req.url === "/api/auth/login/staff/verify") {
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
    if (meStatus !== 200) { res.statusCode = meStatus; res.end("{}"); return; }
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
  if(req.url?.startsWith('/api/admin/emails')&&req.method==='GET'){
    assert.equal(req.headers.authorization,'Bearer staff-test');
    directoryRequests.push(req.url);
    const path=new URL(req.url,'http://stub.invalid').pathname;
    const value=path.endsWith('/configuration')?{enabled:false,ready:false,missing:['EMAIL_ENABLED'],sender:null,replyTo:null,adminRecipients:[],apiKeyConfigured:false,webhookConfigured:false,logoUrl:null,appUrl:null,dashboardUrl:null,worker:{name:'Email worker',state:'unknown',details:'Local fixture only'}}
      :path.endsWith('/preferences')?{enabled:true,rules:{welcome_rider:true},version:1,updatedAt:'2026-10-17T09:00:00Z',controls:[{key:'welcome_rider',label:'Rider welcome',group:'Welcome & signup',description:'Welcome riders after signup.'}]}
      :path.endsWith('/templates')?[{template:'welcome_rider',version:1,subject:'Fixture welcome email',text:'Fixture plain text',html:'<html><body><h1>Fixture template</h1></body></html>'}]
      :path.endsWith(fixtureEmail.id)?{...fixtureEmail,text:'Fixture plain text',html:'<html><body><h1>Fixture template</h1></body></html>'}
      :{items:[fixtureEmail],page:1,pageSize:20,total:1,summary:{blocked:1},asOf:'2026-10-17T09:00:00Z'};
    res.end(JSON.stringify(value));return;
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
  if (["/api/admin/driver-applications/00000000-0000-0000-0000-000000000001/review", "/api/admin/payments/settings", "/api/admin/pricing/economy", "/api/admin/users/00000000-0000-0000-0000-000000000001", "/api/admin/trips/00000000-0000-0000-0000-000000000001/schedule", "/api/admin/emails/test", "/api/admin/emails/preferences", "/api/admin/emails/00000000-0000-0000-0000-000000000001/retry"].includes(req.url ?? "")) {
    assert.equal(req.headers.authorization, "Bearer staff-test");
    mutationRequests.push({path:req.url!,method:req.method!,payload:await body(req)});
    res.end(JSON.stringify({auditId:"local-audit-test"}));
    return;
  }
  if (req.url === "/api/auth/logout") {
    const input = await body(req);
    logoutRequests.push({authorization:req.headers.authorization,refreshToken:input.refreshToken});
    res.statusCode = logoutStatus;
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
  const beforeHandoff=directoryRequests.length;
  const handoff=await fetch(base+'/open-app?path=%2Fdriver-dashboard');
  assert.equal(handoff.status,200,'customer app handoff is public without staff cookies');
  const handoffHtml=await handoff.text();
  assert.ok(handoffHtml.includes('href="rackyride:///driver-dashboard"'));
  assert.ok(handoffHtml.includes('Open Rakky Ride'));
  const malicious=await (await fetch(base+'/open-app?path=https%3A%2F%2Fevil.test')).text();
  assert.ok(malicious.includes('href="rackyride:///home"'),'untrusted destinations fall back to the home screen');
  assert.equal(directoryRequests.length,beforeHandoff,'public handoff does not request administrative data');
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
  assert.equal((await post('verify',{phone:'x'.repeat(20000),code:'111111'})).status,413,'session transport bounds input before parsing or forwarding');
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
  const emailPage=await fetch(base+'/admin/emails?status=blocked&audience=customer',{headers:{Cookie:cookieHeader}});
  assert.equal(emailPage.status,200);const emailHtml=await emailPage.text();
  assert.ok(emailHtml.includes('Email history'));assert.ok(emailHtml.includes('Fixture welcome email'));
  assert.ok(emailHtml.includes('Branded templates'));assert.ok(emailHtml.includes('sandbox=""'));
  assert.ok(emailHtml.includes('Email preferences'));assert.ok(emailHtml.includes('role="switch"'));assert.ok(emailHtml.includes('Only a super-admin can change'));
  assert.equal(emailHtml.includes('staff-test'),false);
  assert.ok(directoryRequests.includes('/api/admin/emails?status=blocked&audience=customer'));
  const emailDetail=await fetch(base+`/admin/emails/${fixtureEmail.id}`,{headers:{Cookie:cookieHeader}});
  assert.equal(emailDetail.status,200);assert.ok((await emailDetail.text()).includes('Delivery details'));
  const emailRead=await fetch(base+'/api/admin/emails/configuration',{headers:{Cookie:cookieHeader}});
  assert.equal(emailRead.status,200);
  assert.equal((await fetch(base+'/api/admin/emails/configuration')).status,401);
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
  const editRoutes = [
    ["driver-applications/00000000-0000-0000-0000-000000000001/review", "POST"],
    ["payments/settings", "PATCH"], ["pricing/economy", "PATCH"],
    ["users/00000000-0000-0000-0000-000000000001", "PATCH"],
    ["trips/00000000-0000-0000-0000-000000000001/schedule", "POST"],
    ["emails/test", "POST"],
    ["emails/preferences", "PATCH"],
    ["emails/00000000-0000-0000-0000-000000000001/retry", "POST"],
  ] as const;
  for (const [path, method] of editRoutes) {
    const payload = {reason:"Local transport verification",requestKey:"00000000-0000-0000-0000-000000000002",...(path==='emails/test'?{}:{expectedVersion:"local-version"}),...(path.startsWith("driver-applications/")?{decision:"approved",services:{ride:"approved",courier:"rejected"},vehicleCategory:"car"}:{})};
    const edit = (origin:string, cookie = cookieHeader, verb:string = method) => fetch(`${base}/api/admin/${path}`, {
      method:verb, headers:{"Content-Type":"application/json",Origin:origin,Cookie:cookie},body:JSON.stringify(payload),
    });
    assert.equal((await edit("https://other.invalid")).status,403);
    assert.equal((await edit(base, "")).status,401);
    assert.equal((await edit(base,cookieHeader,method === "PATCH" ? "POST" : "PATCH")).status,405);
    assert.equal((await edit(base)).status,200, `authorized ${path} reaches backend without obsolete settings gate`);
    assert.deepEqual(mutationRequests.at(-1),{path:`/api/admin/${path}`,method,payload});
  }
  assert.equal(mutationRequests.length,editRoutes.length,"rejected requests never reach backend");
  const loggedOut = await post("logout", {}, base, cookieHeader);
  assert.equal(loggedOut.status, 200);
  assert.ok(
    loggedOut.headers
      .getSetCookie()
      .every((cookie) => /Expires=Thu, 01 Jan 1970/i.test(cookie)),
  );
  assert.equal(logoutRequests.at(-1)?.authorization, undefined, "logout does not depend on valid access");
  const refreshOnly = "__Host-rakky-refresh=refresh-test";
  assert.equal((await post("logout", {}, base, refreshOnly)).status, 200);
  assert.equal(logoutRequests.at(-1)?.refreshToken, "refresh-test");
  assert.equal((await post("logout", {}, base, "__Host-rakky-access=expired-test; " + refreshOnly)).status, 200);
  logoutStatus = 503;
  const unconfirmed = await post("logout", {}, base, refreshOnly);
  assert.equal(unconfirmed.status, 503);
  assert.equal((await unconfirmed.json() as {locallySignedOut:boolean}).locallySignedOut, true);
  assert.ok(unconfirmed.headers.getSetCookie().every(cookie => /Expires=Thu, 01 Jan 1970/i.test(cookie)));
  logoutStatus = 200;
  meStatus = 503;
  const unavailableAfterRotation = await post("refresh", {}, base, refreshOnly);
  assert.equal(unavailableAfterRotation.status, 503);
  assert.ok(unavailableAfterRotation.headers.getSetCookie().some(cookie => cookie.startsWith("__Host-rakky-refresh=rotated-test")), "identity outage preserves the already rotated refresh credential");
  assert.equal(unavailableAfterRotation.headers.getSetCookie().some(cookie => /Expires=Thu, 01 Jan 1970/i.test(cookie)), false);
  meStatus = 200;
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
    "PASS: production fixture isolation, route guard, CSRF rejection, nonstaff rejection, secure cookies, token redaction, refresh, logout, body-only authenticated record search, server-rendered API pagination, filtered query forwarding Google browser challenge/staff session checks, and authenticated configuration/profile/schedule mutations with CSRF and method guards.",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => mock.close(() => resolve()));
}
