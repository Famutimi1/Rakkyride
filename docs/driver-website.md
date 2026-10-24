# Driver website

The driver experience is part of `/Users/mac/Desktop/rakkydashboard`, at `/drive`. Passenger pages stay under `/ride`; staff operations stay under `/admin`. It uses the existing app account, session cookies, Express backend and Socket.IO connection. No separate driver account or app was created.

## Pages and connections

- `/drive`: driver overview, today's settled job totals, earnings balance change, current trip, current offer and server-confirmed online/location status. Offers use the backend's `serverNow` and expiry, with a five-second REST fallback and Socket.IO offer/service events. Accept/decline goes through the existing trip APIs and server eligibility/locking rules.
- `/drive/trips` and `/drive/trips/:id`: account-scoped history/filter/pagination, passenger/parcel and payment details, arrival/start/completion/cancellation, courier returns and handoff-code input, external Google directions and persisted trip chat. Completion is explicitly reviewed before it can settle payment. Only the assigned driver sees operation controls.
- `/drive/earnings`: today/week/month settled job totals, commission, actual trip earnings (gross minus commission, including cash retained by the driver), withdrawable balance, earnings ledger pagination and Paystack top-ups targeted to earnings. Checkout preparation does not credit money. The account-scoped pending reference can be recovered after a reload, with provider status polling.
- `/drive/payouts`: verified bank accounts, account-name resolution, phone OTP before adding an account or withdrawing, configured fee/minimum/daily limit/cooldown review, total balance deduction and recent payout status. Existing backend OTP, balance, cooldown, capacity, webhook and reconciliation rules remain authoritative. The browser also sends the reviewed fee; an optional backward-compatible backend check rejects a changed fee before a withdrawal or OTP consumption can commit. Interrupted requests clear the client OTP flow and ask the user to check history before trying again.
- `/drive/application`: personal and vehicle details, bounded private three-document upload, version checks, application feedback/status, independent ride/courier approval and request preferences, explicit service responsibilities and consent, and final application submission. Approved material changes are directed to support. Motorcycles cannot request passenger service.
- `/drive/account`, `/drive/notifications`, `/drive/help`: the existing profile/photo/phone, saved support conversations and notification UI adapted for driver mode. Driver offers/preferences and inbox queries use driver scope. Driver push destinations use `/drive`; stale ride offers are checked against service eligibility before web delivery.

Passenger navigation includes a Drive with Rakky / Driver mode link. Driver sign-in reuses the existing phone/Google flow through `/ride/sign-in?next=driver`. A passenger account can start an application before driver approval. Entering active driver mode requires server approval. Switching modes remains blocked by an active trip, as in the mobile app.

## Browser location and realtime

The persistent `/drive` layout owns the live connection and location watch so internal driver navigation does not restart the session. Going online requires an explicit button action; loading a page never requests GPS. The UI explains the matching/tracking purpose before the action. GPS samples must be finite, no older than 15 seconds and accurate within 200 metres. An online indicator requires a recent server acknowledgement and a visible page; merely clicking Go online does not count as being online.

While enabled and visible, the browser checks GPS and sends the existing `driver:location:update` event about every five seconds. It does not rewrite old sample timestamps. The backend remains responsible for approval, enabled service, financial eligibility, Redis availability, active-trip tracking and named room broadcasts. Offline is acknowledged by the backend; an active job must remain online. Leaving the workspace stops its browser watch; the existing Redis freshness expiry removes stale supply.

Browser timers/location can pause when hidden, locked or suspended. Background driving is not promised, and opening Google navigation can pause tracking. A foreground browser ride with GPS permission needs staging validation. Reliable continuous background tracking should use the mobile app. References: [MDN watchPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition), [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API).

## Gateway and backend changes

`/api/driver/[...path]` is a strict method/path allowlist using the existing passenger app-session HttpOnly cookies. Mutations require the exact configured website Origin. Financial and operational requests require the current backend-confirmed driver mode; onboarding and shared notification setup are available before approval. The backend repeats the actual approval, participation, consent, payment and state checks. Wallet queries lock to `earnings`, inbox queries to `driver`, and top-up requests to `earnings`. Checkout access codes are redacted. No JWT is exported to JavaScript.

`/api/driver/documents` accepts exactly three bounded files, 8 MB each, with revision headers and no document URLs returned. Backend validation/storage remains authoritative. Do not log document contents or bank/OTP fields.

The existing backend gained authenticated, approved-driver `GET /api/payments/withdrawal-policy`, returning only the configured minimum, daily limit, fee and new-bank-account waiting period. This lets users review costs before a withdrawal. Browser notification destination classification now supports drivers as well as passengers. No new tables, migrations or dependencies were introduced for this driver feature. Ledger accounting remains unchanged. The withdrawal contract accepts an optional expected fee for clients that review charges; existing mobile callers retain their contract.

## Verification and launch work

- Frontend typecheck, 35 unit tests, production build, expanded passenger/driver production-fixture smoke and existing staff smoke passed. The build continues to report the existing Next.js security advisory; remediation is separate work.
- 34 selected backend isolated tests passed, covering approval/service restrictions, concurrent offer acceptance, socket identity/rooms, payment balancing/retries/reversals, browser push and the new withdrawal-policy access/fee response, changed-fee rollback without OTP consumption, and server-owned driver chat identity.
- Browser QA uses `npm run test:rider -- --serve-ui --driver-ui`, a synthetic local HTTP/Socket.IO fixture. No operational driver approval, dispatch, real location permission, SMS, bank change, transfer, top-up or payout was performed by the agent.
- Browser QA confirmed synthetic arrival/start/completion, read-only chat after completion, fee/total/account review before withdrawal confirmation, service preference changes, driver offer notification settings, and layouts at 320, 390 and 1440 pixels. Final live-provider operations were not submitted. Screenshots are in `docs/screenshots/driver-*`.
- Real-device foreground GPS/online/offline/reconnect, a complete passenger/driver ride and courier lifecycle, and actual provider SMS, bank resolution, funding, payout and push delivery remain staging checks. Google Maps keys must allow the actual public website origin; temporary fixture ports are intentionally not authorized. The normal configured development origin already renders Google Maps.
- Advanced actions without dedicated driver web controls: withdrawing service consent (request preferences can be turned off), rating a customer, and account-wide session sign-out. Legacy courier-preference endpoints are covered by the newer two-service preferences UI rather than separate controls.

## Imagegen assets

Six new page-specific illustrations were generated with the built-in imagegen tool, inspected and optimized to WebP. The driver hero images are decorative; maps, balances, approval decisions and offers come from APIs. Existing imagegen account-care artwork is reused for shared account/inbox/support/chat components. See [driver artwork and exact prompts](design/driver/README.md).
