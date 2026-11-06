# Herra Web — Web Blueprint

**Repository:** `herra-web` · **Depends on:** `ml_blueprint.md` (Herra Intelligence, called as the in-process module `lib/hi`)
**Visual source of truth:** `web_designtokens.md` (unchanged). Every visual rule in this document defers to it.

---

## 0. Ground rules

- MUST, SHOULD and MAY are used in their RFC 2119 sense.
- **Build goal:** a complete, demonstrable Herra web app that a small student team can finish on **free tiers with no payment method**: Vercel Hobby and Supabase Free.
- **One app, one database.** The web tier owns identity, data, presentation and workflow. It also builds environmental profiles from the Environment Grid (§9). Model inference, support, readiness, health and reliability are computed only by `lib/hi` (ML blueprint §14). Web code never reimplements them.
- **Priorities.** Every screen and feature is tagged **P1** (build), **P2** (build if time allows) or **Deferred** (not in this build). §22 lists everything deferred and how to restore it.
- **Parallel work.** The web build does not wait for the model. Until the real model is promoted, `lib/hi` is a **stub** that returns the example responses in ML §14.8.
- This is a college project, not a production service. Hardening, scale and compliance work that exists only for production has been cut.

---

## 1. Purpose, users and surfaces

Herra Web lets smallholder farmers and cooperative administrators use Herra's crop suitability and field health workflows.

| Role | Primary surface | Core jobs |
|---|---|---|
| **Farmer** | Mobile-first (phone and tablet; desktop secondary) | Join a space, draw fields, capture a photo and moisture reading, run Recommend or Check-up, read results, plan planting, log outcomes |
| **Admin** | Desktop-first console | Create spaces, issue access codes, manage members, review assessments and outcomes, inspect and promote models, edit crop thresholds and health weights, watch data health, audit actions |

**The web tier owns:** authentication and roles; spaces, memberships, access codes, fields (PostGIS); environmental profiles and feature payloads; assessment records; outcomes, announcements and notifications; advisory wording; presentation.

**The web tier never owns:** model inference, support, readiness, health or reliability calculations; model promotion decisions (the database function enforces the gate); training data; geographic eligibility decisions.

---

## 2. Feature map

Every capability of the original product is accounted for. **Kept** means the same behaviour. **Changed** means the same capability by a different mechanism, with the reason stated.

| ID | Capability | Priority | Notes |
|---|---|---|---|
| F-01–03 | Sign in, sign up, forgot password; join a space by access code; onboarding | P1 | Onboarding is two steps: preferences (units, map style), then join a space. English only. |
| F-04 | Spaces with boundary, members | P1 | Announcements: P2 |
| F-05–06 | Draw, edit, archive a field; place name | P1 | Photon reverse geocode, cached |
| F-07 | Layer preview while capturing a field | P1 | Changed: values come from the Environment Grid (§9). Same layout. |
| F-08 | Field photo (camera or gallery) | P1 | Changed: EXIF is stripped in the browser by re-encoding. Geotag verification is deferred. |
| F-09 | Moisture reading (five-level slider) | P1 | Kept |
| F-10 | **Recommend**: ranked crops with suitability, reasons and warnings | P1 | Changed: GAEZ-referenced class and score. Label reads "Suitability". |
| F-11–12 | **Check-up**: Health Index, four drivers, "Consider instead" | P1 | Kept |
| F-13 | Reliability tiers | P1 | Changed: rule-based, labelled "not validated" |
| F-14 | Ranked tips | P1 | Changed: rules keyed by HI codes, admin-editable |
| F-15 | Weekly forecast strip with workable days | P1 | Forecast from Open-Meteo. Readiness from `lib/hi`. |
| F-16 | Planting window tool | P2 | Reminder: Deferred |
| F-17–19 | Entries gallery, entry detail, delete with undo | P1 | Rerun and compare: P2. Share links: Deferred. |
| F-20 | Field report (image or page) | Deferred | |
| F-21 | Offline draft queue | Deferred | |
| F-22 | Outcome log | P2 | Stored as **feedback**. It does not train the model. |
| F-23 | Analytics (suitability mix, reliability mix, field table) | P2 | |
| F-24 | In-app notifications | P1 | Kinds: `weather_alert`, `announcement` |
| F-25 | Web Push | Deferred | |
| F-26 | Weather and stress alerts | P2 | One daily cron (§13) |
| F-27–30 | Admin overview, spaces hub, access-code management, entries table | P1 | |
| F-31 | **Model Lab** | P1 | List, report, gate, champion history, promote, roll back. Compare and shadow: Deferred. |
| F-32 | Datasets list and manifest | P1 | Read-only |
| F-33 | Trigger a dataset run | Deferred | Runs are notebook runs (ML §15) |
| F-34–35 | Crop catalogue editing, advisory rules, health weights | P1 | Edits change readiness and health only |
| F-36 | Data health | P1 | Grid manifest, model status, provider checks |
| F-37 | Outcomes review queue | P2 | Review has no training effect |
| F-38 | Users and roles | P1 | Role change by an admin. Email invites: Deferred. |
| F-39 | Audit log (insert-only) | P1 | |
| F-40 | Exports (CSV, GeoJSON) | Deferred | |
| F-41 | Spectate a farmer (read-only) | P2 | |
| F-42 | Command palette | Deferred | |
| F-43 | Light and dark themes, reduced motion | P1 | Density and accent options: Deferred |
| F-44 | Languages | P1 / Deferred | English now. Strings use i18n keys, so Filipino can be added later. |
| F-45 | Satellite imagery analysis | Out of scope | |
| F-46 | Outcome-based reliability validation | Deferred | Needs a harvest season |
| F-47 | Labelled field-campaign tooling | Retired | |
| F-48 | Environmental data for an assessment | P1 | From the Environment Grid and Open-Meteo |

---

## 3. Architecture

```
 Browser (farmer PWA / admin console)
        │
        ▼
 Next.js on Vercel Hobby  ─────────────────────────────►  Supabase Free
   pages · server actions · route handlers                  Postgres + PostGIS · Auth · Storage
   ├─ lib/env   field polygon → Environment Grid → feature payload     (RLS on every table)
   ├─ lib/hi    assess() · readiness() · registry       ◄── model files in Storage (hi-models)
   └─ outbound: Open-Meteo forecast · Photon · map tiles
```

The browser never talks to Open-Meteo, Photon, the model files or the service-role key.

### 3.1 Stack

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router), React, TypeScript (strict). Pin the major version at project start. |
| Styling | CSS variables generated from `web_designtokens.md`, exposed to Tailwind. No raw hex values in components. |
| Components | Sourced as specified in `web_designtokens.md` |
| Data | Server components and server actions. Supabase JS with `@supabase/ssr`. |
| Forms | React Hook Form with Zod, shared between client and server |
| Maps | Leaflet, Leaflet-Geoman, Turf. Satellite, Dark and Light styles behind one switcher, using free tile styles that need no key. Attribution always visible. |
| Icons and motion | Phosphor icons and the custom crop set. CSS and Web Animations. Reduced-motion switch. |
| i18n | next-intl, English only |
| Hosting | Vercel Hobby, with a preview deployment per pull request |
| Database, auth, storage | One Supabase Free project (shared with the `hi_*` tables) |

### 3.2 Trust boundaries

| Boundary | Rule |
|---|---|
| Browser → server | Supabase session cookie. Every mutation is a server action or route handler validated with Zod. |
| Server → Supabase | The service role is used only in server code that needs it, never in client bundles. |
| Browser → Supabase | Anon key with RLS. |
| Server → providers | Open-Meteo and Photon from the server only, cache first. |

---

## 4. Repository layout

```
herra-web/
  package.json  tsconfig.json  next.config.ts  vercel.json  ATTRIBUTIONS.md
  app/
    (auth)/        sign-in · sign-up · forgot-password · join/[code] · onboarding
    (farmer)/farmer/…     mobile-first shell
    (admin)/admin/…       desktop shell
    api/cron/daily · api/admin/models/[id]/promote
  components/  ui/ · domain/ · map/
  lib/
    supabase/   client.ts · server.ts · middleware.ts
    env/        grid.ts · profile.ts · forecast.ts · normalize.ts
    hi/         (the model module, ML §14; includes a stub mode)
    spec/       feature_spec.json (copied from the ML repo) · crops.json
    geo/        validate.ts · area.ts · thumb.ts · geohash.ts
    units/format.ts · i18n/en.json · codes.ts · security/rate-limit.ts · hmac.ts
  data/grid/    grid.bin.gz · grid.json            (built by the ML pipeline)
  db/migrations/   SQL, applied with the Supabase CLI or SQL editor
  styles/      tokens.css · globals.css
  tests/       hi/ (parity) · db/ (RLS checks) · e2e/ (one happy path)
  web_designtokens.md
```

---

## 5. Data model

All tables are in `public` on the one Supabase project. **RLS is enabled on every table.** The `hi_*` registry tables are defined in ML §13.1.

| Table | Key columns | Purpose | Read | Write |
|---|---|---|---|---|
| `profiles` | `id` (= auth user), `role` (`farmer` \| `admin`), `display_name`, `timezone` (default `Asia/Manila`), `settings` (jsonb: units, temperature unit, area unit, theme, motion, map style, notification toggles) | Account and preferences | self; admins | self (not `role`); admins (`role`) |
| `spaces` | `id`, `name`, `description`, `boundary` (Polygon 4326), `status`, `crop_focus` (text[]), `place` (jsonb), `alert_thresholds` (jsonb), `thumb` (SVG text) | Cooperative regions | members; admins | admins |
| `space_members` | `space_id`, `user_id`, `joined_at`, `via_code_id` | Membership | members; admins | `join_space`; admins |
| `access_codes` | `id`, `space_id`, `code_hash`, `code_hint`, `expires_at`, `max_uses`, `uses`, `revoked_at`, `created_by` | Join codes (hashed) | admins | admins; `join_space` |
| `fields` | `id`, `space_id`, `owner_id`, `name`, `geom` (Polygon 4326), `area_ha`, `centroid`, `place` (jsonb), `current_crop`, `archived_at`, `thumb` (SVG text) | Field geometry | owner; space admins | owner |
| `assessments` | `id`, `field_id`, `user_id`, `profile_id`, `mode`, `status` (`ok` \| `degraded` \| `abstained` \| `failed`), `idempotency_key` (unique), `request` (jsonb), `response` (jsonb), `model_id`, `top_crop_id`, `top_class`, `top_score`, `reliability_tier`, `moisture`, `current_crop`, `photo_path`, `rerun_of`, `deleted_at`, `created_at` | Assessment records and denormalised card fields | owner; space admins | owner (create); system |
| `outcomes` | `id`, `field_id`, `assessment_id`, `user_id` (all `ON DELETE SET NULL`), `crop_id`, `result_tag` (`good` \| `average` \| `poor` \| `failed`), `season_end`, `note`, `review_status`, `reviewed_by`, `reviewed_at` | Farmer feedback (not training) | owner; admins | owner (create); admins (review) |
| `announcements` | `id`, `space_id`, `title`, `body`, `created_by` | Space broadcasts | members | admins |
| `notifications` | `id`, `user_id`, `kind`, `title_key`, `params`, `route`, `read_at` | In-app notifications | self | system; self (`read_at`) |
| `advisory_rules` | `id`, `trigger_code`, `severity`, `text_key`, `active`, `updated_at` | Tip rules keyed by HI codes | members (via server) | admins |
| `audit_log` | `id`, `actor_id`, `action`, `target_type`, `target_id`, `meta`, `created_at` | Insert-only | admins | system only |
| `rate_limits` | `key`, `window_start`, `count` | Access-code attempts and assessment quota | server | server |
| `app_settings` | `key`, `value` (jsonb) | Global defaults (heat and rain thresholds) and last provider check results | admins (via server) | admins |

**Storage buckets** (private): `field-photos` and `hi-models`. Photos are served through signed URLs only.

**Removed from the earlier design** (nothing replaced them with a table): provider and normals caches (the grid is the cache), geocode cache (HTTP caching), environment profile table (the profile lives in `assessments.request`), invites, share links, push subscriptions, notification requests.

### 5.1 Geometry rules

A trigger on `fields` enforces, and the server re-checks:

- `ST_IsValid(geom)` is true (this also rejects edges that cross).
- Area is at least 0.03 ha and at most 500 ha. The trigger sets `area_ha`.
- The field lies within its space's boundary (`ST_Within`).

A trigger on `spaces` enforces a valid boundary of at least 2 ha. The client validates for feedback only. **The database is the authority.**

### 5.2 Quotas

| Quota | Limit |
|---|---|
| Assessments per user per hour (failed ones do not count) | 30, counted from `assessments` |
| Access-code attempts | 5 per user per minute and 20 per IP per minute, then a 15-minute lockout, in `rate_limits` |

---

## 6. Authentication, roles, spaces and access codes

### 6.1 Identity

- Supabase Auth, email and password. Sessions in secure HTTP-only cookies via `@supabase/ssr`.
- The role lives in `profiles.role`. Sign-up always creates a `farmer`.
- The first admin is created by a bootstrap SQL seed. Later admins are made by an existing admin in Admin → Users. There are no email invites.
- Supabase's built-in email sender is heavily rate-limited on the free plan (check the current limit). For demos, turn off email confirmation, or add a free SMTP provider.

### 6.2 Access codes

| Aspect | Rule |
|---|---|
| Format | Eight characters, Crockford base32, shown as `HRA-7K2Q-9M4D` |
| Generation | Server-side, cryptographically random |
| Storage | `HMAC-SHA256(pepper, normalised code)` plus the last four characters as `code_hint`. The plain code is shown once, at creation or rotation. |
| Normalisation | Uppercase, strip prefix and dashes, map I and L to 1, O to 0, reject U |
| Redemption | `join_space(code)` is a `SECURITY DEFINER` function. It checks expiry, revocation, use limit and existing membership, then inserts the membership and increments `uses` in one transaction. |
| Errors | Specific messages only after a hash match. A non-matching code gets one generic message. |
| Reveal and rotate | An admin can reveal the code once per session (audit-logged). Rotate creates a new code and invalidates the old one. |

### 6.3 Spectate (P2)

An admin opens a farmer's pages under `/admin/spectate/[userId]/…`. The server writes an audit row first and renders the farmer shell with a persistent banner. Every mutation is rejected server-side while spectating. RLS already gives admins read access.

---

## 7. Routes and screens

Route names match the original product. Shells and layouts follow `web_designtokens.md`.

### 7.1 Farmer

| Route | Priority | Purpose |
|---|---|---|
| `/sign-in`, `/sign-up`, `/forgot-password`, `/join/[code]`, `/onboarding` | P1 | Access |
| `/farmer` | P1 | Dashboard: averages, field status rings, top crops, this week, recent entries |
| `/farmer/analyze` | P1 | Four-step flow: field, type, photo, details |
| `/farmer/analyze/processing/[id]` | P1 | Processing orbit and layer status |
| `/farmer/entries`, `/farmer/entries/[id]` | P1 | Gallery with filters; detail with photo and map toggle. Rerun, compare: P2. |
| `/farmer/fields`, `/farmer/fields/new`, `/farmer/fields/[id]`, `/farmer/fields/[id]/edit` | P1 | Fields |
| `/farmer/spaces`, `/farmer/spaces/[id]` | P1 | Joined spaces; announcements: P2 |
| `/farmer/notifications`, `/farmer/settings` | P1 | |
| `/farmer/analytics` | P2 | Suitability mix, reliability mix, field table |
| `/farmer/tools`, `/farmer/tools/compare`, `/farmer/tools/planting-window`, `/farmer/tools/outcomes` | P2 | Tool index and tools |

### 7.2 Admin

| Route | Priority | Purpose |
|---|---|---|
| `/admin` | P1 | Overview: counts, champion, data health, live activity (refreshed on load) |
| `/admin/spaces`, `/admin/spaces/new`, `/admin/spaces/[id]/[tab]` | P1 | Hub tabs: overview, members, access-codes, fields, entries, settings. Announcements tab: P2. |
| `/admin/entries`, `/admin/entries/[id]` | P1 | Assessments across spaces. Reprocess: P2. |
| `/admin/models`, `/admin/models/[id]` | P1 | Model Lab |
| `/admin/datasets` | P1 | Dataset list and manifest (read-only) |
| `/admin/crops` | P1 | Crop catalogue and threshold edits |
| `/admin/advisory` | P1 | Advisory rules and health weights |
| `/admin/data-health` | P1 | Grid manifest, model status, provider checks |
| `/admin/users`, `/admin/audit`, `/admin/settings` | P1 | Roles; insert-only log; global thresholds |
| `/admin/analytics`, `/admin/outcomes` | P2 | Cross-space analytics; outcome review |
| `/admin/spectate/[userId]/*` | P2 | Read-only farmer view |

Overlays (sheets, dialogs, toasts) render inside the app root, never in a portal on `<body>` (`web_designtokens.md` R11).

---

## 8. Map and geometry

- `MapView` is a client component loaded with a dynamic import, so Leaflet is not in the initial bundle. Three tile styles (Satellite, Dark, Light) behind one switcher. Controls follow `web_designtokens.md` §7.
- **Drawing rules:**

| Rule | Field | Space |
|---|---|---|
| Minimum corners | 3 | 3 |
| Minimum area | 0.03 ha | 2 ha |
| Maximum area | 500 ha | — |
| Edges may not cross | Yes | Yes |
| Must lie inside | The chosen space boundary | — |

- Geoman handles drawing and editing. Turf gives live area, perimeter and self-intersection feedback. Invalid shapes turn risk-coloured with a reason chip.
- Snap distance 14–16 px. Midpoints add corners. Undo steps back one vertex. **Quick sketch** drops an editable rectangle. **Locate me** flies to a pulsing dot.
- **Keyboard alternative (required):** an editable list of vertices with coordinate entry, shown below the map.
- **Place names:** Photon reverse geocoding through a server proxy, coordinates rounded to four decimals, cached 30 days with HTTP caching. Show "© OpenStreetMap contributors" wherever names appear. The public Photon instance is for low volume only, which is fine for a college project.
- **Thumbnails:** generated in the browser as a small SVG of the polygon when a field or space is saved, and stored in `thumb`. Server-side map snapshots are not built.

---

## 9. Assessment orchestration

### 9.1 Environmental profile (`lib/env`)

The profile for a field is built **entirely from files in the repository plus one forecast call**. There are no live soil, terrain or climate providers.

1. **Load the grid once per server instance.** `grid.ts` reads `data/grid/grid.bin.gz`, decompresses it, and checks `grid.json`.
2. **Aggregate over the field polygon** with the rule in ML §7.2: grid cells whose centres lie inside the polygon, capped at 400 by deterministic stride, centroid cell as the fallback, mean of non-null values.
3. **Normalise** by dividing each plane by its scale factor. Check each value against the bounds in `feature_spec.json`. Out-of-bounds becomes null.
4. **Attach provenance** to every non-null value from `grid.json`: source, unit, period and kind.
5. **Profile ID:** `p_` + a hash of the feature values and the schema hash. A field outside the grid has all-null features. The profile stays valid, and `lib/hi` abstains.

**Forecast.** The server requests seven daily values from Open-Meteo at the field centroid, timezone `Asia/Manila`, cached 3 hours per geohash-6 cell. Fields map to the `conditions` shape in ML §14.5: `precipitation_sum` → `rain_mm`, `precipitation_probability_max` → `rain_prob_pct`, `temperature_2m_min` → `temp_min_c`, `temperature_2m_max` → `temp_max_c`, `wind_speed_10m_max` → `wind_kmh` (km/h) and `et0_fao_evapotranspiration` → `et0_mm`. The forecast is best effort. If it is missing, the assessment runs without `conditions`, and readiness is hidden.

### 9.2 Assessment flow (synchronous)

The whole flow runs in one server action and normally takes a few seconds, so there is no queue and no Realtime subscription.

1. **Create.** The client submits a capture: field ID, mode, current crop (check-up), moisture (1–5), photo path and an idempotency key (UUID). The server validates with Zod, checks membership and the hourly quota. A duplicate key returns the existing row.
2. **Profile and forecast** are built in parallel (§9.1).
3. **Payload.** The server assembles the feature payload: profile ID, schema hash, grid hash and provenance. Candidates are all active crops in the roster. A check-up scores the full roster so `consider_instead` can be found. The current crop must be in the roster.
4. **Assess.** Call `assess()` from `lib/hi` with `request_id` = the new assessment ID. When a forecast exists, pass `conditions` and `include_readiness: true`. Check-up adds `current_crop` and `observed_moisture`.
5. **Store.** Insert the `assessments` row with the request, response, status (`ok`, `degraded` or `abstained`), model ID and the denormalised top-crop and reliability fields.
6. **Fail safely.** On `model_unavailable` or `internal_error`, store the row as `failed` with the retryable flag. A failed row does not count against the quota.
7. **Processing view.** The ring animates while the action runs and holds for at least about one second so the animation completes. Layers read as "reading" until the response arrives, then settle from the profile's provenance and the response's warnings. The view never invents progress.

| Stored status | Processing view |
|---|---|
| `ok` | Ring completes with a check. Opens the entry after about one second. |
| `degraded` | Ring completes with a heat-coloured note. Opens the entry. |
| `abstained` | Ring completes with a shield-slash. Opens the entry, which explains what is missing. |
| `failed` | Ring stops. Retry button shown. |

### 9.3 Reruns (P2)

A rerun creates a new assessment with `rerun_of`. It reuses the stored payload when the schema hash and grid hash still match, and otherwise rebuilds the profile. The original record is never modified. Comparisons use stored payloads and responses, so results stay reproducible after the model changes. An admin's **Reprocess** is a rerun on the farmer's behalf, owned by the same farmer, with an audit row.

---

## 10. Using `lib/hi`

- Server code imports `assess`, `readiness`, `crops`, `featureSpec` and `modelInfo` from `lib/hi`. The browser never imports it.
- **Specification guard.** On first use per instance, and again every few minutes, compare the local `feature_spec.json` hash and the grid manifest hash with the champion's `feature_schema_hash` and `grid_hash`. On a mismatch, or when no champion is loaded, assessments are disabled and the banner `feature_spec.mismatch` or `model.unavailable` is shown. The UI does not guess.
- **Error mapping:**

| Error code | Web behaviour |
|---|---|
| `validation_failed`, `feature_payload_invalid` | Field-level message |
| `unit_mismatch`, `feature_schema_mismatch` | Treated as a configuration fault. Assessments disabled and banner shown. |
| `unsupported_crop` | Crop removed from the request and retried once if the user confirms |
| `conditions_invalid` | Retry once without `conditions`. Readiness hidden with the usual note. |
| `model_unavailable`, `internal_error` | Status `failed`, retry button |

- **Caching:** champion info 60 seconds; crop roster and config 5 minutes; forecast 3 hours. Assessments are never cached. Each is a stored record.
- Unknown response fields are ignored. Unknown enum values render as a neutral "unknown" state.

---

## 11. Presentation of results

### 11.1 Codes in, copy out

HI returns codes and typed parameters (ML §14.4). `lib/codes.ts` maps every code to an i18n key. A code with no mapping is shown as "unknown". **Raw code strings are never displayed to users.**

### 11.2 Suitability wording

| Class | English |
|---|---|
| `S1` | Very suitable |
| `S2` | Suitable |
| `S3` | Moderately suitable |
| `S4` | Marginally suitable |
| `NS` | Not suitable |

The ring the mockup labelled "Match" is labelled **"Suitability"**. Ring size, animation and colours are unchanged. Only the copy changes, because the value is a reference-based score and not a match percentage.

### 11.3 Mandatory disclaimer

Every assessment screen carries the text key `assess.reference_disclaimer`, with a `reference` badge. It is never hidden behind a tooltip.

> "Reference-based estimate from GAEZ suitability data and environmental datasets. This is not a field test or a guarantee of yield."

### 11.4 Reliability

- Tier badge: High, Medium or Low, in the mockup colours.
- The detail sheet lists four components in plain language: **Data completeness**, **Input quality**, **Typicality** (how typical the inputs are compared with the training data) and **Model confidence**.
- Copy: "Rule-based. Based on data completeness and how typical the inputs are. Not validated against field outcomes yet." It must never say a tier predicts accuracy.

### 11.5 Statuses

| Status | Presentation |
|---|---|
| `ok` | Full ranking |
| `degraded` | Ranking under a banner listing each warning in plain language, except the informational `reference.estimate`. Reliability is capped at Medium by HI. |
| `abstained` | **No ranking is shown.** The screen explains what is missing and offers Retry. A field outside the Environment Grid area says that environmental data could not be read for that location. |
| `failed` | Retry, with a note that the attempt did not count against the quota |

### 11.6 Explanations, check-up and readiness

- Each ranked crop lists up to three upward and three downward factors. Each maps to a feature label and a direction. Magnitudes show as signed values with two decimals.
- Check-up shows the Health Index ring with its band (Thriving, Steady, Watch, At risk), four driver rings (Fit, Water, Thermal, Soil), a dash with a note when Water was omitted, and a "Consider instead" card when present. Tips come from `advisory_rules`. The moisture reading is shown as the farmer's own reading.
- The seven-day strip shows workable days and readiness per crop. It is hidden, with a note, when `readiness.unavailable` is present.

### 11.7 Units, provenance and typicality

- HI returns SI values. `lib/units/format.ts` converts for display (metric or imperial, °C or °F, hectares or acres) and nowhere else.
- Provenance labels: **Measured** (`observed`), **Modeled** (`modeled`), **Reanalysis** (`reanalysis`), **Derived** (`derived`), **Forecast** (`forecast`). A modeled value is never presented as a field measurement.
- Typicality wording: "Typical for the training data", "Unusual compared with the training data", "Atypical: unlike most of the training data". These describe representation only.

---

## 12. Feedback and outcomes (P2)

- The outcome form asks for the field, the crop planted (pre-filled), the result (good, average, poor, failed), season end (this week, this month, last month, earlier) and an optional note.
- Before submission it shows: "Your outcome helps us review the model later. It does not change today's results." This must not be weakened.
- Admins mark each outcome `reviewed` or `rejected` (with a reason). Review has no effect on any model. Counts appear as "outcomes received" and "outcomes reviewed", never as accuracy.

---

## 13. Notifications and weather alerts

- **In-app notifications** (P1). Kinds: `weather_alert` and `announcement`. Each row stores a translation key and parameters, never prose. Read state is per user. An announcement fans out to members as one batched insert.
- **Weather alerts** (P2). The daily cron route reads each space's centroid, fetches the forecast, calls `readiness()` with the space's alert thresholds (`spaces.alert_thresholds`, defaulting to `app_settings`), and creates a notification for members when `alert.*` codes are returned.
- **Daily cron** (`/api/cron/daily`, protected by `CRON_SECRET`). One job does all of this: run one cheap database query so the Supabase project does not pause, send weather alerts, delete soft-deleted assessments older than 30 days, and purge old `rate_limits` rows. Vercel Hobby runs cron at most once a day, with timing only within the hour. Do not design anything that needs a shorter interval.
- Web Push and planting reminders are deferred.

---

## 14. Admin console

| Screen | Content |
|---|---|
| **Overview** | Space, farmer and field counts; assessments over 30 days; average reliability tier mix; current champion; data health summary |
| **Model Lab** | List with status, macro-F1 and dataset. Detail shows the report (metrics, confusion matrix, per-class table, feature importance, holdout and support-band results), the gate table with each criterion, and champion history. **Promote** and **Roll back** both require a reason. Promote is disabled, with the failed criterion named, when the gate has not passed. Promote runs the server-side pre-check (ML §13.2) before calling the database function. |
| **Datasets** | List and manifest view: sources, versions, counts, rejection reasons and split summary |
| **Crops** | Roster from `hi_config`. Threshold edits update the row, bump its version and write an audit entry. Notice: "This changes readiness and health only. Reference labels are not affected." |
| **Advisory** | Rules with an active toggle, and the four health weights (must sum to 1) with a live preview ring before saving |
| **Data health** | Environment Grid manifest (sources, versions, retrieval dates, `grid_hash`); champion `model_status`; **Test now** buttons for Open-Meteo and Photon with latency and last result, saved in `app_settings` |
| **Users** | Roles with a confirm dialog and an audit row |
| **Audit** | Insert-only log, filtered by actor, action and target |
| **Outcomes** (P2) | Review queue |

All admin mutations write an audit row.

---

## 15. Security and privacy

- RLS on every table, written per role and space membership. A script in `tests/db` checks the main cases (§18).
- The service role is used only in server code. A lint rule forbids importing it into client code.
- Every mutation validates input with Zod. Server actions provide CSRF protection. Cookies are `Secure`, `HttpOnly` and `SameSite=Lax`.
- A basic Content Security Policy allow-lists the map tile hosts and Photon. No inline scripts.
- `join_space`, `hi_promote_model`, `hi_rollback` and audit writes are `SECURITY DEFINER` functions with an explicit `search_path`.
- **Photos:** the browser downsizes to at most 1280 px and re-encodes as JPEG, which drops EXIF metadata. Photos go to the private `field-photos` bucket and are served through signed URLs.
- **Privacy:** field geometry and user identity stay in the web tables. `lib/hi` receives only feature values and documented metadata, never raw rows or user IDs.
- Secrets live only in Vercel environment variables.

---

## 16. Design-system binding

`web_designtokens.md` is normative for every visual decision: type, colour, radius, motion, layout, icon weights, component anatomy, z-index and responsive behaviour. This blueprint does not restate any of those values. Where the two differ, the tokens document governs visuals and this document governs behaviour.

- **Mockup-only elements that must not ship:** stage bar, device and browser frames, status bar, dynamic island, home bar, the demo scenario menu, haptic frame shake, the in-memory store, the hash router, the procedural scene generator and the mockup's seed data.
- **Permitted copy changes:** "Match" becomes "Suitability" (§11.2), the reference disclaimer is added (§11.3) and reliability wording gains "not validated" (§11.4). Geometry, colours, motion and layout stay identical.

---

## 17. Non-functional targets

Targets, not guarantees. Measure once before the demo.

- Warm assessment (profile, forecast and `assess`) under about 3 s. Cold start under about 6 s.
- Initial route bundle kept small by dynamic-importing Leaflet and Geoman.
- Keyboard-operable drawing (the vertex list), visible focus, text contrast per the tokens, and a reduced-motion switch.
- Current evergreen Chrome, Safari and Firefox on phone and desktop.

---

## 18. Testing (proportionate)

| # | Check | How |
|---|---|---|
| W-T1 | `lib/hi` parity, polygon aggregation parity and spec hash (ML T1–T4) | Unit tests against `golden.json` and `golden_polygons.json` |
| W-T2 | RLS: a farmer cannot read another farmer's fields or assessments; cannot change their own role; a non-member cannot read a space; an admin can read all | A SQL script run against the project |
| W-T3 | Access codes: expired, revoked, used-up and wrong-code cases; the attempt limit locks out | Unit tests on `join_space` and the limiter |
| W-T4 | Geometry triggers reject crossing edges, areas out of range and fields outside their space | A SQL script |
| W-T5 | One end-to-end happy path: sign up, join a space, draw a field, run Recommend, open the entry | One Playwright test (recommended) |

Before the demo, also check manually: the keyboard vertex list on the draw screen, the four statuses (force each with a stub response), light and dark themes, and phone and desktop widths.

**Not built:** visual regression baselines, Lighthouse CI, automated accessibility suites, load and soak tests, pgTAP matrices, integration matrices and release drills.

---

## 19. Deployment

| Component | Platform |
|---|---|
| Web app | Vercel Hobby, one project. The grid file is included in the server bundle (`outputFileTracingIncludes` for `data/grid/**`). |
| Database, auth, storage | One Supabase Free project |
| Scheduled job | One Vercel cron entry (daily) |
| Domains | The default `*.vercel.app` domain |

**Environment variables** (Vercel, server side unless noted):

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public by design. RLS protects data. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only |
| `HMAC_PEPPER` | Access-code hashing |
| `CRON_SECRET` | Authorises the cron route |
| `PHOTON_BASE_URL`, `OPEN_METEO_BASE_URL` | Optional overrides |

**Migrations:** SQL files in `db/migrations`, applied with the Supabase CLI or pasted into the SQL editor in order. Keep the files in git so the schema can be rebuilt on a fresh project.

**Release:** push to `main` deploys to Vercel. Roll back by re-promoting the previous deployment. Model changes never need a deploy.

---

## 20. Build order

The web build runs alongside the ML milestones (ML §18). Phases are ordered, and each has an exit check.

| Phase | Scope | Exit check |
|---|---|---|
| **W1. Foundation** | Supabase schema, RLS and triggers; auth and roles; spaces, access codes and membership; map and field drawing; thumbnails; settings; `lib/hi` stub | A farmer can sign up, join a space and save a field. W-T2 to W-T4 pass. |
| **W2. Analysis** | Environment Grid lookup and profile; forecast; analyze flow and processing view; entries gallery and detail; dashboard; reliability, explanations, check-up, readiness strip; swap the stub for the real `lib/hi` | A real assessment runs end to end in all four statuses. W-T1 passes. |
| **W3. Admin and finish** | Admin shell, overview, spaces hub, Model Lab, datasets, crops, advisory, data health, users, audit; notifications and the daily cron; P2 items as time allows; deploy; demo script | Promote and roll back a model from the UI. The deployed site passes W-T5. |

Suggested effort for 2–3 people, as a planning guess and not a measurement: W1 about 1.5–2 weeks, W2 about 1.5–2 weeks, W3 about 1.5–2 weeks. Re-estimate at the end of W1.

---

## 21. Risks

| Risk | Handling |
|---|---|
| Supabase pauses an idle free project | The daily cron query. Restore from the dashboard if it ever pauses. |
| The real model is late | The stub keeps the web build moving. Swap when ML M2 passes. |
| Free email sending is too limited for sign-ups | Disable email confirmation for the demo, or add a free SMTP provider. |
| Map tile terms limit heavier use | Free styles with attribution are fine for a student project. Move to a keyed provider before any wider release. |
| Open-Meteo rate limits | Cache 3 hours per cell. A missing forecast removes readiness only. |
| Public Photon instance is slow or limited | Cached. A missing place name does not block anything. |
| Scope creep | P1 first. P2 only when W3 is otherwise done. Deferred means deferred. |

Open-Meteo is free for non-commercial use only. Keep that in mind if the project ever leaves the classroom.

---

## 22. Deferred and cut (and how to restore each)

| Cut | Restore by |
|---|---|
| Separate HI API service, API keys, OpenAPI-generated client, contract freeze | Wrap `lib/hi` in an API route or a Python service. The JSON shapes are unchanged. |
| Live SoilGrids, DEM and ERA5-Land providers and caches in the web tier | Replace `lib/env/grid.ts` with provider adapters. The feature spec is unchanged. |
| Background processing, Realtime status, 15-minute jobs | Add a queue and Realtime subscription. Needs a paid Vercel plan for frequent cron. |
| Web Push, planting reminders, "notify me when data is back" | Add push subscriptions and a notification-requests table. |
| Share links, field report, CSV and GeoJSON exports | Add the `share_links` table and report route. |
| Offline draft queue | Add IndexedDB drafts and replay with idempotency keys. |
| Command palette, density and accent options, Filipino translation | Add them later. Strings already use i18n keys. |
| Email invites for admins | Add an `invites` table and a single-use link flow. |
| Photo geotag verification, server-side map thumbnails | Add server-side EXIF check and snapshot rendering. |
| Model compare, shadow evaluation, admin-triggered pipeline runs | See ML §20. |
| Visual regression, Lighthouse CI, automated accessibility and load testing, separate dev/staging/prod environments | Add when the project becomes a real service. |

**Attribution.** `ATTRIBUTIONS.md` follows ML §21, plus: © OpenStreetMap contributors (Photon), Open-Meteo, and the credit line of each map tile provider.
