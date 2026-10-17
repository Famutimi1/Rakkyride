# Rakky dashboard production readiness — 12 October 2026

**Decision: do not launch the current build into production yet.** The dashboard is a working, database-connected development build. Security and operational gaps remain in the separate Next frontend and its shared Express backend. A restricted staff pilot can be considered after the applicable security, hosting, recovery and storage gates below pass. Live financial operations need additional provider and commercial approval.

This assessment covers `/Users/mac/Desktop/rakkydashboard` and `/Users/mac/Desktop/ride_app/backend`, including shared backend behavior that affects the dashboard's trust in driver approval, sessions and financial records. It reviews the current dirty working trees, not an immutable release commit. Production infrastructure and a deployed HTTPS origin were not supplied or inspected. Configuration observations below concern local development; they are not claims about an unseen production installation.

No application source, production setting, operational account, financial record or queue history was changed for this audit. Automated tests used their disposable fixtures. Database inspection used read-only transactions. Session and socket reproductions used isolated processes, synthetic identities and mocked authentication/database responses. Routine browser session renewal and staff reads can create normal sensitive-read audit records.

## Checks that passed now

- Backend: `npm run typecheck`, `npm run build`, and **72 tests passed, zero failed or skipped**. Tests cover authorization, OTP attempts, session scope, database locks, ledger immutability/balancing, refund limits/idempotency, commission snapshots, query paging, queue recovery and incoming socket revocation.
- Dashboard: `npm run typecheck`, `npm run build`, **seven unit tests**, and `npm run test:session` passed. The production Next fixture checks secure HttpOnly cookies, CSRF denial, ordinary-user denial, disabled production previews, redacted token responses, Google nonce/staff checks, paging/filter forwarding, and guarded mutations. It uses an upstream stub; it does not prove real Google/SMS/Paystack production integration.
- Shared mobile package: `npm run typecheck` passed. Mobile release/device testing was outside this dashboard audit.
- Both packages: `npm audit --omit=dev --json` reported **zero known production dependency vulnerabilities**. This is the registry's known-advisory result at inspection time, not a complete security guarantee.
- All **22 navigation destinations** loaded authenticated real local data at the normal narrow browser width (520px) and at **375×812**. Neither sweep had document-wide horizontal overflow; every rendered mobile table retained a horizontal scroll container. Empty directories remain honest empty states. No navigation destination rendered a load-error screen or redirected to login during the page sweep.
- Local PostgreSQL has migrations **001–013** applied. Read-only checks found **zero unbalanced ledger transactions** and **zero cached balance mismatches**. Immutable triggers exist for ledger entries/transactions and the admin audit log.
- Existing protections include dedicated staff token scope, current database role/account checks, Google audience/signature/verified-email/nonce checks, exact browser Origin checks, restricted proxy paths/methods, money-action gates, audited/versioned mutations, masked directory contacts, and private document authorization/content checks.

## Confirmed code findings

### P1 — Sign-out can leave the refresh session valid

The Next logout handler only calls backend revocation when both cookies exist, ignores the upstream response status, then clears local cookies and reports success. The backend logout endpoint requires a valid access JWT. If the access token has expired, backend authentication rejects the request before refresh-token revocation; clearing browser cookies does not revoke a copied refresh token. A refresh-only cookie also skips revocation entirely.

**Reproduction:** an isolated production Next instance with an upstream fixture returning 401 from logout returned HTTP 200 `{success:true}` and cookie deletion. The fixture's retained refresh credential was then accepted by the refresh route. This demonstrates the frontend's handling of a denied revocation; the real backend's `requireAuth` wiring establishes the expired-access case. No real account/token was used.

**Required:** authenticate revocation using the refresh credential itself, preserve protection against arbitrary token revocation, and make the revocation result explicit. Test expired access, refresh-only cookies, upstream failure, normal logout and copied-token reuse. Existing access JWTs are otherwise valid until expiry because they contain no checked session identifier/version; decide and verify the required privileged-session revocation behavior.

Evidence: [Next logout](/Users/mac/Desktop/rakkydashboard/src/app/api/session/[action]/route.ts:70), [backend logout route](/Users/mac/Desktop/ride_app/backend/src/modules/auth/auth.routes.ts:23), [refresh revocation](/Users/mac/Desktop/ride_app/backend/src/modules/auth/auth.service.ts:111), [authentication](/Users/mac/Desktop/ride_app/backend/src/modules/auth/auth.middleware.ts:6).

### P1 — Idle sockets continue receiving after expiry/deactivation

Socket authentication is rechecked on incoming packets. A connected client that sends nothing stays in its rooms and can still receive server broadcasts after its token expires or account is deactivated. This affects the shared app backend; the dashboard currently uses bounded REST polling, so this is not a claimed dashboard socket integration.

**Reproduction:** against the compiled backend socket module, a synthetic one-second token and process-local database mock were used. After expiry and mocked deactivation, the socket remained connected and received a `wallet:updated` room event. The existing cross-instance test covers revoked incoming packets, which does not cover this receive-only case.

**Required:** disconnect at token expiry and propagate account/session revocation across instances, or otherwise enforce recipient authorization before delivery. Test an idle revoked connection and cross-instance revocation, including location/message delivery. Do not rely on the client voluntarily sending a packet.

Evidence: [socket authorization](/Users/mac/Desktop/ride_app/backend/src/websocket/index.ts:22), [existing socket test](/Users/mac/Desktop/ride_app/backend/src/modules/auth/socket.integration.test.ts:23).

### P1 for driver operations — Approved application details can change without review

Authenticated onboarding writes update personal, vehicle and document fields without rejecting changes to approved applications or resetting approval. An approved driver can replace the plate/vehicle/documents and remain `approved`; driver eligibility continues to use that status. The dashboard can therefore display approval beside details that staff never approved. Stale-version protection on the staff review endpoint does not protect subsequent driver edits.

**Required:** preserve the reviewed version or place material changes into a reviewed renewal flow. Define safe behavior for an active trip before changing eligibility. Verify changing an approved vehicle/document cannot silently retain authorization for the new material. This does not require inventing an admin state override.

Evidence: [personal/vehicle writes](/Users/mac/Desktop/ride_app/backend/src/modules/driver/driver.service.ts:7), [document write](/Users/mac/Desktop/ride_app/backend/src/modules/driver/driver.service.ts:30), [review version/status check](/Users/mac/Desktop/ride_app/backend/src/modules/driver/admin.service.ts:82), [driver eligibility](/Users/mac/Desktop/ride_app/backend/src/modules/auth/auth.middleware.ts:16).

### P1 for shared operational launch — HTTP readiness does not require working workers

Startup launches trip/payment workers without awaiting successful initialization and only logs their startup errors. `/api/health` always reports process uptime and `status:ok`; it does not establish database, Redis, worker or provider readiness. No backend SIGTERM/SIGINT drain handler was found. Worker stop functions exist, but startup does not wire them into shutdown.

The staff health page correctly shows richer dependency/heartbeat evidence, but that authenticated page is not a deployment readiness probe. Local workers currently have fresh heartbeats; this finding concerns failure/restart behavior.

**Required:** separate liveness from readiness; fail readiness when required dependencies/workers are unavailable; finish or safely hand off active jobs during shutdown; verify worker startup failure, Redis loss, rolling restart and recovery. A read-only dashboard pilot can use a narrower readiness policy, but it must be explicit.

Evidence: [startup](/Users/mac/Desktop/ride_app/backend/src/index.ts:14), [public health](/Users/mac/Desktop/ride_app/backend/src/routes/health.ts:5), [worker lifecycle](/Users/mac/Desktop/ride_app/backend/src/modules/payments/paymentQueue.ts:26).

### P2 — Database outages are reported as authentication failures

`requireAuth` catches JWT failures and database failures together and returns 401. A temporary PostgreSQL outage can appear to be an expired session, causing dashboard redirects and browser refresh cleanup instead of an unavailable-service state.

**Required:** distinguish invalid credentials from dependency failure; return an unavailable-service response for database/network failures and preserve the session. Verify recovery after a transient outage.

Evidence: [authentication catch](/Users/mac/Desktop/ride_app/backend/src/modules/auth/auth.middleware.ts:13).

### P2 — Complete abuse controls and privileged-read audit coverage

OTP limits are per phone; no general request/IP limits were found for public login/Google verification/refresh. The OTP cooldown uses separate Redis reads/writes, so concurrent requests can pass the initial cooldown check. A reverse proxy may provide additional limits, but none was verified. Keep body/connection limits at the edge and use atomic cooldown/rate operations; verify direct backend calls as well as Next requests.

The older `GET /api/admin/payments/users/:userId` remains callable and reads financial records without a sensitive-read audit entry in its service/route. It is not the normal dashboard detail API, but it should be audited consistently or retired if obsolete. Authentication still protects it; this is an accountability gap, not a public data leak.

Evidence: [OTP rate limit](/Users/mac/Desktop/ride_app/backend/src/modules/auth/otp.service.ts:14), [public auth routes](/Users/mac/Desktop/ride_app/backend/src/modules/auth/auth.routes.ts:5), [legacy financial read](/Users/mac/Desktop/ride_app/backend/src/modules/payments/admin.service.ts:98). The installed [Next self-hosting guide](/Users/mac/Desktop/rakkydashboard/node_modules/next/dist/docs/01-app/02-guides/self-hosting.md:15) recommends an edge proxy for connection, payload and rate limits.

## Production configuration and evidence gates

### Production HTTPS, identity and maps — not established

Local dashboard configuration points to `http://127.0.0.1:3015` and backend port 4000, with a test environment label and preview disabled. Backend `NODE_ENV` is development and Paystack uses a test key. The local JWT secret is configured with length 64; its value is not included here. No secret `.env` file was found tracked in either package's Git file inventory; tracked examples are not secrets.

JavaScript/Embed map keys and map ID are present in the dashboard. The last verified Google browser-key restriction is the local origin only; previous OAuth/Maps setup evidence is in [Maps configuration](/Users/mac/Desktop/rakkydashboard/docs/maps-configuration.md). Local map success is not production-domain verification.

**Required:** select the real hosting topology/domain, HTTPS origin, trusted backend URL, correct environment label, production-only secrets and explicit `NODE_ENV=production`. Configure exact production OAuth origins and browser-key referrers/API restrictions, then verify login, refresh, map tiles, attribution and map-error fallback on that host. Google recommends both application and API restrictions; do not remove restrictions to make production maps work. [Google Maps security guidance](https://developers.google.com/maps/api-security-best-practices).

Phone login is not production-configured locally: `TERMII_API_KEY` is absent. Development logs OTP codes; non-development correctly refuses delivery without credentials. Configure and prove real SMS delivery if phone login is part of the launch, or explicitly launch a verified Google-only staff flow. Never deploy the development OTP logging path.

The dashboard start script binds loopback, which is valid behind a proxy on the same host. It needs a deliberate override/topology if deployed in a container or platform expecting a public interface. The backend declares Node >=18, while installed Google auth requires >=22 and Redis >=20; align runtime declarations and deployment with a supported Node version satisfying both packages. This audit ran on Node 24.20.0.

Evidence: [environment defaults](/Users/mac/Desktop/ride_app/backend/src/config/env.ts:13), [OTP provider](/Users/mac/Desktop/ride_app/backend/src/modules/auth/otp.provider.termii.ts:7), [dashboard start](/Users/mac/Desktop/rakkydashboard/package.json:9), [backend engine](/Users/mac/Desktop/ride_app/backend/package.json:14).

### Durable documents, least-privilege database access and recovery — not established

Driver files are stored beneath backend `.private-uploads`. Private serving is authorized, bounded and content-checked, but files are not automatically shared between instances or preserved by an ephemeral deployment. Upload accepts declared MIME before writing; content validation occurs at staff read. Approval checks populated references, not durable file existence. Strengthen intake validation and require usable reviewed evidence.

The configured local application database role is a PostgreSQL **superuser** and owns 25 public tables. That is local development evidence. It must not be reused as the production application role: an application compromise would bypass ordinary privilege boundaries and could disable immutable protections. Separate migration ownership from runtime credentials.

Local Redis has snapshot persistence configured, append-only persistence disabled, no memory limit and `noeviction`. This is not evidence of a tested production queue-recovery strategy. DB/Redis URLs are local and lack transport TLS/auth settings appropriate to remote public services; private-network deployment details remain unknown.

No deployment/CI definition or backup/restore runbook was found in the two inspected package inventories. Existing architecture documents identify the same external prerequisites. External infrastructure could exist elsewhere; it was not verified here.

**Required:** durable private storage with controlled access and backups, a restricted production DB role, an explicit Redis durability/capacity policy, encrypted/private service access, retention, recovery targets, and a real restore drill for database plus referenced documents. Run migrations once under a controlled release job; the current runner has no cross-process migration lock. Document failed-migration/rollback handling rather than running competing migrations in every replica.

Evidence: [document storage](/Users/mac/Desktop/ride_app/backend/src/modules/driver/driver.service.ts:22), [private serving](/Users/mac/Desktop/ride_app/backend/src/modules/driver/admin.service.ts:120), [migration runner](/Users/mac/Desktop/ride_app/backend/src/shared/config/migrate.ts:12).

### Live-money and actionable monitoring — not ready

Admin money actions remain off in both frontend and backend (flags unset, default false). This is a deliberate safeguard, not a broken integration, and it does not disable all mobile payment routes. Do not enable the flags merely because the dashboard displays data.

Local provider credentials are test-mode and the callback is not a production HTTPS endpoint. This audit did not prove an actual `charge.success` webhook, real test transfer outcomes, stable callback hosting, or production provider setup. Existing rollout notes explicitly leave these external checks open. Verify successful, failed, reversed, duplicate, reordered and missed-event scenarios against Paystack test mode before separately approving live access. Paystack documents webhook retry/signature behavior and transfer outcomes: [webhooks](https://paystack.com/docs/payments/webhooks/), [managing transfers](https://paystack.com/docs/transfers/managing-transfers/).

Commercial payment limits/fees, refund authority, adjustment threshold, sweep evidence and any independent approval/step-up policy remain owner decisions. Booking-time commission was approved and implemented; that approval does not authorize all monetary operations. Wallet-credit refunds are not provider/card refunds. Sweeps are accounting postings and need external movement evidence.

`ALERT_WEBHOOK_URL` is absent locally, so financial alerts only reach logs. At approximately 07:13 WAT, the staff health page reported fresh workers and **74 retained payment-queue failures**. Read-only Redis inspection classified all 74 as **gateway-balance-check network/timeout failures**, latest approximately 06:05 WAT. Recent job successes also existed. These are not 74 failed customer payments; they do show that provider balance observation has repeatedly failed and needs diagnosis, alerting and a recovery check.

Local DB: four users, 88 trips, 22 ledger transactions and zero withdrawals. Two fulfilled cash trips lack settlement evidence. Inspect their actual history; do not invent settlement or move money solely to clear the queue. Internal balancing checks passed, but they do not reconcile balances to a bank/provider statement. The database contains development records and cannot establish production performance.

Evidence: [admin money gate](/Users/mac/Desktop/ride_app/backend/src/modules/payments/admin.routes.ts:13), [alert delivery](/Users/mac/Desktop/ride_app/backend/src/modules/payments/reconciliation.service.ts:10), [provider observation](/Users/mac/Desktop/ride_app/backend/src/modules/payments/gateway.ts:28), [payment rollout prerequisites](/Users/mac/Desktop/ride_app/docs/features/payments-ledger-rollout.md:5), [remaining decisions](/Users/mac/Desktop/rakkydashboard/docs/remaining-decisions.md).

### Release QA and security hardening — incomplete

Next supplies nosniff, frame denial, referrer and permissions headers. No application-wide CSP/HSTS is configured in Next; the private-document response has its own sandbox policy. A hosting edge can supply headers, but no production edge was inspected. Verify the final HTTPS response headers and a CSP compatible with Next, Google login and Maps before adopting enforcement. API credentials remain server-side except intended restricted public browser keys/client IDs.

No production-sized load/soak test, complete keyboard/screen-reader/200% zoom review, deployed dependency-outage drill or sustained recovery test was performed. Local responsive page sweeps are useful evidence but cannot replace these. Test realistic row counts, report aggregation/export, simultaneous polling, connection budgets, timezone/day boundaries, slow/offline UI, empty/error states, and permission changes during an active staff session. Do not cache staff HTML/API data in a public CDN.

Current source includes numerous modified and untracked implementation/migration files. Select and review a release commit containing the required sources/migrations/lockfiles, excluding credentials and private uploads. The checks above certify the inspected working tree only. Establish repeatable CI validation, migration order and a rollback/recovery procedure before release.

Evidence: [Next headers](/Users/mac/Desktop/rakkydashboard/next.config.ts:5), [local production checklist](/Users/mac/Desktop/rakkydashboard/node_modules/next/dist/docs/01-app/02-guides/production-checklist.md), [acceptance criteria](/Users/mac/Desktop/rakkydashboard/docs/admin-dashboard-implementation-spec.md:650).

## API integration and launch scope

No unimplemented sidebar destination was found in the authenticated 22-page sweep. Overview/live/trips/schedules/courier, people/drivers/applications, payments/ledger/withdrawals/reconciliation, internal care/ratings, reports/pricing/settings/audit/health/team all have real backend read paths. Empty support/safety/withdrawal/application queues do not prove populated workflows; meaningful mutation/authorization coverage comes from disposable integration tests, not changes to live local records during this audit.

Customer messaging, public safety intake, new staff provisioning, granular staff scopes and staff socket transport remain explicitly deferred under the owner's choice of existing roles/internal care workflows. They are not automatically blockers for that limited staff scope. They must not be advertised as implemented services. A live care service still needs named owners, operating hours, escalation and retention. Google account MFA/privileged step-up and emergency staff revocation should be explicit operating decisions, especially before financial authority is enabled.

The existing [admin API reference](/Users/mac/Desktop/ride_app/backend/docs/admin-api-reference.md) and [implementation/source snapshot](/Users/mac/Desktop/ride_app/backend/docs/admin-api-implementation.md) remain the endpoint/code references. This readiness document records launch work; it does not claim every endpoint or external provider was independently exercised end to end.

## Release acceptance checklist

Complete in this order, with captured staging evidence:

1. [ ] Fix logout revocation; verify expired-access and refresh-only logout and stolen-token reuse. Define privileged access-token/session revocation behavior.
2. [ ] Prevent idle revoked/expired sockets receiving events across instances; protect material changes to approved driver records before enabling driver operations.
3. [ ] Establish HTTPS hosting, production secrets/runtime/origins, exact OAuth and Maps restrictions; prove real staff login/refresh and advertised OTP delivery on that host.
4. [ ] Provision least-privilege DB/runtime access and durable private documents; restore a database backup and its referenced files in an isolated environment.
5. [ ] Establish liveness/readiness, graceful shutdown, queue recovery, alert recipients and a verified failure/restart drill; diagnose recurring balance-check timeouts.
6. [ ] Build/review an immutable release commit; run controlled migrations, CI checks, populated-record E2E, load/soak and accessibility checks. Verify final security/cache headers.
7. [ ] For a restricted staff pilot, explicitly limit scope to the approved roles/internal workflows and keep financial mutations disabled until their own gates pass.
8. [ ] Before live money, approve actual commercial rules/authority and independently prove provider webhook/transfer/callback/reconciliation flows. Investigate existing settlement exceptions using evidence. Enable money only as a separate approved rollout step.

**Sign-off remains withheld.** The technical foundation is substantial and the UI/API integration is working locally, but the confirmed defects and missing production evidence above prevent an honest production-ready claim.
