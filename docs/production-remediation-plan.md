# Rakky dashboard production remediation plan

Prepared 12 October 2026 from the [production readiness audit](/Users/mac/Desktop/rakkydashboard/docs/production-readiness-2026-10-12.md). This is the implementation and verification plan; no item becomes complete merely because it appears here. Production sign-off remains withheld until the required evidence is recorded.

## Outcome and constraints

Deliver a production-ready staff dashboard at `/Users/mac/Desktop/rakkydashboard`, connected to the existing shared backend at `/Users/mac/Desktop/ride_app/backend`. Preserve TypeScript, Express, raw PostgreSQL, Redis, Socket.io and the approved Redis adapter. Keep existing admin/super_admin roles, HttpOnly browser cookies, internal care workflows and booking-time commission. Changes to shared authentication, drivers, workers or money must preserve mobile compatibility and existing state-machine/ledger guarantees.

All audit findings are assigned below. First close code defects, then prove staging operations, then approve a restricted production staff pilot. Live-money authority has a separate release gate. Dashboard readiness does not certify every unrelated mobile feature or app-store release.

No new database table, dependency, hosted service or security-access expansion is approved by this planning document. Use existing mechanisms where they meet the requirement. Any necessary session-schema extension, storage service or infrastructure choice must be proposed concretely before implementation, following the existing project rules. Domain-owned backend placement was already approved; preserve it.

## Decisions and ownership

The implementation owner handles code, migrations, tests, API documentation and deployment/runbook preparation. The project owner supplies or approves the production domain/hosting, provider access, storage/retention, commercial authority, staff security policy, recovery objectives and operating contacts. One named release owner must verify every gate; do not assume a support or finance team exists.

Resolve these decisions before their dependent work; they do not prevent preparing earlier code fixes:

- **Deployment:** actual dashboard/API domains, hosting topology, environments, approved infrastructure and operating budget. Use a separate staging environment and data/services isolated from production.
- **Session policy:** recommended server-checkable session revocation for both HTTP and sockets, an explicit maximum staff session age, and a revocation deadline. Recommended acceptance: deny a revoked session on its next HTTP request; disconnect sockets at JWT expiry and propagate account/session revocation across instances within an approved bound, proposed five seconds. Choose MFA/step-up and any independent approval requirement before financial authority. Existing roles remain unchanged.
- **Driver changes:** recommended initial production rule is to reject direct edits to approved vehicle/identity/documents and reject material changes during an active trip. A later reviewed renewal flow can retain the last approved version until a replacement is accepted; that is separate model/UX work. Do not silently reset or approve active-driver material.
- **Storage and recovery:** durable private-document storage or an approved persistent/shared volume; restricted access, encryption, retention, backup frequency, acceptable data loss (RPO) and restoration time (RTO). A single-host persistent volume is only valid for a deliberately single-host deployment with tested restore; it does not establish multi-instance file availability.
- **Operations:** alert destination and recipients, support hours, incident escalation, emergency staff revocation and provider/finance exception owners. Customer messaging/public safety intake remains outside the approved internal-care scope.
- **Money:** actual limits/fees, wallet-credit refund authority, adjustment thresholds, bank-movement evidence for sweeps, and any dual approval/step-up rule. Existing pricing snapshot approval does not settle these decisions.

## Phase 0 — Establish a reproducible baseline

**Depends on:** nothing. **Owner:** implementation owner. **Output:** reviewed source inventory and isolated test setup.

1. Record the dashboard and backend working-tree versions, required migrations and lockfiles. Preserve unrelated user work and ignored credentials/private files; do not blindly commit all changed files.
2. Identify the intended release paths and compatibility requirements across the two repositories and mobile clients. Re-run the audit's build/typecheck/test baseline after changes begin.
3. Ensure integration tests use disposable PostgreSQL schemas/databases and isolated Redis namespaces. Add a guard preventing test execution against a configured live payment mode or production data. Keep provider mutations mocked except explicitly controlled test-mode E2E.
4. Prepare a readiness evidence log linking each finding, implementation change, test result, staging result and owner decision. Report historical counts as dated observations, not current predictions.

**Pass when:** a clean checkout can install from lockfiles and reproduce the baseline under a documented runtime; tests cannot operate on production data. Backend test setup includes the existing mobile Socket.io client dependency used by its integration test.

## Phase 1 — Repair sessions, revocation and authentication failure handling

**Depends on:** Phase 0; session-policy approval before introducing a new session model/schema. **Owner:** implementation owner. **Closes:** logout, access-session revocation, idle socket delivery, auth-outage misclassification.

1. Implement refresh-credential-authenticated logout in the auth service. Hash and look up the presented refresh token, lock the relevant record/family, and revoke only the session it proves ownership of. Do not accept a client-supplied user ID as revocation authority. Return an idempotent safe response for an already revoked/unknown credential without revealing identities.
2. Update Next logout to work with refresh-only cookies and expired access. Always remove browser credentials, but distinguish local sign-out from confirmed server revocation when the backend is unavailable. Offer safe retry of pending revocation if that is part of the agreed design; never leave a privileged cookie behind merely to obtain a successful response. Document the behavior accurately.
3. Bind access JWTs to a server-checkable session identity. Prefer extending the existing `refresh_tokens` mechanism over adding a separate session table. A stable family/identifier, absolute staff-session expiry and efficient indexes may require an explicit migration proposal. Define rotation/reuse behavior so legitimate concurrent refreshes do not unpredictably destroy mobile or staff sessions.
4. Verify current account, staff role, session scope, session validity and absolute expiry for privileged requests. Deny revoked credentials without waiting for the access JWT's natural expiry. Define a bounded transition for older tokens; require fresh staff sign-in and do not introduce indefinite legacy bypasses.
5. Schedule socket disconnection at verified token expiry. On account/session revocation, disconnect the affected sessions on all API instances through the existing Redis adapter and named rooms; use constants for events. Add a bounded authoritative recheck/recovery mechanism so a missed revocation notification is not permanent. Define behavior if Redis or the revocation store is unavailable.
6. Separate authentication errors from PostgreSQL/Redis/network failures. Use 401/403 for invalid/forbidden credentials and an unavailable-service response for dependency failure; Next should retain renewable session state on a transient outage.
7. Verify mobile token refresh/reconnect and staff browser renewal against the new session behavior. Keep browser tokens HttpOnly, Secure and SameSite Strict in production, with exact Origin checks.

**Required regression tests:** normal and duplicate logout; expired/missing access; refresh-only logout; copied refresh/access after logout; logout during outage; refresh rotation/races/reuse; logout-all; demotion/deactivation; app tokens denied staff APIs; legacy migration; DB outage then recovery; idle expired/revoked sockets receiving no further events after the agreed cutoff; cross-instance revocation and reconnect.

**Pass when:** the audit's two security reproductions no longer succeed, session revocation meets the agreed HTTP/socket policy, and mobile/staff authentication regression tests pass. A front-end stub alone is insufficient; verify persisted revocation with disposable real PostgreSQL and real isolated Redis.

## Phase 2 — Protect driver approval and document evidence

**Depends on:** Phase 0; driver-change policy. Storage work depends on Phase 4. **Owner:** implementation owner. **Closes:** approved-material changes, invalid/missing approval evidence.

1. Inventory every material write path, including onboarding, account-profile updates and staff profile edits. Lock the profile and relevant user/trip records in a consistent order when applying those writes and staff review. Enforce the approved-state rule on the backend, including direct API calls; hide or explain unavailable edits in mobile UI. Define which contact-only edits are safe without re-review rather than treating every field as interchangeable.
2. For the initial recommended rule, reject direct changes to approved material with a clear review-required error. Allow legitimate first onboarding/rejected resubmission; retain optimistic review versions and audited decisions. Block material edits during active trips rather than changing eligibility mid-journey.
3. Validate file signatures, detected MIME, byte limits and safe server-generated extensions before accepting uploads. Bound request/file counts and storage use. Do not trust the supplied MIME or original filename.
4. Require every required document to exist, belong to the applicant, be readable and pass content validation before approval. Ensure staff inspect the same version that the review operation approves.
5. Keep private serving authorized/audited, preserve the sandbox/content headers, and remove sensitive file paths/contacts from broad exports. Define staged-file cleanup and retention before deleting files.
6. If a reviewed renewal flow is selected, first document its reviewed/pending material, expiry and eligibility rules and any necessary schema; implement it only after that model is approved.

**Required tests:** approved-driver vehicle/document replacement; active-trip editing; rejected resubmission; concurrent edit/review; stale review; missing file; MIME spoofing; unsafe filename/path; cross-user document access; file/version replacement after review starts.

**Pass when:** no dispatch-eligible approval can describe unreviewed replacement material, and complete validated documents remain available after deployment/restart. A simulated file reference is not sufficient evidence.

## Phase 3 — Make workers, probes and recovery reliable

**Depends on:** Phase 0; Phase 1 for shared revocation health. **Owner:** implementation owner. **Closes:** false readiness, abrupt shutdown, unobserved worker/provider failures.

1. Preserve `/api/health` as a documented liveness check or expose an explicit liveness route. Add a separate bounded readiness check for required PostgreSQL, Redis and initialized workers. Return minimal public status; keep detailed diagnostics behind staff authorization.
2. Await required worker initialization or hold readiness false until initialization completes. Treat missing required worker configuration as a startup/configuration failure. Distinguish worker failure from a temporary external Paystack outage; a provider outage should not trigger endless whole-server restart loops.
3. Handle SIGTERM/SIGINT: become unready, stop new work/HTTP acceptance, drain requests and in-flight jobs within the deployment's grace period, close workers/queues/sockets/pool/Redis, then exit. Ensure interrupted jobs can be recovered idempotently.
4. Verify Redis adapter recovery, trip-job recovery and webhook/payout reconciliation when jobs are delayed, missing or interrupted. Monitor waiting age and recent failure rate separately from retained historical failures.
5. Investigate the dated 74 provider balance-check network/timeout failures using redacted request/error categories, DNS/connectivity/TLS checks, provider response status and bounded retry behavior. Verify successful new observations and correct stale/unknown UI. Retain history until an explicit retention policy permits cleanup.
6. Configure structured, redacted logs, request/job correlation, thresholds and an approved alert destination. Test delivery for worker death, dependency loss, queue backlog, ledger mismatch, stale provider observation and reconciliation exceptions. Do not transmit contacts, secrets or raw provider payloads in alerts.

**Required tests/drills:** worker startup failure; DB/Redis loss and recovery; SIGTERM during HTTP/job work; restart with pending withdrawal/webhook; duplicate/reordered jobs; two-instance room delivery/revocation; stale heartbeat; failing provider without misleading zeros; alert delivery and recovery notice.

**Pass when:** a failed required worker cannot appear deployment-ready, graceful restart loses no committed work, reconciliation recovers interrupted work without duplicate postings, and an assigned operator receives a tested actionable alert.

## Phase 4 — Prepare production infrastructure, storage and identity

**Depends on:** approved hosting/domains/storage/RPO/RTO and operator access; Phases 1–3 for deployment validation. **Owner:** implementation owner prepares; project/infrastructure owner provisions and approves access.

1. Create isolated staging and production configurations. Pin a supported Node runtime satisfying both packages; reconcile backend `>=18` with installed dependencies requiring newer Node. Use production builds and explicit `NODE_ENV=production`, with preview disabled and accurate test/live labels.
2. Configure HTTPS and the intended proxy/platform topology. Parameterize address/port where the host requires it; loopback is valid only behind an appropriate same-host proxy. Keep backend/DB/Redis exposure deliberately scoped.
3. Validate required environment fields at startup without printing values. Use protected secrets; production must reject the known development JWT fallback. Document credential rotation and recovery.
4. Configure exact production and staging Google OAuth origins and separately restricted Maps browser keys/API restrictions/map ID. Keep backend Maps keys separate. Test sign-in, renewal, tiles/attribution and failure fallback on the actual HTTPS host.
5. Configure and verify Termii SMS if phone login is retained. Development OTP logs must never run in production. If Google-only staff login is chosen, make the unavailable phone flow explicit without breaking mobile authentication requirements.
6. Create separate restricted runtime and migration database roles. Runtime must not be superuser, own the protected tables or disable immutable triggers. Prove necessary transactions work and forbidden DDL/ledger/audit edits do not. Budget database connections across replicas/workers.
7. Provision private/durable document storage. Migrate references only after verified copying, ownership/checksum checks and backup. Preserve access/audit behavior. Verify files from every deployed backend instance and after instance replacement.
8. Configure DB/Redis private connectivity, authentication/TLS where applicable, Redis persistence/noeviction/capacity policy, backup retention and access. Restore PostgreSQL and referenced files into an isolated environment; measure achieved RPO/RTO against the approved targets.
9. Configure edge payload/connection/rate limits, precise trusted-proxy handling and HTTPS security headers. Start CSP in a reviewed/reporting mode if needed, then enforce after Next/Google/Maps compatibility passes. Verify HSTS policy on the final host. Prevent public CDN caching of staff HTML/API/private files.

**Pass when:** real staging identity/Maps/SMS paths work, credentials and private data have verified boundaries, multi-instance documents are available as claimed, and a documented restore drill meets the approved recovery targets. Local `.env` success cannot satisfy this gate.

## Phase 5 — Finish abuse controls, auditing and repeatable releases

**Depends on:** Phases 1–4. **Owner:** implementation owner. **Closes:** OTP races, missing public-route limits, legacy read auditing, release/migration gaps.

1. Make OTP cooldown/rate checks atomic using existing Redis operations/Lua. Add per-account/phone and appropriately scoped IP/request limits to login, Google verification, refresh and other costly public paths. Do not trust arbitrary forwarded-IP headers. Keep limits usable for shared networks and ordinary mobile refresh.
2. Add consistent staff-read audit coverage to the legacy financial inspection endpoint, or retire it after consumer discovery and documented compatibility handling. Verify private-document/export/financial reads and all privileged mutations record safe actor/target/action/version evidence without raw sensitive metadata.
3. Add a controlled migration lock and one release migration job, with failure visibility, backup prerequisites and compatible deployment order. Do not start a replica fleet running competing migrations. Separate runtime access from migration permissions.
4. Establish CI for both packages: locked installs, runtime/version checks, typechecks, production builds, meaningful integration tests, isolated session smoke, dependency audits and release artifact checks. Add compiled-backend startup and socket/worker checks so production execution is exercised.
5. Produce an immutable release candidate for each repository and record the coordinated versions/migration set. Scan the staged artifact for credentials/private uploads. Review changed paths without absorbing unrelated user work.
6. Update the admin API reference and implementation snapshot for every new/changed endpoint, permission, payload, error, rate limit and idempotency/revocation rule. Add deployment, migration, backup/restore, incident and rollback runbooks.

**Pass when:** a clean CI run reproduces the candidate, concurrent migrations are controlled, sensitive reads are auditable, abuse checks resist concurrent/direct calls, and documented release/rollback procedures work in staging.

## Phase 6 — Prove financial integration and approve authority

**Depends on:** stable staging HTTPS, Phases 1–5, commercial decisions and permitted provider test access. **Owner:** implementation owner verifies technical behavior; project/finance owner approves authority and controlled transactions.

1. Keep admin money actions off until policy and evidence gates pass. Remember this flag does not gate all mobile payment routes: isolate staging credentials/data and separately control live mobile payment rollout.
2. Configure stable Paystack test callbacks/webhooks. Exercise a real test-mode charge-success notification, verification, exactly-once ledger posting, duplicate/reordered delivery, missed webhook and reconciliation fallback.
3. Exercise supported test transfer pending/processing/success/failed/reversed/timeout behavior, provider initiation uncertainty and repeat delivery. Verify ledger reservation/reversal and provider evidence without an admin UI-only mark-paid path.
4. Reconcile test statements/provider balances to the ledger, including fees and in-transit amounts. Diagnose existing balance-check failures; do not treat the last reachable API request as financial reconciliation.
5. Investigate the two dated cash-trip settlement exceptions. Document whether they are legacy development data, legitimate zero-commission cases or real faults. Any necessary correction must be justified and append-only; never fabricate historical settlement or edit ledger/audit rows.
6. Encode approved production commercial values and monetary authority. Wallet credits must be labeled as wallet credits, provider refunds remain separate scope, cumulative refunds remain bounded, and sweeps require proof of the external bank movement. Implement the selected approval/step-up rule before enabling relevant actions.
7. Verify production callback/webhook configuration and provider permissions with owner-controlled access. Changing access, entering credentials or initiating consequential financial actions remains an explicit rollout step; this plan does not perform them.

**Pass when:** captured external test-mode evidence and internal concurrency/idempotency tests agree, reconciliation exceptions have documented dispositions, approved commercial rules are applied, and the owner signs off on each monetary operation. No real funds are used as automated UI test fixtures.

## Phase 7 — Run release QA and a staged launch

**Depends on:** Phases 1–5 for a restricted staff pilot; Phase 6 for live financial authority. **Owner:** implementation/release owner, with project-owner sign-off.

1. Recheck all 22 pages with populated representative records under ordinary, admin and super_admin identities. Exercise direct API authorization, table actions, paging/search/filter/sort, exports, settings conflicts/retries, notes/case persistence and permission changes mid-session.
2. Verify 375px mobile, tablet and desktop layouts, table scrolling, keyboard-only controls/focus, screen readers, light/dark/system themes, 200% zoom, slow/offline API states, and Google/Maps failures. No fabricated zeros or success messages may conceal missing data/delivery.
3. Agree a realistic load profile from expected staff, mobile traffic and data growth; seed only isolated staging fixtures. Measure p95 latency, errors, report/export behavior, polling load, memory and DB/Redis connection budgets. Test sustained load and recovery. Record accepted performance targets before the run; do not claim capacity from the tiny local database.
4. Rehearse production-style deployment, controlled migration, dependency failure, worker restart, backup restore and compatible application rollback. Forward-fix irreversible migrations; never restore a stale financial database over accepted transactions to undo an application deployment.
5. Deploy the reviewed candidate to the approved production host only after the applicable gates pass. Verify HTTPS auth/cookies/headers/cache behavior, Maps, probes, jobs, alerts and document access there.
6. Begin a restricted staff pilot with defined operators, approved roles/internal workflows and admin monetary mutations disabled. Establish a watched observation period and explicit exit conditions from the agreed traffic and operating hours; do not equate low/no traffic with success.
7. Enable approved live-money capabilities as a separate controlled rollout after Phase 6 and production configuration verification. Start with the approved limits and monitoring; retain a clear kill switch. If a gate fails, stop expansion and record/repair the failure before repeating it.

**Pass when:** the evidence register has no unresolved required finding, all agreed tests/drills/operating policies pass, and the release owner approves the exact build/configuration/scope. Production readiness is a property of that verified deployment, not of a passing local build.

## Required deliverables

- Reviewed fixes and any explicitly approved migrations, with mobile compatibility notes.
- Regression coverage for every confirmed defect and concurrency/failure case.
- Staging/production configuration checklist with secret names only.
- Deployment/CI/migration/rollback runbook and pinned release versions.
- Private-storage migration and database/document backup/restore evidence.
- Monitoring/alert/escalation runbook and successful failure/recovery drill.
- Provider webhook/transfer/reconciliation evidence and approved commercial values.
- Updated admin API reference/source snapshot and a final readiness report with all gates marked by evidence.

## Coverage of the audit

- Logout and HTTP session revocation → Phase 1.
- Idle expired/deactivated socket delivery → Phase 1; two-instance recovery in Phase 3.
- Approved driver edits and document integrity → Phase 2; durable storage in Phase 4.
- Worker readiness and graceful shutdown → Phase 3.
- Auth outages returned as 401 → Phase 1.
- OTP race/public abuse controls and legacy read auditing → Phase 5.
- HTTPS/OAuth/Maps/SMS/environment/runtime/loopback topology → Phase 4.
- Superuser runtime DB, private connectivity, Redis persistence and restore → Phase 4.
- Balance-check failures and log-only alerts → Phase 3; external finance proof in Phase 6.
- Provider checks, settlement exceptions and commercial money authority → Phase 6.
- Dirty release files, CI and migration concurrency → Phases 0 and 5.
- CSP/HSTS/cache, scale, accessibility and deployed failure QA → Phases 4 and 7.
- Existing internal-care scope and operating responsibilities → owner decisions and Phase 7; deferred customer services remain unadvertised.

## Execution order and planning status

Start with Phase 0, then Phase 1. Driver-integrity and worker repairs can follow without purchasing infrastructure. Resolve hosting/storage/security/commercial decisions while those repairs are prepared. Infrastructure and provider durations depend on credentials, provisioning and external verification; there is no honest fixed launch date yet.

This request creates the plan only. It does not mark fixes implemented, authorize new infrastructure or monetary powers, or change the current production-readiness decision. Reassess after the evidence gates pass.

## Implementation started — 12 October 2026

The owner subsequently authorized implementation, approved stable session families/original sign-in timestamps with a 12-hour staff limit and fresh staff sign-in at rollout, and approved blocking unreviewed material changes for approved drivers/active trips. The first repair batch is implemented and locally verified. Track completed work, evidence and remaining deployment/provider gates in [remediation progress](/Users/mac/Desktop/rakkydashboard/docs/production-remediation-progress.md). Production sign-off remains pending.
