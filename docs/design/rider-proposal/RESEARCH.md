# Rakky Ride passenger website — design proposal 01

Prepared for approval on 22 October 2026. This is a separate design prototype, not a change to the staff dashboard or an implemented passenger website.

## Review

Open [the interactive prototype](http://127.0.0.1:3026). Its review bar switches between passenger dashboard, public home, booking, active trip, and design notes. The passenger navigation also previews ride history, wallet, safety and help.

Run locally if needed:

```sh
python3 -m http.server 3026 --bind 127.0.0.1 --directory /Users/mac/Desktop/rakkydashboard/docs/design/rider-proposal
```

All balances, fares, people, vehicle details, routes and ride records are fictional. The map is schematic, not geographically accurate or live. The prototype makes no API requests, creates no account, books no ride, sends no message, takes no location permission and processes no money.

## Recommended direction

A passenger experience that carries the uploaded reference’s welcoming top navigation, prominent booking form, service shortcuts and recent rides into Rakky’s actual brand. The home screen centres the next journey. Saved places make repeated journeys quicker. The wallet and safety entry are useful supporting content rather than competing with the primary booking action.

The custom green-and-white car illustration provides a distinct visual identity without copying a competitor’s artwork. A Lagos-inspired setting and naira-denominated sample amounts localise the concept without implying confirmed operational coverage.

Use a public welcome page before authentication and the passenger dashboard after authentication. The proposed navigation is Home, My rides, Wallet, Safety and Help. On small screens it becomes bottom navigation; booking and trip views put the map above the action panel.

## Brand evidence

- Primary: `#176B17`.
- Primary tint: `#EAF5E5`.
- White: `#FFFFFF`.
- Text: `#141A14`.
- Secondary text: `#586253`.
- Structural border: `#DEE3DA`.
- Supporting surface: `#EEF1EC`.
- Success: `#176B45`; pickup marker: `#008F8B`; destination marker: `#FF4538`.

These values come from `src/app/brand.generated.css` and the canonical mobile `src/constants/colors.ts`. They are copied into this isolated proposal only. The project’s logo and local Inter fonts are reused. No canonical palette or app source was edited.

## Research synthesis

The following are design conclusions drawn from official product and support sources, rather than a feature-by-feature claim of parity.

- **Booking before browsing.** Uber’s Nigeria ride page and browser booking page put pickup and destination immediately before a price action. Apply this hierarchy to the passenger dashboard and keep the form short.
- **Prices before commitment.** Uber’s price-estimate guidance distinguishes pricing from confirmation, while Lyft explains that real-time conditions can change a quote. Show a route-dependent fare on the selection screen, label the mock amount, and explain route changes. Do not show a made-up quote as a live home-screen price.
- **Now versus later.** Bolt separates on-demand from scheduled travel. Give scheduling a clear date/time entry and an explicit review step. Rakky’s own current scheduling limits take precedence over any competitor’s lead times.
- **Safety is part of the trip.** Uber Nigeria and Lyft give users driver/vehicle information and ways to share the journey. Show driver, rating, plate, car, contact and sharing in the active-trip view. Keep a persistent safety destination.
- **Post-trip confidence matters.** Uber’s receipt and lost-item guidance makes the individual trip the starting point for receipts and support. Let history open a receipt with contextual help.
- **Secondary services stay secondary.** Bolt and Uber expose additional services without removing the primary ride action. Rakky’s supported courier and schedule offerings become three clear shortcuts.
- **A browser experience must be usable on its own.** Uber explicitly supports browser booking. Offer a web booking path alongside the app entry, rather than requiring an app download to understand the proposal.

## Official sources

- [Uber Nigeria ride](https://www.uber.com/ng/en/ride/)
- [Uber online ride booking](https://www.uber.com/us/en/ride/how-it-works/request-an-uber-ride-without-the-app/)
- [Uber price estimates](https://www.uber.com/us/en/price-estimate/)
- [Bolt rides](https://bolt.eu/en/rides/)
- [Bolt scheduled rides](https://bolt.eu/en/rides/features/scheduled-rides/)
- [Uber Nigeria rider safety](https://www.uber.com/ng/en/ride/safety/)
- [Lyft rider safety](https://www.lyft.com/safety/rider)
- [Lyft pricing](https://www.lyft.com/blog/posts/lets-talk-about-lyft-pricing)
- [Uber receipts](https://help.uber.com/riders/article/getting-a-trip-receipt?nodeId=846f6cad-6f27-492a-9e0b-d2f056e1298e)
- [Uber lost items](https://help.uber.com/en-GB/riders/article/lost-items?nodeId=30809a3b-3521-4f0a-b088-bfa2a01f2e46)

The sources were reviewed on 22 October 2026. Availability, policies, guarantees and feature details differ by market; competitors’ commitments are not proposed as Rakky commitments.

## Existing Rakky product evidence

Read-only inspection of the sibling mobile project informed scope:

- `mobile/src/screens/shared/RiderServicesScreen.tsx`: ride, courier and scheduling entries.
- `mobile/src/screens/rider/RideSelectionScreen.tsx`: one everyday ride with four seats; cash and wallet payment; quote refresh and price-change handling.
- `mobile/src/utils/scheduleTime.ts` and the ride selection screen: scheduling from 30 minutes to 7 days ahead.
- `mobile/src/screens/rider/OngoingTripScreen.tsx`: status, driver details, vehicle, chat, call, sharing and cancellation.
- `mobile/src/utils/safetyCenter.ts`: trip summary sharing.
- Existing wallet/payment screens and services: wallet balance and activity.

This establishes product context, not an audit that each mobile feature is already available through a website-ready API. No backend integration was attempted.

## Scope represented visually

- Public welcome and sign-in entry.
- Passenger dashboard and destination entry.
- Saved-place shortcuts.
- Schedule and courier entry dialogs.
- Ride selection, quote, route preview, payment choice.
- Driver arrival and active-trip controls.
- Past rides and receipt preview.
- Wallet and top-up entry.
- Safety and help.
- Responsive desktop and mobile layouts.

Courier, authentication, receipt export, wallet funding, messaging and sharing have entry-point previews, not complete implemented journeys.

## Intentionally left for product decisions

Intercity travel appears in the reference but was not found in the current rider services. Premium ride classes, promo balances, referral rewards, passenger PIN verification, automatic safety monitoring and guaranteed pickup claims are also excluded pending confirmation. Emergency handling and response-time claims require operational agreement.

Before launch, complete the real authentication, address search, accessible map interactions, service coverage validation, fare and availability errors, matching/no-driver states, final cancellation terms, delivery recipient details and handoff flow, wallet funding, refunds, receipt export and support escalation.

## Artwork provenance

Generator: built-in ImageGen tool, default mode.

Saved artwork: `assets/rakky-city-hero.png`.

Prompt:

> Use case: stylized-concept. Create a premium 3D illustration for the hero of Rakky Ride, a Nigerian passenger ride-hailing website. A sophisticated white modern sedan with restrained forest-green #176B17 door panels and trim, front three-quarter view pointing left, large and beautifully detailed, resting on a pale green city road. Behind it, an elegant miniature Lagos-inspired city of modern midrise towers, palm trees, and one gracefully curved cable-stayed bridge, rendered in soft green-tinted ivory clay with dark green foliage. A single sculptural dark forest green location pin floats discreetly above the street. Art direction: premium product illustration, polished realistic car materials, soft studio daylight, ambient occlusion, extremely clean off-white and very pale green #EAF5E5 background. Panoramic landscape composition, car occupying lower center, skyline in upper third with ample uncluttered pale margins. Palette strictly forest green, sage, white, charcoal. NO text, NO logos, NO watermarks, NO UI, NO purple, NO garish neon. Camera slightly elevated, refined editorial website hero visual. Wide landscape aspect ratio approximately 3:2.

The hero is concept artwork, not evidence of Rakky’s fleet or a precise depiction of Lagos. The uploaded reference guided information hierarchy and composition; its purple identity and “Rider” brand were not reused.

## Validation

Desktop and mobile screenshots were rendered in Chromium. The review checks cover image loading, runtime errors, horizontal overflow, form validation, booking transition, cash/wallet selection, active-trip sharing dialog, navigation and mobile layouts. These are prototype checks, not application integration tests.

## Approval requested

Approve or revise the passenger visual direction: green treatment, layout, typography, imagery, navigation, page hierarchy and mobile adaptation. Implementation in the operational project follows design approval.

