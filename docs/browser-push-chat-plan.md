# Approved browser push and saved trip chat

This extends the existing Express/PostgreSQL/Redis backend. Nearby drivers and moving Google markers do not need a schema or dependency change and can proceed independently.

## Approved database additions

- `trip_messages`: an ordered server ID, trip ID, sender user ID, sender role, client message ID, text (1–1,000 characters), and server creation time. Unique `(trip_id, sender_id, client_message_id)` prevents duplicate messages on retries. Indexed trip/message ID supports cursor pagination. Both reading and sending require trip participation; sending requires an active assigned trip. Messages commit before Socket.IO broadcasts. Driver locations remain exclusively in Redis.
- `web_push_subscriptions`: subscription ID, user ID, authentication session ID, endpoint hash/URL, browser subscription encryption keys, enabled state, creation/update timestamps and last-delivery status. Unique endpoint ownership permits switching accounts in the same browser. Reads and changes are account-scoped. Sending requires an active unrevoked session and notification preferences. Expired provider subscriptions are disabled. Browser permission is requested only after an explicit Enable notifications action.

No payment/ledger tables or trip state transitions change. Chat history applies to messages sent after this feature is enabled; previous ephemeral messages cannot be recovered.

## Approved dependencies and configuration

Use the established `web-push` Node library plus its TypeScript types for standards-based encryption and VAPID delivery, rather than implementing encryption in the application. Reuse the existing notification worker/queue and Redis connection. Add no new service or infrastructure.

VAPID public/private keys and a contact subject stay in backend environment configuration; only the public key goes to the browser. Browser subscriptions use HTTPS push-provider endpoints from a fixed supported-provider allowlist, bounded payloads and delivery timeouts. No endpoint or authentication keys are logged. Notification payloads contain a generic Rakky update and a safe internal destination, not private addresses or message text.

## Website and API changes

- Participant-only chat-history GET and idempotent message POST under existing trip routes, used by the website and the existing Socket.IO handler.
- Browser push configuration/register/status/revoke endpoints under the existing notifications module; mobile Expo device routes keep their current contract.
- A same-origin service worker with push/click handling, safe destination checks and no offline API/credential caching.
- Account notification controls for this browser, including unsupported, denied, enabled and disabled states; logout/session revocation prevents further account pushes.

## Validation before considering the work complete

Disposable PostgreSQL/Redis tests for participant access, pagination, duplicate retries, commit-before-broadcast, revoked sessions, preference filtering, subscription ownership, provider errors and blocked endpoints. Provider delivery is mocked in automated tests; an actual browser permission/delivery check is separate and requires the user's browser permission. The user approved these backend additions. Migration 022 passed disposable database tests and was applied to the local development database. No real browser push was sent. The migration also adds `notifications.web_push_results` for per-browser retry outcomes, separate from Expo receipts.

References: https://github.com/web-push-libs/web-push and https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe.
