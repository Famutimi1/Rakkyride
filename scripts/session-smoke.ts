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
  assert.equal((await post("refresh", {}, base, cookieHeader)).status, 200);
  const loggedOut = await post("logout", {}, base, cookieHeader);
  assert.equal(loggedOut.status, 200);
  assert.ok(
    loggedOut.headers
      .getSetCookie()
      .every((cookie) => /Expires=Thu, 01 Jan 1970/i.test(cookie)),
  );
  console.log(
    "PASS: production fixture isolation, route guard, CSRF rejection, nonstaff rejection, secure cookies, token redaction, refresh, logout.",
  );
} finally {
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => mock.close(() => resolve()));
}
