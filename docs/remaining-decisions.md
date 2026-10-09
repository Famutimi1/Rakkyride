# Remaining implementation decisions

## Approved and implemented

Separate Next frontend; one existing Express backend; current schema/status baseline; domain-owned admin services; existing staff OTP accounts; HttpOnly browser sessions; support/safety/activity records; audit expansion and immutability; official Socket.io Redis adapter. Migration 010 is applied to local development PostgreSQL, with no production deployment.

## Configuration needed for verification

Provide a browser-restricted Google Maps key with the needed JavaScript/Embed APIs and a map ID. Configure production HTTPS origin and an accurate test/live label. Existing staff accounts need an owner-controlled provisioning/runbook; no new privileged account has been created by this build.

## Staff permissions and privileged actions

Choose initial owner provisioning, permitted operations/support/finance/safety scopes, revocation, step-up method and maximum privileged session age. The current implementation uses admin/super_admin roles; safety/team are super_admin-only. Staff socket subscription authorization awaits this scope decision; bounded REST polling remains usable.

## Commercial and money authority

Approve actual payment limits/fees, cash-debt policy, adjustment threshold, wallet-credit refund authority and any independent approval requirement. Dashboard money and settings flags remain off. The super-admin settings editor is built with a before/after confirmation, optimistic configuration version and exact-payload retry checks; enabling it requires the commercial/privileged rollout decision. Accounting sweeps need evidence and duplicate-movement policy. Provider refunds are separate scope.

Returned-courier refund eligibility, lost parcel escalation and exhausted handoff-code recovery need approved policies. Current returned fares remain distinct from delivered parcels; no surcharge or recovery override is invented.

## Care operating model

Name staff owners, operating hours, severity/escalation rules, response SLAs, customer contact/reply delivery channel and retention. Internal records, assignment, transitions and notes are persisted. No customer message is reported as sent. Customer safety intake must wait for a staffed response policy. Attachments/evidence storage and retention are disabled. Mobile support currently still has the pre-existing placeholder flow and does not create these staff records.

## Documents and interventions

Choose shared durable private-document storage for multiple backend instances and any document expiry/verification model. Local private serving is protected and audited but is not shared storage. Choose staff cancellation/reassignment powers and actor attribution, plus account/driver restriction behavior during active rides/returns. Current participant state-machine actions are not repurposed as staff intervention APIs.

## Telemetry and expansion

Define retained operational analytics and worker/provider/reconciliation observations before promising online-hours, retention funnels, demand forecasts or zone performance. Health shows PostgreSQL/Redis point checks; missing heartbeats/provider observations stay Unknown. Large report jobs, marker clustering and growth features require separate approval if they introduce dependencies, infrastructure or records.
