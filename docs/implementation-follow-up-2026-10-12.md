# Dashboard review implementation follow-up — 12 October 2026

This follows the 11 October review. The dashboard remains a separate Next frontend connected to the shared Express/PostgreSQL/Redis backend. No new dependency, separate database or privileged account was introduced.

## Delivered

- Google Maps: separate browser key restricted to `http://127.0.0.1:3015/*`, limited to JavaScript and Embed APIs. Both APIs enabled with owner approval; project-owned JavaScript vector map ID configured. Live fleet, overview map and recorded-trip map components share the configured keys. Authentication failures have an explicit fallback. No driver positions are fabricated.
- Booking-time commission: migration 013 saves the rate for new immediate/scheduled bookings; completion/return settlement uses it. A database trigger protects saved rates. Historical trips keep null rather than guessed rates and retain the documented legacy completion fallback. Historical ledger amounts were not changed.
- Refund evidence: read and mutation require a completed, settled trip with the matching settlement transaction. Concurrent limits/exact retries remain protected by database locks. Automated wallet credits cannot be issued for unpaid or fabricated settled status. Money mutations are default-off in the backend as well as the dashboard; mobile payments and configuration editing use their existing routes.
- Reconciliation: all five derived queues have drill-downs, including safe received/failed webhook envelopes and fulfilled trips lacking settlement evidence. Webhook paging supports numbered pages or bigint cursors. No payload/raw provider error is exposed. Existing reconciliation can retry retained failed BullMQ webhook jobs instead of silently re-adding their existing IDs.
- Audit: object/target/request/transaction evidence, sanitized before/after changes, actor/action/object/date filters, and real transaction links. Arbitrary metadata, contacts, message bodies and operation hashes stay excluded. The log remains immutable.
- People/drivers: platform role labels, Redis presence/last location timestamp, active trip/application links and masked active payout readiness. A staff driver remains a real shared identity and is visibly distinguished from an ordinary customer. Missing/expired Redis state stays offline/stale/unknown, never an invented live position.
- Search/filter/sort: reusable scoped POST search can find names/references on directory pages without placing contact search text in URLs. Active filters expand automatically and show their count; More/Hide/Clear controls remain reusable. Trip timestamp sorting reaches the backend and uses validated order/cursor direction. Scheduled and requested timestamps are displayed according to their actual sort basis.
- Reports: request cohort completion/cancellation/no-driver indicators, assignment time/count, offer count, rating averages/low-rating counts, payment intent outcomes and existing accounting totals. CSV exports include the added indicators and date/unit/service basis. Unknown averages are distinct from zero. Payment intent and ledger totals explicitly remain across all services.
- Health: PostgreSQL/Redis checks, worker heartbeats every 15 seconds (90-second freshness), live connections, paused queues, waiting/active/delayed/failed counts and successful/failed job observations retained for 24 hours. Observation timeouts become Unknown. Paystack shows the last actual request; scheduled provider-balance observations are retained separately for test/live modes for 24 hours.
- Tables: desktop table semantics and contained horizontal scrolling remain on mobile. Record actions keep real domain links; report/health/hourly aggregates omit meaningless mutation/detail columns. Audit changes have bounded scrollable content.
- Documentation: the admin API reference, 41-file source/checksum snapshot, frontend route inventory, remaining decisions and Maps setup notes are refreshed.

## Verification

- Backend typecheck and 72 tests passed, including real disposable PostgreSQL and isolated Redis queue checks. New checks cover immutable booking commission after a rate change, settlement-backed refund eligibility, concurrent refunds, failed-webhook recovery, safe envelopes/audit changes, actual sorting/pagination, and bounded health timeouts.
- Dashboard typecheck, production build, seven unit tests and the isolated session/API smoke suite passed.
- All 22 navigation destinations checked at 375×812 with authenticated real data: no document-wide horizontal overflow; every rendered table keeps its own horizontal scroll container.
- Trips, drivers, audit, reports, health and reconciliation checked at 768 and 1280 widths. Driver detail also checked on mobile. Name search returned real masked records, and sorting changed the first row from the latest trip to the earliest trip through `order=asc`.
- Live Google map tiles and the overview Embed map rendered. Saved map/key/map-ID screenshots are in `docs/screenshots`.
- API implementation checksums matched all 41 listed source files.

## Policy choices and operational follow-up

The owner chose booking-time commission for new bookings and existing admin/super_admin roles with internal care workflows. Customer messaging/safety intake, new staff provisioning/scopes/step-up, production deployment origins/storage, provider refunds and commercial money authority remain separate decisions. The dashboard continues bounded REST polling; no new staff socket transport is advertised.

Two existing fulfilled cash trips lacked settlement evidence and now appear in reconciliation. Zero-commission cash trips can also legitimately lack a ledger commission posting, so the queue is evidence for investigation rather than authority to move money. No legacy trip was silently settled or refunded.

Health exposed 67 retained payment-job failures in the local queue while the worker had fresh heartbeats and recent successes. Retained failure count includes history and is not proof that current payments are failing. These records were not deleted to make the dashboard appear healthy.

The local database contains development records; metrics describe those records and should not be presented as production performance. Live driver markers require fresh location updates from an online driver in the mobile app. No fresh location means no live marker.

## Files

- [Admin API reference](/Users/mac/Desktop/ride_app/backend/docs/admin-api-reference.md)
- [Full implementation snapshot](/Users/mac/Desktop/ride_app/backend/docs/admin-api-implementation.md)
- [Maps setup](/Users/mac/Desktop/rakkydashboard/docs/maps-configuration.md)
- [Commission migration](/Users/mac/Desktop/ride_app/backend/migrations/013_trip_commission_snapshot.sql)
