# Remaining implementation decisions

## Approved and implemented

Separate Next frontend; one existing Express backend; current schema/status baseline; domain-owned admin services; existing staff OTP accounts; HttpOnly browser sessions; support/safety/activity records; audit expansion and immutability; official Socket.io Redis adapter. Migration 010 is applied to local development PostgreSQL, with no production deployment. The owner subsequently requested super-admin configuration editing and table actions; payment settings, pricing, customer name/status, and pre-dispatch scheduled cancellation/rescheduling are implemented with audit, version and retry controls.

## Configuration needed for verification

Local Maps is configured with a separate HTTP-referrer-restricted browser key for 127.0.0.1:3015, JavaScript/Embed API restrictions, both APIs enabled, and a project-owned JavaScript vector map ID. Production origin/key restrictions remain deployment configuration. Configure production HTTPS origin and an accurate test/live label. Existing staff accounts need an owner-controlled provisioning/runbook; no new privileged account has been created by this build.

## Staff permissions and privileged actions

Choose initial owner provisioning, permitted operations/support/finance/safety scopes, revocation, step-up method and maximum privileged session age. The current implementation uses admin/super_admin roles; safety/team are super_admin-only. The owner selected retaining existing admin/super_admin roles and internal care workflows. No staff provisioning or role grants are introduced. Bounded REST polling remains the dashboard transport.

On 12 October the owner approved session families and original sign-in timestamps on existing refresh records, a fixed 12-hour staff limit and fresh staff sign-in at migration rollout. Migration 014 and HTTP/socket revocation are implemented locally. Maximum staff age is decided; step-up/independent money approval and emergency operating ownership remain open. The owner also approved blocking direct reviewed-driver material edits and material edits during active trips; the reviewed renewal flow remains future scope.

## Commercial and money authority

Approve actual payment limits/fees, cash-debt policy, adjustment threshold, wallet-credit refund authority and any independent approval requirement. The money-action flag remains off. Configuration editing is enabled for super_admin at the owner's request, with before/after confirmation, optimistic versions and exact-payload retry checks. Confirm production commercial values before rollout; no live setting was changed by this implementation. Accounting sweeps need evidence and duplicate-movement policy. Provider refunds are separate scope.

Returned-courier refund eligibility, lost parcel escalation and exhausted handoff-code recovery need approved policies. Current returned fares remain distinct from delivered parcels; no surcharge or recovery override is invented.

## Care operating model

Name staff owners, operating hours, severity/escalation rules, response SLAs, customer contact/reply delivery channel and retention. Internal records, assignment, transitions and notes are persisted. No customer message is reported as sent. Customer safety intake must wait for a staffed response policy. Attachments/evidence storage and retention are disabled. Mobile support reads the shared contact settings and opens call/email links; it does not create cases or deliver tracked staff replies.

## Documents and interventions

Choose shared durable private-document storage for multiple backend instances and any document expiry/verification model. Local private serving is protected and audited but is not shared storage. Choose staff cancellation/reassignment powers and actor attribution, plus account/driver restriction behavior during active rides/returns. Pre-dispatch passenger schedules support audited super-admin rescheduling/cancellation; cancellation attributes the staff ID as a system action under the existing schema. Customer name/status edits cannot deactivate a scheduled/active trip account or change staff roles. Reassignment, active-ride cancellation and courier handoff overrides remain pending those operational powers.

## Telemetry and expansion

Define retained operational analytics and worker/provider/reconciliation observations before promising online-hours, retention funnels, demand forecasts or zone performance. Health shows PostgreSQL/Redis point checks, live BullMQ worker heartbeats/connections/queue counts and retained job outcomes. Paystack records the last actual request; scheduled balance observations are retained for 24 hours. Unobserved/stale data stays Unknown. Large report jobs, marker clustering and growth features require separate approval if they introduce dependencies, infrastructure or records.

## Follow-up decisions implemented on 11 October 2026

The owner selected booking-time commission for new bookings and retained current staff roles/internal care. Migration 013 saves and protects commission snapshots without modifying historical money. Missing settlement and webhook exception queues, safe audit change evidence/date filters, scoped page search, real sorting, masked driver context, queue observations and operational report indicators are implemented. Money rollout is off in both backend and frontend; policy-dependent monetary authority is not inferred from configuration editing approval.
