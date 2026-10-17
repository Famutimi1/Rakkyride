import assert from "node:assert/strict";
import test from "node:test";
import { localLoginRedirect } from "./login-origin.ts";

test("local login uses the configured loopback origin and preserves exact CSRF checks", () => {
  const origin = "http://127.0.0.1:3015";
  assert.equal(localLoginRedirect("localhost:3015", origin, true), `${origin}/login`);
  assert.equal(localLoginRedirect("127.0.0.1:3015", origin, true), null);
  assert.equal(localLoginRedirect("localhost:3015", origin, false), null);
  for (const host of [null, "localhost:8081", "evil.example:3015", "localhost.evil.example:3015", "user@localhost:3015", "localhost:3015/path"]) {
    assert.equal(localLoginRedirect(host, origin, true), null);
  }
  for (const configured of [undefined, "invalid", "https://example.com", "http://localhost:3015/path", "http://user@127.0.0.1:3015", "http://127.0.0.1:3015?redirect=evil"]) {
    assert.equal(localLoginRedirect("localhost:3015", configured, true), null);
  }
});
