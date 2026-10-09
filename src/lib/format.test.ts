import { test } from "node:test";
import assert from "node:assert/strict";
import {
  money,
  toKobo,
  watDayRange,
  statusLabel,
  locationState,
} from "./format.ts";
test("money conversion is exact, bounded, and rejects exponent/negative/fractional kobo inputs", () => {
  assert.equal(toKobo("2500.01"), "250001");
  assert.equal(toKobo("0.10"), "10");
  for (const value of ["0", "-1", "1e3", "1.001", "Infinity", "90071992547410"])
    assert.throws(() => toKobo(value));
  assert.equal(money("900719925474099301"), "₦9,007,199,254,740,993.01");
  assert.equal(money("-105"), "−₦1.05");
});
test("Lagos day bounds use UTC+1 and reject invalid dates", () => {
  assert.deepEqual(watDayRange("2026-10-09"), {
    from: "2026-10-08T23:00:00.000Z",
    to: "2026-10-09T23:00:00.000Z",
  });
  assert.throws(() => watDayRange("2026-02-30"));
});
test("courier delivered and returned remain distinct", () => {
  assert.equal(statusLabel("completed", "courier"), "Delivered");
  assert.equal(statusLabel("returned", "courier"), "Returned");
});
test("expired coordinates cannot appear live", () => {
  const now = "2026-10-09T10:00:30Z";
  assert.equal(locationState(null, now), "unavailable");
  assert.equal(locationState("2026-10-09T10:00:00Z", now), "stale");
  assert.equal(locationState("2026-10-09T10:00:20Z", now), "fresh");
});
