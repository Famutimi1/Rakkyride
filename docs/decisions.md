# Implementation decisions — 9 October 2026

Approved by the request: separate Next.js / TypeScript project named rakkydashboard, using the existing Rakky brand and Express backend. Core dependencies: Next, React, TypeScript; existing Zustand remains the cross-screen state manager. No UI kit, ORM, chart library or new infrastructure added.

The canonical source specification is ../ride_app/docs/design/admin-dashboard-implementation-spec.md. A reference copy is included here; its original relative links resolve in ride_app.

Theme adapter reads the existing mobile colors.ts exports and generates CSS variables with a source checksum. Generated tokens are committed so the dashboard can build independently. Run npm run sync:brand after changes in the source repository. No independent palette is authored.

Pending owner decisions from section 14: domain-owned backend placement versus older matching-only rule; current schema/status baseline; staff provisioning/session policy; scopes and step-up; audit extensions; document serving/storage; support/safety storage and operations; interventions; commercial values; returned-courier refunds; multi-instance Socket.io adapter.

Development fixtures are explicitly labeled and opt-in; production refuses fixture mode. No fixture money action changes data or calls a provider. Live data and staff authorization remain disabled until their integration is implemented and verified. Deferred P1/P2 modules are omitted from pilot navigation.

API inventory and initial TypeScript contracts are committed before page implementation. Proposed endpoints must not be substituted with participant-only mobile endpoints. See src/contracts/admin.ts. Read APIs must enforce staff scope server-side; a UI guard is insufficient.
