# Google staff sign-in

The login page supports Google alongside the existing phone/OTP flow. It loads the official Google Identity Services script and renders Google's standard button. No new npm dependency or database table is needed. Tokens issued by the shared Express backend remain in HttpOnly browser cookies.

## Configuration

- Backend `.env`: `GOOGLE_CLIENT_ID_WEB` must be the existing OAuth **Web application** client ID.
- Dashboard `.env.local`: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` must match that web ID. This ID is public; it is not a client secret. The current local dashboard was configured from the existing backend web ID without copying other backend secrets.
- Google Cloud Console → Google Auth Platform → Clients → the matching web client → Authorized JavaScript origins: add the exact origin `http://127.0.0.1:3015`. For Google's recommended localhost development setup, add `http://localhost` and `http://localhost:3015`; when running on localhost, also set `DASHBOARD_ORIGIN=http://localhost:3015` and open that hostname consistently.
- Production: authorize the exact HTTPS dashboard origin, set `DASHBOARD_ORIGIN` accordingly and rebuild after changing the public client ID.

Google's live script rendered the button locally but logged **“The given origin is not allowed for the given client ID.”** The current `127.0.0.1:3015` origin therefore still needs the Google Console change. No Cloud Console settings were changed by this work. The button uses popup mode with a JavaScript callback, so no separate application redirect endpoint is required.

The chosen Google identity must belong to an existing active admin/super_admin record. A Google subject already linked to that record is accepted. First-time linking by email is limited to verified Gmail or Google Workspace identities and an unlinked, unambiguous existing active staff record. Other email providers require an existing subject link. Google sign-in does not provision users or staff roles. Initial local staff provisioning remains the separate pending owner decision.

## Request flow

1. The component POSTs `/api/session/google-challenge` on Next. The route checks the exact Origin, creates a random 32-byte nonce, stores it in an HttpOnly/SameSite Strict cookie for ten minutes and returns the nonce for Google's initialization.
2. Google returns a signed ID token containing that nonce after the user chooses an account. The component immediately POSTs `{ idToken }` to `/api/session/google`; it never stores the ID token in browser persistence.
3. Next consumes the nonce cookie and forwards `{ idToken, expectedNonce }` to backend `POST /api/auth/google/staff`. A client-supplied expectedNonce is ignored.
4. The existing `google-auth-library` validates the token for the backend web audience, including signature, issuer and expiry. Staff validation additionally requires a verified email and matching nonce, then locks/checks the existing active staff record.
5. A valid sign-in links an eligible unlinked subject, appends a `staff_google_login` audit entry and issues the ordinary access/refresh pair. Next independently checks `/api/auth/me`, writes the existing staff cookies and returns only `{ success: true }` to the browser.

The general mobile `POST /api/auth/google` continues serving ordinary app identities. Staff identities are denied there with `staff_google_sign_in_required`, preventing that generic registration/linking flow from bypassing the stricter staff checks. Phone/OTP login is unchanged.

## Validation

Backend PostgreSQL tests run in a disposable schema; Google verification is mocked at the library boundary. They cover invalid signature/nonce/email, ordinary/inactive accounts, eligible staff linking, wrong linked subject, external-provider email rules and the generic-route staff denial. Production Next session tests cover exact Origin, nonce cookie flags/consumption, ignoring client nonce tampering, nonstaff denial, invalid tokens and token redaction. These tests do not contact a real Google account or alter local users.

Desktop/mobile layout checks use the real Google button. Full live Google authentication remains dependent on the authorized origin and an existing staff identity. No claim of a real-account login is made before those requirements are met.

References: [Google button setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [button rendering](https://developers.google.com/identity/gsi/web/guides/display-button), [nonce API](https://developers.google.com/identity/gsi/web/reference/js-reference#nonce), [server token verification and authoritative email rules](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
