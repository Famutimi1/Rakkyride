# Staff search and directory integration

The dashboard frontend remains separate. All business reads live in the existing `/Users/mac/Desktop/ride_app/backend` modular monolith; no second backend or database was created.

`POST /api/admin/search` accepts `{query, scope, cursor?}`. Scope is `all`, `people`, `trips`, `finance`, `support` or `safety`. Query text is 3–80 characters and is sent only in the JSON body. Contact identifiers use exact matching; names, payment/provider references and case subjects use literal prefix matching. Full UUIDs match records directly. People results mask phone and email, trip results omit coordinates/codes, and finance results omit provider secrets/raw webhook payloads.

The route requires current admin/super_admin authorization and no-store responses. Safety search is super_admin-only and is excluded from ordinary admin searches. The existing Redis service enforces 30 requests per staff member per minute across instances. Each database statement has a three-second execution timeout. All-scope results are capped at five per group; single scopes return 20 records and a stable cursor bound to the query and scope. Finance cursors include record type as well as ID. An all-scope group's expansion starts a fresh single-scope page. Redis failure or query failure returns an unavailable state, not fabricated empty results.

The audit records the actor and scope, never the query, contact identifiers or result names. Safety-inclusive search audits are restricted like other safety history. Search query text stays in component memory and clears on dialog close; it is not placed in the URL or browser storage. Browser requests go through the Next server route using existing HttpOnly cookies and exact-origin checks; access tokens remain server-side. Preview search receives fictional records from the server layout and performs no operational request. Production refuses the preview bypass.

Additional integrated filters:

- Users/drivers/applications: exact ID and existing application state, using the shared URL filter form.
- Support/safety: exact ID and lifecycle state, using existing role-protected directory APIs.
- Ratings: exact rating ID and service, forwarded to the existing ratings API.
- Team: super_admin-only exact staff ID/role, bounded results and created-at/ID cursor pagination.
- Audit: action, exact audited object UUID, optional API actor UUID and descending immutable audit-ID pagination. Safety exclusion applies even when explicitly filtering for a safety action. Changing a filter clears pagination; next-page links retain it.

Backend tests verify authorization, secret/contact masking, literal wildcard handling, query-bound pagination, group limits, rate limiting, audit privacy, team pagination/role filters and audit safety restrictions. Production session smoke verifies JSON-body forwarding, cookie use, no-store, origin rejection, missing-session rejection and GET search rejection without contacting real auth or payment services.

## Numbered directory pagination

The dashboard requests `page=1&limit=20` by default. Rows choices are 10/20/50/100; the API accepts integers 1–100 and positive pages up to 999999. All directory filters apply before counting and paging. Changing a filter or row size resets page 1; Previous/Next retain filters. Exact ID/reference filters remain URL-safe; staff-wide name/contact search remains POST-only.

Supported reads: users, drivers, applications, trips (including live/scheduled/courier modes and linked people history), payment intents, withdrawals, accounts, support, safety, ratings, team, audit, account postings, and reconciliation exception queues. Existing role/auth checks and masked projections apply to both count and rows. Team/safety remain super_admin-only. Safety-related audit entries are excluded from ordinary-admin totals as well as results.

Numbered responses include `pagination: {page, pageSize, total, totalPages, from, to, hasPrevious, hasNext}`. An empty result uses page 1 of 1 and range 0–0; a page beyond the filtered last page clamps to that last page. The matching count and rows use one read-only repeatable-read PostgreSQL transaction with five-second statement timeouts and stable ordering, including ID tie-breaks. Counts reflect each request’s snapshot; concurrent changes can change totals between requests. Unavailable counts return an error rather than invented totals.

Omitting `page` retains existing cursor/before requests and their previous default size. Numbered `page` cannot be combined with `cursor` or `before`; invalid/repeated page fields and oversized limits return 400. Care activity and grouped staff search retain their separate cursor contract; aggregate reports and bounded context arrays are not complete directory exports.

Integration tests exercise non-overlapping pages, tied timestamps, filtered totals, empty/out-of-range pages, disabled account filters, posting pages, team/safety authorization, audit count restrictions and invalid inputs in disposable PostgreSQL schemas. The production Next session smoke verifies query forwarding and renders the API range/total (21–40 of 108, page 2 of 6) through authenticated server-side reads against a local stub.
