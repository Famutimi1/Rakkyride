# Approved implementation baseline — 9 October 2026

The user approved a separate Next.js / TypeScript project named rakkydashboard and one shared Express backend at `/Users/mac/Desktop/ride_app/backend`. Current migration/schema/status vocabulary and domain-owned admin logic are the baseline. This supersedes the older conceptual schema and matching-only placement instruction for this work.

Existing admin/super_admin accounts authenticate with the existing OTP foundation. JWT pairs remain in server-managed HttpOnly cookies. Existing staff accounts are not created or promoted by public registration. Fine-grained scopes, privileged step-up and owner provisioning/revocation policy are not yet approved.

The user approved `support_cases`, `safety_incidents`, append-only `care_activity`, immutable protection and target/version expansion of `admin_audit_log`, and the official `@socket.io/redis-adapter` dependency. Migration 010 is applied to the local development database only. Support endpoints require staff; safety and staff directory endpoints require super_admin. Safety audit entries are hidden from ordinary admin audit reads.

Cases/incidents are internal staff intake. No external message channel, customer SOS delivery, attachments or retention period has been selected. Safety notes do not imply emergency dispatch or guaranteed response.

Canonical mobile theme exports generate CSS semantic variables with a checksum. The same source logo and Inter font assets are used. No UI kit, ORM, clustering dependency or additional infrastructure was added. Existing dependencies morgan, proxy-addr and qs received compatible security updates; the backend package audit reports no vulnerabilities.

Development fixtures are explicit and opt-in; production refuses fixture mode. Real reads require backend staff authorization. Wallet mutations and configuration editing are separately gated off in the dashboard. Sweeps, provider refunds, manual payout approval, arbitrary trip state changes, pricing writes and public staff role editing are not provided.

The API/type inventory was committed before page implementation and is now updated to distinguish implemented routes and gated actions. Backend route handlers remain HTTP-only; services own business logic and use raw parameterized PostgreSQL queries and existing Redis.

The original source specification remains `/Users/mac/Desktop/ride_app/docs/design/admin-dashboard-implementation-spec.md`. Its reference copy is included here; its original relative repository links resolve in ride_app.
