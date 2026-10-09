# Rakky dashboard

A separate Next.js / TypeScript staff frontend at `/Users/mac/Desktop/rakkydashboard`. All permanent records, payments, authentication and Redis state belong to the existing Express backend at `/Users/mac/Desktop/ride_app/backend`. There is no second operational backend or database.

## Run locally

```sh
cd /Users/mac/Desktop/rakkydashboard
npm ci
cp .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3015/admin. Port 3015 avoids the existing service on 3001. The current local `.env.local` opts into development preview. Set `DASHBOARD_PREVIEW=false` to use existing staff accounts through `/login`. Preview cannot call operational APIs and is rejected in production. No staff account is automatically provisioned.

The shared backend should run on port 4000 using its existing PostgreSQL and Redis configuration. Migration 010 is approved, tested in disposable schemas, and applied to the local development database; migrations 001–009 were already recorded. Before deploying another environment, inspect its migration history and use the backend's normal migration procedure. No production deployment was performed.

## Configuration

- `RAKKY_API_URL`: server-side address of the existing backend.
- `DASHBOARD_ORIGIN`: exact dashboard origin for session and mutation CSRF checks; use HTTPS in production.
- `RAKKY_ENVIRONMENT`: expected operator label. The protected layout reads the backend’s configured provider key mode and application environment, and marks a label mismatch. This is configuration evidence, not a provider availability check.
- `NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY`: browser-restricted key with Maps JavaScript API enabled. Use `NEXT_PUBLIC_GOOGLE_MAP_ID` for the fleet map.
- `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`: browser-restricted key with Maps Embed API enabled for overview and estimated trip route embeds.
- `ENABLE_ADMIN_MONEY_ACTIONS`: false by default. Dashboard wallet refunds, adjustments and freeze actions require approved financial authority, commercial limits and rollout checks. This dashboard flag does not disable pre-existing staff endpoints in Express.
- `ENABLE_ADMIN_SETTINGS_ACTIONS`: false by default. Super-admin editing also requires the current configuration version and a reason. Commercial/step-up policy remains pending.

Never expose a server Google key, JWT pair or provider secret through public variables. Access/refresh cookies are HttpOnly, SameSite Strict and Secure with \_\_Host names in production. No privileged JWT is stored in localStorage or client state.

## Features and limits

See [implementation status](docs/implementation-status.md) for ADM-01 through ADM-18 and [remaining decisions](docs/remaining-decisions.md) for the policy and configuration gates. The full specification is not yet production-ready: mobile care intake, delivery channels, scoped provisioning, step-up and several intervention policies remain pending.

The fleet page currently uses authorized, bounded REST snapshots every 15 seconds while visible. Stale locations and failed refreshes are labeled; keyboard-focused queues offer an explicit update button. The backend Socket.io Redis adapter is installed and cross-instance delivery is tested. Staff browser socket subscriptions are not implemented and are not advertised as connected.

Google Maps code is implemented, but no browser key was provided, so successful map rendering has not been verified. No map positions are fabricated in preview. Trip details keep current Redis positions separate from bounded, numbered historical samples, with an accessible recorded-sample table.

Private driver documents use the existing local private upload directory, signature validation, safe path checks and audited staff reads. Multi-instance deployment must supply shared durable private-document storage before document review is considered reliable across nodes.

## Shared UI and mobile review

Use the reusable dropdown, search field, filter form, table, pagination, buttons and dialog in `src/components/ui`. Tables become labeled cards on phones, and the same semantic token set serves Light/Dark themes. See [component guide](docs/components.md), [mobile review](docs/mobile-review.md) and [search API](docs/search-api.md).

Staff record search is integrated with the existing backend through cookie-authenticated POST requests. Search text stays out of URLs and audit logs; contacts remain masked, results are bounded/paginated, and safety requires super_admin. Team and audit filters use their existing APIs with bounded pagination. Preview search is fictional and local only.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run test:session
```

The session smoke test uses an isolated mock auth server and a production Next process; it sends no real OTP/SMS and creates no live staff account. Backend integration tests use disposable PostgreSQL schemas and temporary Redis keys/private files. The backend suite also checks financial concurrency and immutability, care conflicts, document protections, role denial, returned-courier reporting and cross-instance socket delivery.

Run backend and mobile type checks from their respective directories. Existing unrelated changes in the ride_app working tree were retained. The dashboard is its own Git repository; no push or deployment was requested.

## Brand source

`npm run sync:brand` reads the canonical mobile semantic colors, copies the supplied logo and local Inter fonts, and generates `src/app/brand.generated.css` with a source checksum. Do not author a second palette. The theme preference supports Light, Dark and System through one component tree.

Primary implementation references: [Socket.io Redis adapter](https://socket.io/docs/v4/redis-adapter/), [Google Maps Embed modes](https://developers.google.com/maps/documentation/embed/embedding-map), installed Next version documentation, and the source specification in ride_app.
