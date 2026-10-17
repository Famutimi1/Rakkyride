# Dashboard integration and data review — 11 October 2026

The dashboard already has backend read connections for all 22 navigation destinations. The remaining work is mainly operational completeness, better presentation of existing information, and a few missing API capabilities. It is not necessary to rebuild the backend integration from scratch.

## What was verified

- Traced the current dashboard page registry, client controls, Next session/proxy allowlists, Express routes, service SQL, and migrations. Reviewed checked-out files, including existing uncommitted work.
- Queried the local backend PostgreSQL database in explicit READ ONLY transactions with a five-second statement timeout. Queries returned aggregate counts and integrity results, without exposing contact details, tokens, bank details, or provider payloads.
- After the user refreshed the dedicated staff session, **all 22 navigation pages loaded successfully**. Populated list counts matched the database: trips 88, courier 3, customers 4, drivers 3, payments 28, ledger accounts 13, ratings 2 and staff 2. Representative real trip, person, driver, payment, account and linked ledger transaction details loaded. An approved application detail loaded and its authenticated private PDF reached the viewer.
- **All 22 pages were checked at 375×812px**: no document-wide horizontal overflow; populated tables remained HTML tables with their own horizontal scrolling. Overview, trips, customers, both settings pages and reports also had no document-wide overflow at 768px and 1280px. On mobile, the custom account-status dropdown fit inside the viewport, More filters changed to Hide filters, and Clear filters was visible and usable.
- API-backed customer pagination with `limit=2` showed records 1–2 of 4, then 3–4 of 4 on Next with correct disabled boundaries. Inactive filtering returned zero users, consistent with the database; Clear restored the unfiltered total and page 1 while preserving the row limit.
- Service health showed PostgreSQL/Redis reachable and five worker/provider/socket categories Unknown. Google Maps remained unconfigured. An earlier old-session redirect was resolved by the user's fresh staff login; older unscoped tokens are intentionally treated as app sessions.
- Dashboard TypeScript and backend `npm run typecheck` passed. These checks do not establish that every live endpoint or mutation succeeds.
- No application code, users, settings, trip state, payments, or ledger records were changed by this review. Protected inspections append normal audit records. Configuration, review, care and monetary mutations were not executed; full keyboard testing and workflows requiring absent records remain outstanding.

## Local database snapshot

These are development records at the time of inspection, not production performance statistics.

- Users: **4**, including **2 ordinary users and 2 super admins**. Driver profiles: **3**, all approved; **2 belong to staff accounts**.
- Trips: **88** — **78 no_drivers_found**, **6 cancelled**, **4 completed**. This includes 3 courier attempts, all no_drivers_found.
- Completed trips: **2 settled** and **2 cash trips still unpaid**, with no settlement transaction link on the unpaid pair. All completed trips have completion timestamps. Investigate provenance and settlement evidence before deciding whether a correction is needed.
- Payment intents: **28** — **12 succeeded, 14 failed, 2 abandoned**. Every succeeded intent has a ledger transaction link.
- Ledger: **13 accounts, 22 transactions, 57 entries**. Aggregate checks found **0 transactions with unequal debit/credit totals** and **0 account balances inconsistent with postings**. This is a consistency check, not an external provider or bank reconciliation.
- Trip history: **194 state events, 14 matching offers, 23 historical location samples, 2 ratings**.
- Support cases, safety incidents, care activity, payout accounts and withdrawals: **0 records each**. Empty pages are valid for these datasets.
- Webhook events: **2**, both ignored `test.rakkyride` events. This does not establish delivery of real Paystack events.
- Fare configurations: **2**; support-settings records: **1**. Audit records: **46** at the inspection snapshot; sensitive reads and later sign-ins may increase this count.
- Latest completed trip: **5 October 2026**. The Overview’s zero completed trips for 11 October is consistent with the selected day, rather than proof of an integration failure.

## Page and API coverage

“Connected” below means a frontend call exists and maps to an implemented backend route. All navigation-page reads were also exercised with a fresh staff session; this does not establish that every detail endpoint, permission combination or mutation succeeds. Next server-side reads use `adminRead`; the browser proxy intentionally exposes a narrower set of GET routes for interactive controls.

1. **Overview** → `GET /api/admin/overview`, `GET /api/admin/trips?mode=live`, plus environment. Connected. Add demand failures, payment exceptions, open support work, and useful trend comparisons. The hourly table currently creates generic Actions for aggregate rows.
2. **Live operations** → `GET /api/admin/live` and filtered trips. Connected; visible-page REST polling runs every 15 seconds. Google Maps setup and authorized staff Socket.io subscriptions remain incomplete.
3. **All trips** → list/detail/location endpoints. Connected, including history, offers, ratings, ledger and linked support context. Add usable server-backed sort controls; real-mode sorting is currently disabled in the table.
4. **Scheduled rides** → trips with scheduled/upcoming/history modes; `POST /trips/:id/schedule` for super-admin rescheduling/cancellation before dispatch. Connected. No current schedules exist to exercise the control against real records.
5. **Courier deliveries** → courier-filtered trips/detail. Connected, with delivery/return and attempt evidence. Recovery overrides and lost-parcel handling are policy-dependent capabilities, not missing connections to an existing endpoint.
6. **Riders & customers** → `/users`, `/users/:id`, linked trips/accounts; super-admin `PATCH /users/:id`. Connected. The directory currently includes staff identities, so its label and counts are misleading unless it distinguishes them.
7. **Drivers** → `/drivers`, detail/history/accounts. Connected. Availability is hardcoded `unknown` in the person projection; it is not populated from the existing Redis evidence. Add last-seen, online/busy/eligibility evidence and a link to the full application/document review.
8. **Applications** → `/driver-applications`, private document reads and `/review`. Connected, with approval/rejection, optimistic versions and audited decisions. Local private document storage still needs a durable multi-instance storage decision.
9. **Payments** → `/payment-intents`, detail, linked ledger and bounded webhook history. Connected. There is no retained provider-status observation; internal success and provider evidence must remain distinguishable. Add failure/status summary and a webhook investigation view.
10. **Wallets & ledger** → `/accounts`, account entries and `/transactions/:id`. Connected. Refund/adjustment/freeze controls exist but dashboard monetary mutations are rollout-gated. The explanatory panel still describes some completed investigation work as unfinished.
11. **Withdrawals** → list/detail. Connected; currently empty because PostgreSQL has no withdrawals. Add masked payout setup/status context to driver profiles; there is no standalone admin payout-account directory yet.
12. **Reconciliation** → summary and `/:kind` queues for topups, withdrawals and escrow. Connected but incomplete: **Unprocessed webhooks** has a count without a drill-down queue/API, and completed-but-unpaid trips are not a queue. External provider balances and last reconciliation success are not observed.
13. **Support cases** → staff list/detail/create/activity. Connected, with internal notes, assignment and transitions. The mobile app reads `/api/care/settings` and opens call/email apps, but does not submit or track cases through a customer intake API.
14. **Safety incidents** → staff list/detail/create/activity, super-admin only. Connected for internal records. Customer SOS intake, staffed response, evidence retention and dispatch policy remain unimplemented.
15. **Ratings & feedback** → `/ratings` and linked trips. Connected. Add rating thresholds, date/person filters and low-rating follow-up rather than only exact rating IDs/service filtering.
16. **Reports** → `/reports` and CSV export. Connected and date-scoped. Expand existing-data reports to completion/no-driver/cancellation rates, request-to-assignment durations, payment failures and rating summaries. Keep courier returns, top-ups, settled fares and ledger postings separate.
17. **Pricing** → `/pricing`, super-admin `PATCH /pricing/:vehicleType`. Connected and editable. Commission still comes from current configuration at completion; a change can affect already-booked/unsettled trips. Resolve that policy before production editing.
18. **Payment settings** → `/payments/settings` GET/PATCH. Connected and super-admin editable. Commercial production values and monetary authority still require explicit operational decisions.
19. **Support settings** → `/support-settings` GET/PATCH. Connected and super-admin editable; the app reads the shared `/care/settings` route. Publishing contact information is distinct from implementing in-app case messaging.
20. **Audit log** → `/audit`. Connected but the UI shows only actor/action/reason/time/transaction. Show target/object, request key, before/after values and clickable transaction/object context. Action options omit newer person/pricing/schedule/support-settings/staff-login events.
21. **Service health** → `/health`. Connected. PostgreSQL/Redis are point checks; Trip worker, Payment worker, Reconciliation, Paystack and Staff sockets are explicitly unobserved. Show heartbeat age, queue lag, last success/failure and provider observation time when instrumented.
22. **Team access** → `/team`. Connected, super-admin-only read directory. There are no provisioning, role-scope, session revocation or controlled deactivation APIs. Those require an owner-approved access model.

**Shared capabilities:** workspace search uses audited `POST /api/admin/search` with masked results. `GET /api/admin/environment` supplies the configured provider/runtime mode. Improve page-level name/reference search through the existing search capability instead of requiring operators to paste UUIDs. These are cross-page capabilities, not separate navigation destinations.

## Existing APIs without a dedicated dashboard consumer

- **`GET /api/admin/payments/users/:userId`** exists but the dashboard does not call it. It returns an older bounded combined finance inspection. Current person/account/payment pages already cover overlapping information. Prefer a paginated customer finance tab with explicit scope rather than adding a duplicate screen solely to consume this endpoint.
- **`POST /api/admin/payments/sweeps`** exists but is not exposed in the dashboard proxy or UI. This is intentional while sweep evidence, duplicate-movement handling and monetary authority are unresolved. It should not be enabled as a generic table action.
- The money mutation endpoints are implemented and UI controls call their allowed paths, but `ENABLE_ADMIN_MONEY_ACTIONS` prevents dashboard execution. This frontend rollout gate does not disable the existing protected Express routes. Any production rollout restriction should also be enforced by the backend.

## Recommended implementation order

### First: correctness and investigation coverage

1. Add completed-but-unpaid/missing-settlement exception evidence and inspect the two local cash records. Do not automatically mark them paid or edit ledger history. `refundEligibility` and `refundTrip` currently require a completed trip and cap against fare/prior credits; they do not verify settled collection evidence. Define the cash/wallet refund policy and enforce it server-side before enabling refunds.
2. Resolve commission changes for existing trips: either explicitly retain current-at-completion semantics and make that consequence visible in confirmation, or approve a booking-time commission snapshot/effective-date model. Fare cache revisions already exist; they do not freeze completion-time commission.
3. Add a safe paginated webhook exception endpoint and drill-down, with status, event type, reference, received/processed time and sanitized failure reason. Do not display unrestricted payloads or invent a retry action without duplicate-processing protection.
4. Instrument existing trip/payment workers and reconciliation jobs, then display heartbeat age, queue depth/lag and last success/error. A PostgreSQL ping does not establish worker health.

### Next: expose data already available

5. Expand the audit response/UI with sanitized before/after context, target and request key. Several writes store changes in `metadata`, while the current read selects only `before_version`/`after_version`; map the actual storage consistently rather than showing null comparisons. Add actor/action/target/date filters and record links.
6. Populate driver availability from Redis, retaining explicit unknown/stale states and last observation time. Add rejection/eligibility reasons, current trip and masked payout readiness where authorized. Show staff role badges or customer-only filtering so two staff driver profiles do not silently inflate a customer fleet view.
7. Configure the browser-restricted Maps key and map ID, then verify map loading, trip routes, fleet markers and stale-location behavior. Current data lists should remain usable when Maps is unavailable.
8. Add overview/report summaries derived from existing trips, offers, ratings and intent states. In this local snapshot 78/88 trips ended without a driver and 14/28 intents failed. These are useful investigation signals, not production conversion estimates. More detailed supply funnels/online-hours need retained telemetry that does not currently exist.

### Then: complete workflows and usability

9. Reuse staff search for page-level person/name/plate/reference discovery. Keep precise ID filters available, show active filter chips/count, and auto-expand the filter area when a URL already has active filters. Real trip sorting requires an explicitly supported backend sort query.
10. Make Actions contextual: View trip, Open ledger transaction, Review application, Edit approved configuration, or Create linked case. Generic “View details” currently repeats rendered cells on finance/audit/report/health rows. Aggregate/hourly rows should offer a meaningful drill-down or omit Actions. Mobile horizontal tables already work in the 375px checks; consider sticky identifier/action columns and a visible scroll hint. Extend keyboard focus and modal testing across screen sizes; the tested mobile dropdown remained inside the viewport.
11. Complete the care workflow only after choosing intake/reply delivery, staff response commitments and retention. Add customer-created case/list/detail routes, link trips/users, and record actual delivery state; calls/emails and internal notes must not be presented as tracked in-app conversations.
12. Implement team provisioning/scopes/revocation and step-up after the access model is approved. Live staff Socket.io subscriptions should use those scopes; retain REST polling until authorization is implemented. Add approvals for sensitive actions only where the selected operational policy requires them.

## Documentation and verification follow-up

- The backend `admin-api-implementation.md` source checksums matched all listed source files at the check. Keep using the existing generator after source changes.
- Dashboard `src/contracts/admin.ts` routeInventory still labels pricing read-only and omits some newer mutation/support-settings routes; update the inventory to match current code.
- `docs/remaining-decisions.md` still describes the old mobile support placeholder, although shared support contact settings now load through `careService`. Document that contact settings are integrated while customer case intake/replies remain absent.
- Navigation reads, representative real details, customer pagination/filter transitions and responsive tables passed the checks above. Next, exercise permission variants and absent support/safety/withdrawal/scheduled workflows in disposable test data. Validate exports and mutations separately rather than changing commercial settings or creating payments in the user database to populate this review.

## Supporting code

- [Page registry and primary screens](../src/app/admin/[[...segments]]/page.tsx)
- [Care/reports/pricing/team/health screens](../src/components/extended-pages.tsx)
- [Server reads and staff identity checks](../src/lib/server.ts)
- [Interactive API allowlist and monetary gate](../src/app/api/admin/[...path]/route.ts)
- [Reusable tables](../src/components/ui/data-table.tsx), [row actions](../src/components/ui/row-actions.tsx), [search/filter bar](../src/components/ui/search-filter-bar.tsx)
- [Backend API reference](/Users/mac/Desktop/ride_app/backend/docs/admin-api-reference.md)
- [People and health projections](/Users/mac/Desktop/ride_app/backend/src/modules/auth/admin.service.ts:30)
- [Reconciliation and audit projections](/Users/mac/Desktop/ride_app/backend/src/modules/payments/dashboard.service.ts:216)
- [Refund eligibility](/Users/mac/Desktop/ride_app/backend/src/modules/payments/dashboard.service.ts:353), [refund mutation](/Users/mac/Desktop/ride_app/backend/src/modules/payments/admin.service.ts:15)
- [Completion-time commission](/Users/mac/Desktop/ride_app/backend/src/modules/trips/trips.service.ts:354)
- [Dedicated staff session migration behavior](/Users/mac/Desktop/ride_app/backend/src/modules/auth/jwt.service.ts:20)
- [Mobile support settings integration](/Users/mac/Desktop/ride_app/mobile/src/services/careService.ts)
