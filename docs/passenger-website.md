# Passenger website and backend integration

The passenger website and staff dashboard are served by the same Next.js project at `/Users/mac/Desktop/rakkydashboard`. The public website is `http://127.0.0.1:3015/`; the existing staff dashboard remains `/admin` with its existing `/login` screen.

## Routes

- `/` — public welcome page with the approved green theme and branded car.
- `/ride/sign-in` and `/ride/register` — phone OTP authentication and registration.
- `/ride` — account-backed passenger home, recent trips, active-trip entry and wallet balance.
- `/ride/book` — address selection, quote review and immediate ride request.
- `/ride/schedule` — pickups from 30 minutes to 7 days ahead, entered in Lagos time.
- `/ride/courier` — sealed parcels up to 5 kg, recipient/instructions/restrictions and wallet payment.
- `/ride/trip` — current trip entry.
- `/ride/trips` — history, service filters, pagination and planned pickups.
- `/ride/trips/:id` — participant-scoped trip details, status, driver and vehicle information, cancellation, trip sharing, summary download, delivery handoff code and rating.
- `/ride/wallet` — real balance and ledger activity, secure Paystack checkout preparation and backend-verified funding status.
- `/ride/account` — name/email updates, versioned photo upload/removal, verified phone changes, notification preferences and browser-session logout.
- `/ride/notifications` — rider-scoped notification inbox, read actions and account preferences.
- `/ride/safety` and `/ride/help` — safety guidance, FAQs, configured support contacts and authenticated support request history, creation and replies.

The old sample templates are no longer imported by operational routes. Approved screenshots and original prototype source remain in `docs/design/rider-proposal` as design references. Port 3026 is not the application entry point.

## Connection and session model

All API calls use the existing Express backend through `RAKKY_API_URL`, normally `http://127.0.0.1:4000`. The existing backend gained customer support intake, nonce-verified Google web sign-in and header-authenticated Socket.IO connections for the website gateway. No database tables, migrations or payment-ledger behavior were added or changed.

`/api/rider/session/:action` handles passenger OTP and refresh/logout operations. Access and refresh credentials are stored in separate HttpOnly passenger cookies (`__Host-` and Secure in production), never browser storage. Staff cookies retain their existing names and routes. Identity responses omit token pairs. Browser refresh requests are deduplicated and serialized across tabs with the Web Locks API when supported; a newly rotated cookie survives an identity-service outage. A sign-in recovery button can check a session after a temporary post-verification failure.

`/api/rider/:path` is a restricted proxy for existing passenger operations. It denies staff routes and driver-only trip mutations, restricts forwarded queries, forces wallet funding to the passenger wallet and notifications to the rider audience, bounds JSON request bodies, requires an exact configured Origin for mutations, and forwards booking idempotency keys. Backend authorization remains authoritative for account and trip access.

No access or refresh token is placed in localStorage, sessionStorage, URLs or frontend state. The pending top-up reference alone is saved in account-scoped sessionStorage so it can be checked when returning from Paystack. Booking addresses and draft details stay in memory.

## Booking and payment behavior

Addresses must be selected from the backend's Places results or obtained through permission-based current-location lookup; typing arbitrary display text does not create coordinates. Editing an address invalidates the quote. Fare quotes are account-bound and expire. The final confirmation obtains a fresh quote and requires review again when the price changes. Retrying an unchanged booking retains its request key. All fares use integer kobo. Courier bookings require wallet payment and a recipient handoff code; the handoff code is excluded from general trip sharing.

A wallet top-up starts a provider checkout; it does not credit the wallet optimistically. The checkout host must be Paystack HTTPS and no payment access code is returned to the browser. Success is accepted only from the existing backend's verified status. The checkout opens separately; the rider can return to the original wallet tab to check status. The backend's existing callback configuration is not changed for the mobile app.

Trip status, driver location, wallet and notification updates also arrive through the existing Socket.IO server. The browser uses the server-delivered Socket.IO client over same-origin HTTP long-polling at `/api/rider/realtime`; the Next gateway supplies its HttpOnly access credential as a backend Authorization header. This avoids exporting JWTs to browser JavaScript or introducing a second socket stack. The backend retains Redis adapter delivery and checks revocation/expiry for idle sockets and incoming packets. REST trip snapshots remain an 8-second fallback while the page is visible. The Google JavaScript map draws pickup/destination pins, available cars around the pickup, and an assigned-driver car marker that updates from Socket.IO coordinates or REST snapshots. Markers expire after 30 seconds; a Follow driver control can keep the latest position in view. The route line uses the backend quote/trip polyline and is an estimate. A labelled Google location link remains a provider-failure fallback. No map positions, driver ETAs, fares, balances, drivers or trip records are fabricated.

## Configuration

- `RAKKY_API_URL`: existing backend origin; server-only.
- `RIDER_ORIGIN`: exact public passenger website origin for CSRF checks. It falls back to `DASHBOARD_ORIGIN` when they share an origin. Set an explicit HTTPS origin in production.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: browser Google OAuth client ID, matching backend `GOOGLE_CLIENT_ID_WEB`; authorize the exact website origin in Google Cloud. Existing staff and passenger pages can use the same configured web client.
- `NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY` and `NEXT_PUBLIC_GOOGLE_MAP_ID`: existing JavaScript map configuration, with Maps JavaScript API and the exact website origin authorized. These supply actual map markers; Embed alone cannot update car markers.
- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`: browser-restricted key with Maps Embed API enabled and the passenger website origin allowed. The backend's own Google key remains server-side and supplies Places/routing/quotes.
- `RAKKY_ANDROID_STORE_URL` and `RAKKY_IOS_STORE_URL`: optional verified store listings, validated by the existing native-app helper.

Passenger pages allow same-origin geolocation requests only when the rider presses the location button. Staff pages retain their previous geolocation denial. No location permission is requested automatically.

The admin development-preview switch does not turn passenger actions into fixtures. Passenger pages call the configured backend. Use the dedicated isolated smoke fixture for testing without operational effects.

## Supported limits and remaining integration work

- Trip chat persists on the existing backend before broadcast. Participant-only GET/POST `/api/trips/:id/messages` provide idempotent sending and 50-message cursor pages. Active assigned trips allow new messages; completed trips retain read-only history. Both REST and Socket.IO use the same ownership, text and rate checks. Pre-feature ephemeral messages cannot be recovered.
- Support requests reuse `support_cases` and append-only `care_activity`, enforce customer ownership and rate limits under a database lock, validate attached trip ownership and use stable request keys for safe retries. Only `visibility=customer` activity is returned; internal staff notes and assignment/audit details stay private. Resolved requests reject new replies. Staff see requests in their existing support queue.
- Google web sign-in validates a one-use browser nonce and the configured web OAuth audience. A new Google account finishes phone OTP registration. Its phone-link credential stays in a short-lived HttpOnly cookie, never JavaScript state. Existing mobile and staff sign-in routes keep their contracts.
- Avatar uploads are capped at 5 MB (JPEG/PNG/WebP), with bounded multipart parsing and backend media validation, revision checks and provider ownership. The website offers explicit preview/save/remove controls. Phone updates use account-bound OTP challenges. Backend active-trip restrictions remain authoritative.
- Notification preferences update passenger fields only; driver-offer settings remain untouched. Account > Notification preferences offers an explicit browser Enable/Turn off control. Browser permission is never requested on page load. The backend checks account, session, preference and expiry before sending generic notifications.
- Socket.IO polling requires affinity/sticky routing when multiple backend instances are behind a load balancer; the Redis adapter remains required for cross-instance room delivery. The hosting layer must support long polling (40-second gateway timeout). Full WebSocket upgrade transport is not used by this Next gateway.
- Map/provider authorization and live OTP, matching, cancellations and paid funding need account-based staging verification before public rollout. No real OTP, driver dispatch or paid transaction was triggered during this implementation's tests.
- The existing Next.js 16.4.0 build reports a security upgrade advisory. Dependency remediation remains outstanding; no unrelated upgrade was performed.
- Before public deployment, verify the reverse-proxy/rate-limit configuration: the backend's public-auth IP limiter otherwise sees the web gateway address for multiple passengers.

## Validation

Run:

```sh
npm test
npm run typecheck
npm run build
npm run test:session
npm run test:rider
```

`test:rider` runs the production website against an isolated HTTP fixture backend. It verifies OTP transport, passenger registration scope, token redaction/private cookie flags, CSRF rejection, staff separation, endpoint restrictions, locked query scope, booking idempotency, checkout redaction, profile updates, refresh recovery and logout recovery. It additionally verifies Google phone linking and token redaction, photo revision conflicts, phone changes, passenger-only preference patches, support submission/replies and the bounded live-transport gateway. It makes no operational backend calls. `test:session` retains the existing staff checks.

`node --experimental-strip-types scripts/rider-smoke.ts --serve-ui` leaves that isolated API and production site available temporarily for browser QA. Its displayed fixture login is synthetic. Browser map embeds may still request Google if a public Embed key was configured at build time; authorize the temporary origin or inspect the normal development origin for provider rendering.

Browser QA exercised sign-in, Places selection, quotation, final confirmation, trip creation/cancellation, checkout preparation, verified phone changes, saved notification preferences, independent support requests/replies and bidirectional driver chat against isolated fixtures. The optional `--serve-ui` mode reuses the local sibling backend’s installed Socket.IO server to test the actual browser polling protocol through the Next gateway. Production provider checkout was not opened. The live development site was checked for public/sign-in rendering and authentication boundaries without creating live records.

## October 23 follow-up verification

The backend isolated suite uses a disposable local PostgreSQL database and temporary Redis process. It checks support ownership/private-note filtering/idempotent retries and Google web nonce/audience verification, alongside existing phone-change, media, notification and staff-Google regressions. The Socket.IO test also connects through a Bearer header over polling, sends across Redis-backed instances and verifies server-owned message identity/role/time and idle revocation.

New UI artwork was generated with the built-in imagegen tool, then optimized to WebP. Final assets: `public/rider/rakky-account-care.png` and `.webp`. The exact prompt is saved in `docs/design/rider-proposal/assets/account-care-prompt.txt`. Account, notification, support, Google sign-in assurance and driver chat use this shared artwork to preserve the approved design.

References used for protocol integration: [Socket.IO client options](https://socket.io/docs/v4/client-options), [Socket.IO client API](https://socket.io/docs/v4/client-api/), [Google Identity JavaScript reference](https://developers.google.com/identity/gsi/web/reference/js-reference). Provider-account validation remains separate from isolated tests.

## API coverage recheck — October 23, 2026 (updated after implementation)

Compared the mounted Express routers with the passenger gateway allowlist, session/avatar/realtime handlers and actual React callers. Core authentication, booking, scheduling, courier, trip history/detail/cancellation/rating/handoff, wallet funding/status/ledger, profile/photo/phone, notification inbox/preferences, support and realtime messaging have website connections. `POST /trips/route` is allowed by the gateway but has no separate UI caller; the booking quote already returns route data through `/trips/estimate`.

One existing passenger-accessible backend operation still has no website integration:
- `POST /api/auth/logout-all`: account-wide session/device revocation. The website only calls `/auth/logout` for the current browser. There is no account-wide sign-out control.

Remaining functionality and launch work must be distinguished from missing REST calls:

- Nearby availability, moving assigned-driver markers, persisted chat history and standards-based browser push are implemented as described below. Native Expo device registration retains its existing contract.
- Local `.env` inspection found shared test OTP enabled and no Termii key, so production SMS delivery is not configured in those files. Development OTP behavior must be replaced with real provider delivery before public launch. No verification code or credential is recorded here.
- Local Paystack credentials are test credentials. A real provider test-mode checkout, verified credit/webhook reconciliation and the browser return flow still need an end-to-end staging check before live payment enablement. The current website asks the rider to return to the original wallet tab.
- Google web client IDs are configured and match between projects; the Maps key is present and Cloudinary is enabled. This checks local configuration presence, not provider authorization, successful OAuth/Maps rendering or a real Cloudinary upload.
- A complete staging ride/courier lifecycle with a real driver, scheduled dispatch and reconnects remains unverified. Socket polling affinity, public-auth rate-limit forwarding and the existing Next.js security advisory remain release work.

Re-ran frontend type checking, all 26 repository unit tests, passenger and staff production-fixture smoke checks, backend type checking and the 37-test isolated regression selection. All passed. Backend readiness also returned `ready`. No operational bookings, SMS, payments or support requests were created during this recheck. Driver endpoints are now covered by the separate `/drive` workspace in the same project; see `docs/driver-website.md`. Staff endpoints remain outside passenger coverage.


## Nearby drivers, moving markers, saved chat and browser push — implementation

All website work remains in this repository under `/ride`; `/admin` remains the staff dashboard. The existing backend at `../ride_app/backend` implements the approved storage and push additions.

- Nearby lookup forwards only validated `latitude`, `longitude`, `radiusKm` (1–25) and `serviceType` (`ride`/`courier`). The booking panel offers 5/10/25 km, nearest anonymous drivers and an honest zero-driver state. It refreshes every 15 seconds while visible and expires results after 30 seconds; changing pickup cancels obsolete requests. Scheduled booking availability is explicitly current availability, not a future guarantee.
- The Google map uses actual backend coordinates. Assigned-car updates replace the same marker position, reject out-of-order socket samples, and disappear when stale. No guessed driver movement or arrival times are generated. Nearby markers show at most 50 returned drivers. Map authorization errors retain the journey controls and a clearly labelled location-link fallback.
- New `trip_messages` records use a database uniqueness constraint for safe retries, server-owned sender/time and numeric server IDs for history ordering. REST history polls every 15 seconds when live refresh is unavailable. The mobile Socket.IO send contract remains supported and now also saves messages.
- Browser config/status/register/revoke routes live under `/api/notifications/browser/*`; the passenger gateway allows only these account-scoped methods. Browser registration binds a provider subscription to the current app authentication session. Switching accounts transfers an endpoint only on explicit registration. Revoked or expired sessions stop future sends. This adds browser delivery to existing inbox notification events; trip chat itself does not create a separate inbox/push event.
- Browser jobs run separately from Expo delivery in the existing notification BullMQ worker. `notifications.web_push_results` records per-subscription attempts and provider acceptance, independently of native delivery receipts. Retries skip accepted deliveries; 404/410 disable dead subscriptions. Provider acceptance is not proof the notification was displayed or read. Notification clicks mark opened and target safe passenger routes, preserving an open staff dashboard.
- `/rakky-sw.js` handles push/click only and does not cache pages, credentials or account responses. Notification payloads contain generic text, not message bodies or addresses.

### Local setup and deployment

User approval covers migration `022_browser_push_trip_messages.sql`, two tables and the standard `web-push` dependency/types. The migration was tested in a disposable database, then applied to the local development database. It also adds the browser delivery-results column described above. Local backend VAPID keys were generated once and stored only in ignored `backend/.env`; the subject reuses the existing configured support contact. Preserve these keys across deployments. `.env.example` documents `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` and `WEB_PUSH_SUBJECT`. Only the public key reaches the browser.

For deployment, run the normal backend migrations and configure those same environment variables, an HTTPS website origin, the existing notification worker/Redis and supported push-provider egress. Browser subscriptions support the explicit Google FCM, Mozilla production and Apple Web Push hosts. Other provider hosts require review before adding them to the allowlist. Users enable notifications per browser; some mobile browsers require a home-screen installation. No production deployment was performed here.

### Verification and remaining checks

- Frontend typecheck, 32 unit tests, production build (after its existing security-advisory interruption), passenger production-fixture smoke and staff smoke passed.
- 49 selected backend regression tests passed using disposable PostgreSQL/Redis. A subsequent focused 11-test rerun covers the final browser ownership check and precise notification pagination. The existing inbox pagination was corrected to preserve PostgreSQL microseconds in cursors, with a deterministic regression case.
- Browser QA confirmed saved chat after reload against an isolated fixture, notification controls on the actual account page, and real Google JavaScript map/pickup rendering plus the actual nearby endpoint at `127.0.0.1:3015`. The checked pickup returned zero available drivers; no production driver was fabricated or dispatched. Temporary preview ports are blocked by Google key restrictions; provider-error cleanup/fallback is covered by manual QA.
- A real assigned driver's moving car and real browser push delivery/click still need an end-to-end check on an authorized origin with a participating test driver and the user's browser permission. Automated push delivery uses a mocked provider; no real push was sent and no browser permission was granted. Earlier staging requirements (SMS, payments, real ride/courier lifecycle), account-wide sign-out and the existing Next.js security advisory remain outstanding.

New artwork used the built-in imagegen tool. Final source `public/rider/rakky-nearby-drivers.png`, optimized asset `public/rider/rakky-nearby-drivers.webp`, exact prompt `docs/design/rider-proposal/assets/nearby-drivers-prompt.txt`. Existing imagegen account-care art is reused for chat and browser push controls.

Protocol references: [Web Push library](https://github.com/web-push-libs/web-push), [PushManager.subscribe](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe), [Google advanced markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/basic-customization).


Driver mode follow-up: the website now has a `/drive` workspace, common account sign-in and mode links. Driver-only inbox, earnings and operational APIs use their own strict gateway. See [driver website implementation](driver-website.md).
