# Passenger and courier driver review

Implemented locally on 16 October 2026; action controls and responsive layouts updated on 17 October. This dashboard consumes the service-aware backend in the sibling `ride_app` repository. No new dashboard dependency or database table is required.

## Reviewing applications

Open **Applications** to see pending passenger or courier applications. An already approved passenger driver applying for courier work also appears in this queue. **More filters → Service enrollment** narrows the list to partners enrolled in passenger rides or courier deliveries; profile/review state remains a separate filter.

The queue and driver directory show vehicle category, independent service status, and whether the partner has requests on or off. Contact details remain in the account detail view. Each account also reports availability separately for passenger and courier work.

Open an application and inspect the existing private documents. The review panel shows each service’s consent evidence and previous decision. An inherited passenger approval is explicitly labeled as legacy approval; it is never presented as newly recorded consent.

For a pending or unclassified vehicle, confirm **Car** or **Motorcycle** from the documents. Previously reviewed categories cannot be changed here. Motorcycles cannot receive passenger approval. Classifying a legacy approved passenger vehicle as a motorcycle lists the resulting passenger suspension in the confirmation.

Use the direct **Approve**, **Reject**, **Suspend**, or **Restore** button on the relevant service card. Each button opens the confirmation immediately. Pending services can be approved or rejected. Approved services can be suspended for future requests. Suspended services can have approval restored, but requests stay off until the partner enables them. Unrequested and rejected services require an application from the partner before approval is available. Disabled actions explain the missing requirement.

Check the listed changes, supply the audit reason, and choose **Confirm decision**. The confirmation flow sends the exact application version and an idempotency key. A changed application is rejected by the backend, and **Reload latest application** reloads it before another decision. After a successful write, the UI fetches the application again through the authenticated API and displays its saved service statuses. It does not calculate approval or suspension locally. If this read fails, the confirmation reports that the write succeeded but the status needs reloading; **Reload saved status** repeats only the read. Staff cannot edit the partner’s request preferences. Existing accepted work remains finishable after a service suspension.

Suspension and rejection do not require vehicle classification or renewed document approval. Staff can suspend an inactive account or unclassified legacy passenger profile without first approving it. Restoration and approval retain the evidence, consent, category, and active-account checks.

On phones, review controls appear before the documents, with a **View documents** link. Driver directories use labeled cards rather than requiring horizontal scrolling. Confirmations scroll within the screen. On larger screens the documents and review remain side by side.

## Live operations

**Service supply** selects passenger or courier operations. The queue shows enrollment and the selected service’s request preference. Available map markers require approval, consent, preference, and current backend eligibility for that service. Assigned jobs remain visible in their own service even after future requests are disabled.

Changing service clears the previous markers and selection immediately. Responses for another service are hidden, and aborted requests cannot restore old markers. Failed snapshots retain timestamped records for their own service; stale positions are labeled. The overview’s available-driver metric is explicitly labeled **Available passenger drivers**.

## Release and verification

Deploy the service-aware backend and migration `016_driver_service_eligibility.sql` before this dashboard. The application detail endpoint must return `serviceSettings` and the `review-services` allowed action. If eligibility fields are absent, review controls are unavailable; the dashboard does not fall back to global approval. Preview is read-only: simulated approval, rejection, suspension, and restoration have been removed. Its action buttons are disabled and it links to the configured authenticated dashboard. Authenticated operational APIs remain blocked in preview mode.

Local checks passed:

- Dashboard typecheck, 18 unit tests, and production build.
- Session smoke checks, including nested per-service review payload forwarding, authenticated routes, CSRF, method restrictions, refresh, and logout.
- Backend verification: typechecks and all 153 isolated tests, including real HTTP approval/suspension/restoration, stale versions, audit replay, and suspension of inactive unclassified drivers without readable evidence.
- Phone (390px) and desktop (1280px) layouts were inspected earlier. The subsequent persistence tests approve, suspend, and restore both services through the real dashboard API, then compare fresh authenticated reads with the PostgreSQL rows. Restored requests stay off.
- Driver app typecheck, lint, and Expo web export. Native devices were not exercised; the driver app now refreshes overall application state after review, uses native switches, and explains suspension with a support path.

No production deployment or real application decisions were performed.

## Full API connection check — 17 October

The authenticated local dashboard is running at `http://127.0.0.1:3015/login` against the ready backend at port 4000. The prior standalone preview at port 3016 was stopped. Sign in with an existing staff account to use actual records.

Run `npm run test:connections` in the sibling `ride_app/backend` directory to build this dashboard and test it against the full Express application, isolated PostgreSQL, and Redis. All 23 connection and service tests passed. This exercises actual authenticated dashboard rendering and API proxy requests, rather than a stub upstream. It covers document retrieval, review decisions and replay, driver API reads and preference/consent writes, passenger/courier supply, and service-update delivery across Socket.io instances. The full backend suite also passed all 153 tests.

This check caught an HTTP controller that rejected service filters even though the driver-directory service accepted them. The controller now permits passenger/courier enrollment filters for driver and application directories. The driver's Vehicle & documents screen now reads actual submitted metadata, and consent withdrawal is wired to a driver confirmation control.
