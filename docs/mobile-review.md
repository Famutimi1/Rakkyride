# Mobile review — 09 October 2026

## Sidebar follow-up — 10 October 2026

The desktop/tablet header now includes a collapse/expand sidebar button beside the breadcrumb. Browser checks on the authenticated local dashboard covered both states at 1440px, 1061px and 768px, plus the phone drawer at 390px. The rail measured 72px and the expanded menu 240px; document widths matched the tested viewports. Enter and Space toggled the control, accessible labels updated, and the collapsed preference survived navigation to Riders & customers and a reload. The small-tablet header uses an icon search control to keep the toggle and breadcrumb visible.

At 390px, the desktop toggle was hidden and the drawer retained labeled links even with a saved collapsed preference. Opening it locked background scrolling; Escape closed it, restored scrolling and returned focus to the menu opener. The original viewport was restored after testing. Screenshots: `screenshots/sidebar-expanded-desktop.png`, `screenshots/sidebar-collapsed-desktop.png`, and `screenshots/sidebar-expanded-tablet.png`. These were read-only UI checks; no database records were changed.

## Current table behavior

The desktop table layout now remains in place on phones. Column headings stay visible, rows keep their column alignment, and only the table container scrolls horizontally. The card behavior described in the earlier review below has been superseded.

All 21 navigation pages were opened individually again at 390px and 320px, with More filters expanded where available. All 42 page/control overflow checks passed. Every populated table retained `display: table` and `table-header-group` headings. Measurements are in `scrolling-table-review.json`. Keyboard ArrowRight scrolling moved the rider table within its container; the 390px viewport stayed 390px wide while the table content extended to 661px. Screenshot: `screenshots/mobile-scrolling-table.png`.

This layout review temporarily used fictional development preview records. `DASHBOARD_PREVIEW=false` was restored afterward. Protected real-database browser checks await the owner's initial staff account selection; no role or financial record was changed by these UI checks.

## Earlier responsive review

Google login follow-up: the official Google button was checked on the login page at 320px, 390px and desktop width. The login panel now constrains its grid column so Google's iframe cannot force page overflow. Document widths matched 320/390px, with button containers 272/342px. Screenshots: `screenshots/google-login-desktop.png` and `screenshots/google-login-mobile.png`. Google's configured client still rejects the local origin; see `google-sign-in.md` for the required Console setting. No real-account Google login was attempted.

All 21 navigation pages and nine reachable detail/creation pages were opened individually at 390×844 and 320×740. For every page, document width matched viewport width and no main content extended outside the viewport. Measurements are saved in `mobile-review.json`; screenshots are in `screenshots/mobile`.

Main pages: Overview, Live operations, All trips, Scheduled rides, Courier deliveries, Riders & customers, Drivers, Applications, Payments, Wallets & ledger, Withdrawals, Reconciliation, Support cases, Safety incidents, Ratings & feedback, Reports, Pricing, Payment settings, Audit log, Service health, Team access.

Details/creation: passenger trip DEMO-RK-1049, rider demo-user-001, driver demo-driver-001, application demo-driver-003, payment demo-pay-01, ledger demo-account-1, withdrawal demo-wd-01, new support case, new safety incident. Login was additionally checked at 320px. Preview financial detail fallbacks and empty staff/care/telemetry views are intentional; they do not simulate operational evidence.

Tables become labeled cards with all cells retained. Filters and buttons stack or wrap, touch controls use at least 44px height, inputs use 16px text to avoid focus zoom, long identifiers wrap, and dropdown popups are bounded to the viewport. Scheduled/courier view links have separate touch targets. Mobile navigation locks background scrolling, keeps focus inside the open menu, closes with Escape and returns focus to the opener.

Functional checks included dropdown keyboard/typeahead selection, a dropdown inside a modal, report GET form submission through named hidden values, directory ID filtering and clearing, preview disabled financial fieldsets, record search results, closing search to clear text and restore focus, and Light/Dark appearance. Team/audit/ratings were checked again after their filters were added. Desktop 1440×900 still uses normal tables and had no page overflow. No new React render warnings appeared after fixing server-rendered cell keys.

This was a browser responsive review, not physical-device or screen-reader certification. Preview uses fictional data and never calls operational APIs. Production cookie/CSRF/search integration was checked with the production session smoke stub; backend tests exercised real PostgreSQL in disposable schemas and temporary Redis keys. No real OTP, provider transfer, refund or staff provisioning was performed. Google Maps rendering still needs browser keys; mobile staff mutations and live provider outcomes were not exercised against real accounts.

## Pagination/filter follow-up

After the new pagination and collapsible filter controls were added, all 21 main pages were opened individually again at 390×844 and 320×740 with filter regions expanded where applicable. All 42 document/control overflow checks passed; the measurements are in `pagination-review.json`. The wide toolbar and pagination summary wrap on phones, and controls retain 44px minimum touch height and 16px input text.

Functional browser checks covered Enter search while collapsed, More/Hide toggle, dropdown filter/apply, clearing filters while preserving row size, page-size keyboard selection and reset, first/middle/last pages, Previous/Next boundaries, empty totals, finance filters, and paginated trip previews. Production Next reads were separately verified with the local authenticated stub. Screenshots: `screenshots/filters-pagination-desktop.png` and `screenshots/filters-pagination-mobile.png`. Previous render warnings were fixed by keying cells before server serialization and shared form children; the follow-up page sweep emitted no new warnings.

Preview remains fictional; exact API counts and authorization were tested against disposable backend PostgreSQL schemas. This is responsive browser validation, not a physical-device certification.
