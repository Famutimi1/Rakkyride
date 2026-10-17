# Dashboard Maps configuration

Local dashboard origin: `http://127.0.0.1:3015`. Google project: `rackyride-510222`.

The separate key named **rakkydashboard local browser** has website restriction `http://127.0.0.1:3015/*` and API restrictions **Maps JavaScript API** and **Maps Embed API**. Both services were enabled with owner approval. Backend/mobile keys were not reused or changed. The browser key is kept in ignored `.env.local` as `NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`; never commit credential values.

The project-owned map **rakkydashboard operations** is JavaScript/vector, map ID `5516e87ff863bd2a12c62920`, configured through `NEXT_PUBLIC_GOOGLE_MAP_ID`. The map ID is an identifier, not a secret.

Overview and estimated trip routes use Embed. Live fleet and recorded trip samples use JavaScript with advanced markers. Driver positions come from the existing Redis snapshot and expire after 30 seconds; no fresh position means no live marker. Recorded samples stay labeled as historical, never a reconstructed live route.

Next public environment values are build-time values: restart development or rebuild deployment after changing them. For production, provision a separate browser-restricted deployment key and exact HTTPS origin; never broaden the local key to arbitrary websites. Google bills actual JavaScript map usage through the configured project.

Verification: the live Lagos map rendered after activation, and the overview Embed map was checked separately. See screenshots in `docs/screenshots`.

Official setup references: [advanced marker requirements](https://developers.google.com/maps/documentation/javascript/advanced-markers/start), [key security guidance](https://developers.google.com/maps/api-security-best-practices).
