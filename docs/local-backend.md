# Local shared backend and page data

The dashboard's local configuration uses the real Express backend at `http://127.0.0.1:4000`, with `DASHBOARD_PREVIEW=false`. Next runs on `http://127.0.0.1:3015`. Both dashboard and mobile use this same backend and its existing PostgreSQL/Redis configuration. No copied database or fake fallback is used in real-data mode.

## Run

```sh
cd /Users/mac/Desktop/ride_app/backend
npm run dev

# In another terminal
cd /Users/mac/Desktop/rakkydashboard
npm run dev
```

Use `/login` with an existing active `admin` or `super_admin` account. During the initial local check, the database had three ordinary users and no staff accounts; an owner account selection is required before granting initial staff access. No automatic role promotion or public provisioning endpoint is provided. Existing development OTP login prints the temporary code in the backend console; it does not send SMS. Verify it through the normal login form.

The dashboard server reads HttpOnly cookies and forwards Bearer authentication to Express. Browser JavaScript never receives JWTs. POST/PATCH routes check the exact dashboard Origin. Mobile keeps its existing app token flow. `mobile/src/services/api.ts` maps localhost to the reachable Metro LAN host or Android emulator address when needed. Both API and Socket.io use the same configured backend address.

## Page connections

All API paths below have the backend prefix `/api/admin`:

- Overview `/admin`: `/overview?day=...` and `/trips?mode=live&page=...&limit=...`.
- Live operations `/admin/live`: `/live` and live `/trips`; visible-page REST refresh every 15 seconds.
- All trips `/admin/trips`: `/trips` with selected service/status/date/person/payment filters.
- Scheduled rides `/admin/scheduled`: `/trips?mode=scheduled` or `scheduled_history`.
- Courier deliveries `/admin/courier`: `/trips?service=courier`, including exception mode.
- Riders & customers `/admin/riders`: `/users`; person detail `/users/:id`, linked trips.
- Drivers `/admin/drivers`: `/drivers`; person detail `/drivers/:id`, linked trips.
- Applications `/admin/applications`: `/driver-applications`; details/documents/review use `/driver-applications/:id` and its protected subroutes.
- Payments `/admin/payments`: `/payment-intents`, detail `/payment-intents/:id`.
- Wallets & ledger `/admin/ledger`: `/accounts`, account entries `/accounts/:id`, transaction evidence `/transactions/:id`.
- Withdrawals `/admin/withdrawals`: `/withdrawals`, detail `/withdrawals/:id`.
- Reconciliation `/admin/reconciliation`: `/reconciliation`, queue `/reconciliation/:kind`.
- Support cases `/admin/support`: `/support`; detail/activity `/support/:id`; creation POST `/support`.
- Safety incidents `/admin/safety`: corresponding `/safety` endpoints, super_admin only.
- Ratings & feedback `/admin/ratings`: `/ratings`.
- Reports `/admin/reports`: `/reports` and aggregate CSV `/reports/export` with the same range/service.
- Pricing `/admin/pricing`: `/pricing`, read-only existing fare configuration.
- Payment settings `/admin/settings/payments`: `/payments/settings`, read-only while editing policy is disabled.
- Audit log `/admin/audit`: `/audit`, with role-filtered exact paging.
- Service health `/admin/health`: `/health`, bounded PostgreSQL/Redis observations.
- Team access `/admin/team`: `/team`, read-only super_admin directory.
- Header environment label: `/environment`; record search: POST `/search`.

Directories request numbered page/limit and use the returned exact filtered range/total. Selected filters persist in navigation; row size/filter changes reset page 1. Details use real record UUIDs, so preview IDs are not valid real-data URLs. Empty tables display an empty state. API failures display an error or login redirect, not fictional records.

Every table uses the shared `DataTable`: desktop headings and columns remain visible on phones, and a focusable container scrolls horizontally. Filters and pagination wrap within the screen.

## Reference and limitations

The complete [admin API reference](/Users/mac/Desktop/ride_app/backend/docs/admin-api-reference.md) covers inputs, responses, roles, examples and pagination. Its [implementation snapshot](/Users/mac/Desktop/ride_app/backend/docs/admin-api-implementation.md) includes the actual backend TypeScript code with source checksums.

Support, safety and withdrawal tables were empty during initial inspection; showing no records is correct. Maps need browser-restricted Google keys. Worker/provider observations without instrumentation remain unknown. Financial and settings mutation UI gates remain off pending the previously documented policies. No production rollout, invented provider outcome or real financial test transaction is implied by the local connection.
