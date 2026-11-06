# Herra Web: Design Tokens

This file is the visual source of truth for the Herra web app. `web_blueprint.md` defers to it for every visual rule, and this file defers to the blueprint for behavior, scope, priorities, and mandated copy. It covers the product only: the screens a farmer or admin uses. The demo wrapper from the mockup is excluded (section 0.1).

Three sources define the design:

1. **The approved mockup**, `herra-ai-mockup.html`, sets every visual value: colors, sizes, spacing, type, motion, layout, and the copy strings. Its stylesheet is unchanged from the approved build. This file's CSS was checked line for line against the mockup stylesheet (lines 676 to 1225): every rule is present, in the same order, except the demo-chrome rules listed in section 20.
2. **`web_blueprint.md`** sets behavior, scope, and priorities. Every feature is tagged P1 (build), P2 (build if time allows), or Deferred (not in this build). Deferred features have no UI in the mockup and none in this file (section 0.2). The blueprint also fixes three copy changes and the status, reliability, provenance, and feedback wording (section 15).
3. **The early design tokens file** sets the principles and the rules the mockup does not cover: the component bank, accessibility minimums, and reduced motion. Section 3 lists every place the sources disagree and the decision taken.

Where the blueprint and this file differ, this file governs visuals and the blueprint governs behavior.

## 0. Ground rules

### 0.1 Mockup-only elements that do not ship

These elements exist in the mockup so it can run as a standalone demo. They are not part of the product (blueprint section 16).

| Element | Where in the mockup | In the product |
|---|---|---|
| Stage bar, device frames (phone and tablet), browser frame, status bar, dynamic island, home bar | `Stage`, `StageBar`, `StatusBar`, `.stage*`, `.phone*`, `.browser*`, `.statusbar` (CSS 763 to 794) | Not built. The app root fills the viewport. |
| Demo scenario menu ("Try this"), role switcher, device switcher, "Reset demo data", floating mockup button | `StageBar`, `StageFab`, `demo`, `resetDemo` | Not built. |
| Demo clock | `Clock`, `T0`, `NOW` | Real time, in the profile time zone (default `Asia/Manila`). |
| Haptic frame shake | `.haptic .screen` rule (CSS 783), the `hap` keyframes (CSS 784), and the class toggle in `haptic()` | Not built. Vibration through `navigator.vibrate` stays (section 9.2). |
| In-memory store and seed data | `S`, `subs`, `emit`, `useS`, `DB`, `initDB`, the accessors (`getUser` to `codeOf`), `FARMER_NAMES`, `SPACE_DEFS`, `FARMER_FIELDS`, `mkSpaces`, `RULE_SEED`, `MODEL_SEED`, `mkFeed` | Supabase tables, server components and server actions (blueprint section 5). |
| Hash router | `parseHash`, `go`, `back`, `goVT`, `seg`, `Link` | The Next.js App Router. The route names are unchanged (blueprint section 7). The shared-element transition (section 9.2) is kept. |
| Procedural scene generator and procedural map imagery | `sceneURI`, `SCENE_TONE`, `FAM_FIELD`, `sceneCache`, `procColor`, `paintProc`, `makeProc`, `snapshot`, `snapStyle`, and their noise helpers | Field photos come from the private `field-photos` bucket through signed URLs. Map imagery comes only from the tile providers. Thumbnails are small SVG polygons made by `polyThumb` (section 7.6). |
| Mock engine | `genLayers` to `analyze`, `decorate`, `advise`, `cmGen`, `cmMetrics`, `metricVal`, `gateOf`, `promoteModel`, `rollbackModel` | `lib/env`, `lib/hi` (a stub until the model is promoted), the gate and promotion database functions (blueprint sections 9, 10, 14). |
| Example values in admin chrome | The `alerts` array in `AdminApp`, the sample numbers in `AdminOverview` | Derived from real state. |

### 0.2 Deferred features: no UI

The mockup was aligned to the student-scope blueprint. These features are Deferred (blueprint sections 2 and 22), so the mockup does not draw them and the product does not build them. The stylesheet keeps the classes it already had (section 10.10 lists the ones no screen uses).

| Deferred feature | Blueprint ID | Not drawn |
|---|---|---|
| Command palette and the ⌘K shortcut | F-42 | The palette, the "Jump to" search button, and the shortcut |
| Share links and the field report | F-20 | Share actions on entries, the report tool, and its route |
| Offline draft queue | F-21 | Offline chip, draft badge, "Simulate reconnect", "Run in background", the offline and photo-quality settings |
| Web Push and quiet hours | F-25 | Push settings and quiet-hours controls |
| Density and accent options | F-43 | Both settings. The accent is fixed (section 6.3). |
| Filipino | F-44 | The language setting, the onboarding language step, and Filipino crop names. English only. |
| Admin email invites | F-38 | "Invite admin" and the invite flow. The join-code message is "Copy message". |
| Exports | F-40 | CSV, GeoJSON, and QR export |
| Planting reminders and "notify me when data is back" | F-16 | Both controls |
| Trigger a dataset run | F-33 | The run sheet and the pipeline-runs table. Datasets are read-only. |
| Model compare and shadow evaluation | F-31 | The compare view and the shadow controls |
| Admin Tools page and outage simulator | blueprint section 7.2 | The page and its navigation entry |
| Space analytics tab | F-23 | The tab. Announcements stay (P2). |
| Photo geotag verification | F-08 | The geotag check. The photo chip reads "Location data removed". |

### 0.3 Rules

| # | Rule |
|---|---|
| R1 | The mockup sets every visual value. Do not redesign, restyle, re-space, or re-round anything it defines. |
| R2 | The principles in section 2 win over the mockup only for accessibility minimums (section 6.5) and reduced-motion behavior (section 9.4). The blueprint wins over the mockup for behavior, scope, and mandated copy (section 1). |
| R3 | When a value is needed and no source defines it, stop and ask. Section 21 lists the open items. |
| R4 | Port the CSS as written: every class name, selector, value, and rule order. Do not convert it to utility classes. The mockup CSS stays unlayered (section 5). |
| R5 | Icons come only from `@phosphor-icons/react` at the pinned version (section 11). Crops use the custom crop set (`CropIcon`). |
| R6 | Copy comes from the mockup strings, through i18n keys (English only, next-intl). The three copy changes the blueprint permits are already in the mockup: "Match" becomes "Suitability", the reference disclaimer, and "not validated" in the reliability wording. Raw code strings are never shown to users. |
| R7 | Mockup-only elements (section 0.1) never ship. |
| R8 | Layout breakpoints come from the app root width, never from viewport media queries (section 8.4). |
| R9 | Deferred features (section 0.2) get no UI, no route, no setting, and no new CSS. |
| R10 | No raw hex values in components. Colors come from the tokens. The literals that stay literal are listed in section 6.8. |
| R11 | Overlays (sheets, dialogs, menus, toasts, tooltips) render inside the app root, never in a portal on `<body>`. The app root is `.app` (`position: relative; overflow: hidden`), so `.overlay { position: absolute; inset: 0 }` fills it. Registry overlay components are given the app root as their portal container. |
| R12 | Units convert for display only in `lib/units/format.ts`. The server returns SI values (blueprint section 11.7). |

## 1. Sources and authority

1. The mockup sets visual values (R1). The principles in section 2 set the rules the mockup does not cover.
2. The principles win over the mockup in two cases only: accessibility minimums (section 6.5) and reduced-motion behavior (section 9.4).
3. The blueprint wins over the mockup for behavior, scope, priorities, and mandated copy. Where the mockup source still contains code for a Deferred feature, the product does not port it (section 0.2). Section 3 records each case.
4. When a value is needed and no source defines it, stop and ask (R3).
5. Port the CSS as written (R4). Icons come only from `@phosphor-icons/react` at the pinned version (R5, section 11). Copy comes only from the mockup strings (R6).

## 2. Principles

These principles come from the early design tokens file. Each row shows how the build implements it and what the mockup shows.

| Principle | Rule | How the build implements it | Mockup |
|---|---|---|---|
| Canvas first | Content sits directly on the page. Structure comes from type, spacing, alignment, and hairline dividers before any surface. | Layout uses `.sec`, `.rowitem`, `.stat-row`, and `.divider`. | Matches. The Dashboard function has no `card` class uses. |
| Cards are objects | A card exists only for a discrete tappable object (entry, field, space) or an overlay. No cards inside cards. No card-grid dashboards. Two to four major surfaces per screen. | `.card` is used for objects and overlays only. | Matches in the Dashboard. Other screens to be checked (section 19). |
| Flat | No shadows on resting elements. Depth comes from the hairline, tone shift, and motion. Overlays may use one soft scrim. | Cards, buttons, inputs, rows, and chips have no shadow. | Mostly matches. Map markers keep shadows (section 3). |
| Rings, not lines | Statistics are rings, segmented bars, ranked rows, stat tables, and the confusion-matrix table. No line, area, or axis charts. | Rings, `.sbar`, `.seg8`, `.rowitem`, `.table`. | Matches. The mockup has no line, area, or column chart. |
| Expressive but calm | Large confident type, generous radius, deliberate motion. Color is rare and meaningful. | Type scale, radii, and motion catalogue in sections 6.7 and 9. | Matches. |
| Balanced space | Wide screens pair a primary pane with a secondary pane at 7:5 or 8:4. Text is capped at 68ch. Empty regions are filled with useful content. | `.twocol` (7:5 at `bp-lg`, 8:4 with `.e84`), `.cap68`. | Matches for two-pane splits. |
| Taps over typing | Farmer inputs are sliders, chips, and icon grids. Keyboards appear only in auth, search, and admin forms. | `MoistureSlider`, `CropPicker`, `.chip`, `.bigchoice`, `.codebox`. | Matches. |

## 3. Decisions where the sources differ

Each row is a conflict. The decision column states what the build does.

| Topic | Source A | Source B | Decision |
|---|---|---|---|
| Reduced motion | Mockup: collapses every duration to 0.01ms | Principles: durations ÷ 4, no orbit (docked static), springs become standard easing, number tickers jump to value | Principles win. Section 9.4 specifies the rules. |
| Text contrast | Mockup: some text colors fall below 4.5:1 | Principles: minimum 4.5:1 anywhere | Principles win for text only. Section 6.5 lists each correction. Fills, icons, and borders keep mockup values. |
| 2xl breakpoint | Mockup: 1600px | Principles: 1536px | Mockup wins: 1600px. |
| Typography | Mockup: fixed sizes per breakpoint class | Principles: fluid `clamp` scale | Mockup wins: fixed sizes (section 6.7). |
| Icon sizes | Mockup: 11, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 30, 34, 40, 44, 48, 56 px | Principles: 14, 16, 20, 24, 32, 48 px | Mockup wins. The early scale is a subset, apart from 32. |
| Icon stroke | Mockup: Phosphor regular, 16 units on a 256 grid (1.25px at 20px) | Principles: 1.5px optical stroke at 20px | Mockup wins. Phosphor regular is the stroke. |
| Motion duration: orbit | Mockup: 18s loop | Principles: 12s loop | Mockup wins: 18s. |
| Slider release | Mockup: `.mthumb` 0.36s spring curve | Principles: `spring-bounce` physics spring | Mockup wins: CSS curve. |
| Breakpoint basis | Mockup: app-root width, measured by `ResizeObserver` | Principles: breakpoint names with minimum widths | Same intent. Mockup wins on basis: app root width. Never use viewport media queries for layout (R8). |
| Grid | Mockup: content grids of 2, 3, 4, or 5 columns, and 7:5 or 8:4 splits | Principles: 4-column mobile and 12-column desktop grid | Mockup wins. The 4 and 12 column grid is not used. |
| Tab bar | Mockup: 88px total (64px plus 24px padding) | Principles: 64px plus safe-area inset | Mockup wins. On real phones the safe-area inset is also added (section 8). |
| Selected card | Mockup: 1px primary border plus 1px inset ring | Principles: 1.5px primary outline | Mockup wins. |
| List dividers | Mockup: full-width hairline under each row | Principles: inset to the text start | Mockup wins. |
| Map marker shadows | Mockup: `.pin`, `.marker-icon`, and `.bubble` have shadows | Principles: no shadows at rest | Mockup wins. The shadows keep markers readable over satellite imagery. |
| Ring component | Mockup: custom SVG ring (`Ring`) | Principles: Magic UI `animated-circular-progress-bar` | Mockup ring is kept. The Magic UI ring is adopted only if its markup matches the mockup ring exactly (section 14). |
| QR codes | Mockup: `qrcode-generator` 1.4.4 | Principles: `qrcode.react` | Mockup wins. The module output must match. |
| Tailwind | Mockup: not used | Principles: Tailwind v4 is the foundation | Tailwind is required by coss ui and is kept. Mockup CSS is loaded unlayered so it wins over Tailwind's layers (section 5). |
| Haptic jolt | Mockup: the screen shakes 1px on every haptic | Blueprint section 16: the haptic frame shake does not ship | Blueprint wins. Haptics are vibration only. |
| Language | Mockup source: `I18N.fil` and a `lang` setting still exist in code | Blueprint F-44: English only, strings use i18n keys | Blueprint wins. The Filipino strings are not ported (section 20). |
| Density and accent | Mockup source: `density` and `accent` settings and `.app.compact` still exist in code | Blueprint F-43: Deferred | Blueprint wins. Neither setting is built. The accent is fixed at 70, so `--glow` is 14% (section 6.3). |
| Settings storage | Mockup: `localStorage` key `herra.v3` | Blueprint section 5: `profiles.settings` (jsonb) | Blueprint wins. |
| Map imagery | Mockup: a procedural preview layer under the real tiles, with a "Preview imagery" attribution prefix | Blueprint sections 8 and 16: the procedural generator does not ship | Blueprint wins. Real tiles only. The provider credit is always shown. |
| Reference disclaimer and outcome notice | Mockup: split into a title and body; the outcome sub-line says "report" | Blueprint sections 11.3 and 12: fixed sentences | Blueprint wording wins where it differs (section 15). |

## 4. Dependencies and pins

| Package or asset | Version | Use |
|---|---|---|
| `next`, `react`, `typescript` | Pin the major version at project start | App framework (blueprint section 3.1). TypeScript strict. |
| `tailwindcss` | v4 | Styling foundation (required by coss ui) |
| `@phosphor-icons/react` | 2.1.1 | All icons. Glyphs match the mockup (492 of 492 glyph variants checked against Phosphor core 2.1.1). |
| `leaflet` | 1.9.4 | Map engine. The CSS is in Appendix A. |
| `@geoman-io/leaflet-geoman-free` | 2.17.0 | Polygon drawing. Use the CSS in Appendix A, not the package CSS. |
| `@turf/turf` | 6.5.0 | Area, perimeter, and geometry checks |
| `qrcode-generator` | 1.4.4 | QR code for an access code |
| `react-hook-form`, `zod` | Project version | Forms, shared between client and server (blueprint section 3.1) |
| `next-intl` | Project version | Strings through i18n keys, English only |
| Google Fonts | CSS2 URL in section 6.1 | Typography |

Not installed: `canvas-confetti` (the mockup no longer fires confetti), `dexie` (offline drafts are Deferred), `h3-js` (the blueprint uses geohash cells), `react-leaflet` (`MapView` is ported as the mockup's imperative component, in a client component loaded with a dynamic import so Leaflet stays out of the initial bundle), `qrcode.react` (section 3), `browser-image-compression` (the blueprint re-encodes photos in the browser, at most 1280px, as JPEG), and `motion` unless a registry component requires it. The mockup uses CSS curves for every interaction it defines.

## 5. Styling foundation

Tailwind v4 is required by coss ui. Its layers are `base` (preflight), `components`, and `utilities`. The mockup's CSS is not layered, so unlayered rules win over Tailwind's layers regardless of selector specificity. Keep the mockup CSS unlayered. Do not wrap it in `@layer`.

The stylesheet is two files, as in the blueprint repository layout (`styles/tokens.css`, `styles/globals.css`). Import `tokens.css` first, then `globals.css`.

`styles/tokens.css`:

1. `@import "tailwindcss";` and the `@theme inline` block in section 6.2.
2. The mockup token block, the product token overrides, and the shadcn aliases (section 6.2).

`styles/globals.css`:

1. Leaflet and Geoman CSS from Appendix A.
2. Base styles and typography (sections 6.4 and 6.7), then layout, component, map, and flow CSS in the order of sections 8 and 10.
3. Product overrides, last (section 10.9).

Do not add `@media` breakpoints from Tailwind (`md:`, `lg:`) to layout (R8). The mockup switches layouts by the width of the app root, so use the container breakpoint classes in section 8.4.

## 6. Tokens

### 6.1 Fonts

Load the three families with this stylesheet and its two preconnect hints:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300..900&family=JetBrains+Mono:wght@400..600&family=Urbanist:wght@100..900&display=swap" rel="stylesheet">
```

| Token | Family | Role |
|---|---|---|
| `--font-display` | Urbanist | Titles, display text, metrics, avatar initials, brand text |
| `--font-sans` | Figtree | Body text, UI labels, buttons, inputs |
| `--font-mono` | JetBrains Mono | Codes, keyboard hints, map readouts, numeric data labels, invite-code inputs |

### 6.2 Core tokens

The mockup declares its tokens on `:root` for light and on `:root[data-theme=dark]` for dark. The table below shows the final values after product overrides. Values are shown as written, with the resolved hex value where the token aliases another token. Rows marked corrected or new are product changes, explained in section 6.5.

| Token | Light | Dark |
|---|---|---|
| `--font-display` | `"Urbanist",ui-rounded,"SF Pro Rounded",system-ui,sans-serif` | inherits light |
| `--font-sans` | `"Figtree",ui-rounded,system-ui,sans-serif` | inherits light |
| `--font-mono` | `"JetBrains Mono",ui-monospace,monospace` | inherits light |
| `--l50` | `#F6FDE3` | inherits light |
| `--l100` | `#EAFAC0` | inherits light |
| `--l200` | `#DBF58F` | inherits light |
| `--l300` | `#D0F25F` | inherits light |
| `--l400` | `#C6F135` | inherits light |
| `--l500` | `#A8D420` | inherits light |
| `--l600` | `#82A814` | inherits light |
| `--l700` | `#5F7C10` | inherits light |
| `--l800` | `#435811` | inherits light |
| `--l900` | `#2B3A0E` | inherits light |
| `--l950` | `#161F06` | inherits light |
| `--b0` | `#000` | inherits light |
| `--b50` | `#070908` | inherits light |
| `--b100` | `#0D100E` | inherits light |
| `--b200` | `#141815` | inherits light |
| `--b300` | `#1D221E` | inherits light |
| `--b400` | `#2A312B` | inherits light |
| `--b500` | `#434B44` | inherits light |
| `--b600` | `#6A736B` | inherits light |
| `--b700` | `#98A19A` | inherits light |
| `--b800` | `#C8CFC9` | inherits light |
| `--b900` | `#E8ECE8` | inherits light |
| `--b950` | `#F5F7F4` | inherits light |
| `--n0` | `#fff` | inherits light |
| `--n50` | `#FAF9F5` | inherits light |
| `--n100` | `#F4F2EC` | inherits light |
| `--n200` | `#ECE9E0` | inherits light |
| `--n300` | `#DEDACE` | inherits light |
| `--n400` | `#C7C2B3` | inherits light |
| `--n700` | `#5B6159` | inherits light |
| `--n900` | `#101612` | inherits light |
| `--r-xs` | `6px` | inherits light |
| `--r-sm` | `10px` | inherits light |
| `--r-md` | `14px` | inherits light |
| `--r-lg` | `20px` | inherits light |
| `--r-xl` | `28px` | inherits light |
| `--ease` | `cubic-bezier(.2,0,0,1)` | inherits light |
| `--ease-em` | `cubic-bezier(.16,1,.3,1)` | inherits light |
| `--ease-exit` | `cubic-bezier(.4,0,1,1)` | inherits light |
| `--ease-ring` | `cubic-bezier(.65,0,.35,1)` | inherits light |
| `--spring` | `cubic-bezier(.34,1.56,.64,1)` | inherits light |
| `--spring-soft` | `cubic-bezier(.22,1.2,.36,1)` | inherits light |
| `--d-fast` | `140ms` | inherits light |
| `--d-base` | `240ms` | inherits light |
| `--d-slow` | `380ms` | inherits light |
| `--d-hero` | `620ms` | inherits light |
| `--background` | `var(--n100)` → `#F4F2EC` | `var(--b0)` → `#000` |
| `--foreground` | `var(--n900)` → `#101612` | `var(--b900)` → `#E8ECE8` |
| `--surface` | `var(--n50)` → `#FAF9F5` | `var(--b100)` → `#0D100E` |
| `--surface-hover` | `var(--n200)` → `#ECE9E0` | `var(--b200)` → `#141815` |
| `--popover` | `var(--n0)` → `#fff` | `var(--b100)` → `#0D100E` |
| `--secondary` | `var(--n200)` → `#ECE9E0` | `var(--b200)` → `#141815` |
| `--muted` | `var(--n700)` → `#5B6159` | `var(--b700)` → `#98A19A` |
| `--subtle` | `#6B7069` (corrected; was `#7C8279`) | `#79827A` (corrected; was `var(--b600)`) |
| `--border` | `var(--n300)` → `#DEDACE` | `var(--b300)` → `#1D221E` |
| `--divider` | `var(--n400)` → `#C7C2B3` | `var(--b400)` → `#2A312B` |
| `--primary` | `var(--l700)` → `#5F7C10` | `var(--l400)` → `#C6F135` |
| `--primary-fg` | `#fff` | `#0A1000` |
| `--ring-focus` | `color-mix(in oklab,var(--l700) 60%,transparent)` → `color-mix(in oklab,#5F7C10 60%,transparent)` | `color-mix(in oklab,var(--l400) 60%,transparent)` → `color-mix(in oklab,#C6F135 60%,transparent)` |
| `--accent-tint` | `var(--l50)` → `#F6FDE3` | `var(--l950)` → `#161F06` |
| `--water` | `#0E7FA0` | `#5CC8E8` |
| `--heat` | `#A8700A` | `#F5BC4B` |
| `--soil` | `#9A5530` | `#D08A5E` |
| `--risk` | `#C02746` | `#F0617B` |
| `--growth` | `#5F7C10` | `#C6F135` |
| `--sky` | `#3A57C4` | `#9AB4FF` |
| `--water-tint` | `#E3F3F8` | `#0B2832` |
| `--heat-tint` | `#FBF0D9` | `#2E2208` |
| `--soil-tint` | `#F6E7DC` | `#2D1B10` |
| `--risk-tint` | `#FADFE4` | `#33101A` |
| `--sky-tint` | `#E4E9FB` | `#141B33` |
| `--growth-tint` | `#EAF3D2` | `#1B2508` |
| `--scrim` | `#10161266` | `#000000B3` |
| `--glow` | `color-mix(in oklab,var(--l700) 14%,transparent)` → `color-mix(in oklab,#5F7C10 14%,transparent)` | `color-mix(in oklab,var(--l400) 12%,transparent)` → `color-mix(in oklab,#C6F135 12%,transparent)` |
| `--track` | `var(--n300)` → `#DEDACE` | `var(--b300)` → `#1D221E` |
| `--cereal` | `#C9A63E` | `#E6C86A` |
| `--root` | `#A87B4D` | `#C89B6D` |
| `--legume` | `#6B9A57` | `#8FBF7A` |
| `--fruit` | `#CC6A47` | `#E58B6A` |
| `--vegetable` | `#3FA67C` | `#6CC6A0` |
| `--plantation` | `#5486AB` | `#7FA8C9` |
| `--fiber` | `#8F6FB5` | `#B79AD6` |
| `--herb` | `#7DB05F` | `#A6D68A` |
| `--primary-text` | `#5C7810` (product) | `var(--primary)` → `#C6F135` (product) |
| `--growth-text` | `#5B760F` (product) | `var(--growth)` → `#C6F135` (product) |
| `--heat-text` | `#966409` (product) | `var(--heat)` → `#F5BC4B` (product) |
| `--water-text` | `#0D7796` (product) | `var(--water)` → `#5CC8E8` (product) |

The mockup token block, verbatim. The stage-only `--stage` token is removed.

```css
/* ============ HERRA AI — Lichen & Basalt tokens ============ */
:root{
  --font-display:"Urbanist",ui-rounded,"SF Pro Rounded",system-ui,sans-serif;
  --font-sans:"Figtree",ui-rounded,system-ui,sans-serif;
  --font-mono:"JetBrains Mono",ui-monospace,monospace;
  --l50:#F6FDE3;--l100:#EAFAC0;--l200:#DBF58F;--l300:#D0F25F;--l400:#C6F135;--l500:#A8D420;--l600:#82A814;--l700:#5F7C10;--l800:#435811;--l900:#2B3A0E;--l950:#161F06;
  --b0:#000;--b50:#070908;--b100:#0D100E;--b200:#141815;--b300:#1D221E;--b400:#2A312B;--b500:#434B44;--b600:#6A736B;--b700:#98A19A;--b800:#C8CFC9;--b900:#E8ECE8;--b950:#F5F7F4;
  --n0:#fff;--n50:#FAF9F5;--n100:#F4F2EC;--n200:#ECE9E0;--n300:#DEDACE;--n400:#C7C2B3;--n700:#5B6159;--n900:#101612;
  --r-xs:6px;--r-sm:10px;--r-md:14px;--r-lg:20px;--r-xl:28px;
  --ease:cubic-bezier(.2,0,0,1);--ease-em:cubic-bezier(.16,1,.3,1);--ease-exit:cubic-bezier(.4,0,1,1);--ease-ring:cubic-bezier(.65,0,.35,1);
  --spring:cubic-bezier(.34,1.56,.64,1);--spring-soft:cubic-bezier(.22,1.2,.36,1);
  --d-fast:140ms;--d-base:240ms;--d-slow:380ms;--d-hero:620ms;
  /* light */
  --background:var(--n100);--foreground:var(--n900);--surface:var(--n50);--surface-hover:var(--n200);--popover:var(--n0);
  --secondary:var(--n200);--muted:var(--n700);--subtle:#7C8279;--border:var(--n300);--divider:var(--n400);
  --primary:var(--l700);--primary-fg:#fff;--ring-focus:color-mix(in oklab,var(--l700) 60%,transparent);--accent-tint:var(--l50);
  --water:#0E7FA0;--heat:#A8700A;--soil:#9A5530;--risk:#C02746;--growth:#5F7C10;--sky:#3A57C4;
  --water-tint:#E3F3F8;--heat-tint:#FBF0D9;--soil-tint:#F6E7DC;--risk-tint:#FADFE4;--sky-tint:#E4E9FB;--growth-tint:#EAF3D2;
  --scrim:#10161266;--glow:color-mix(in oklab,var(--l700) 14%,transparent);--track:var(--n300);
  --cereal:#C9A63E;--root:#A87B4D;--legume:#6B9A57;--fruit:#CC6A47;--vegetable:#3FA67C;--plantation:#5486AB;--fiber:#8F6FB5;--herb:#7DB05F;
  color-scheme:light;
}
:root[data-theme=dark]{
  --background:var(--b0);--foreground:var(--b900);--surface:var(--b100);--surface-hover:var(--b200);--popover:var(--b100);
  --secondary:var(--b200);--muted:var(--b700);--subtle:var(--b600);--border:var(--b300);--divider:var(--b400);
  --primary:var(--l400);--primary-fg:#0A1000;--ring-focus:color-mix(in oklab,var(--l400) 60%,transparent);--accent-tint:var(--l950);
  --water:#5CC8E8;--heat:#F5BC4B;--soil:#D08A5E;--risk:#F0617B;--growth:#C6F135;--sky:#9AB4FF;
  --water-tint:#0B2832;--heat-tint:#2E2208;--soil-tint:#2D1B10;--risk-tint:#33101A;--sky-tint:#141B33;--growth-tint:#1B2508;
  --scrim:#000000B3;--glow:color-mix(in oklab,var(--l400) 12%,transparent);--track:var(--b300);
  --cereal:#E6C86A;--root:#C89B6D;--legume:#8FBF7A;--fruit:#E58B6A;--vegetable:#6CC6A0;--plantation:#7FA8C9;--fiber:#B79AD6;--herb:#A6D68A;
  color-scheme:dark;
}
```

Tailwind bridge, at the top of `styles/tokens.css`, before the token block:

```css
@import "tailwindcss";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-surface: var(--surface);
  --color-surface-hover: var(--surface-hover);
  --color-popover: var(--popover);
  --color-secondary: var(--secondary);
  --color-muted: var(--muted);
  --color-subtle: var(--subtle);
  --color-border: var(--border);
  --color-divider: var(--divider);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-fg);
  --color-accent-tint: var(--accent-tint);
  --color-water: var(--water);
  --color-heat: var(--heat);
  --color-soil: var(--soil);
  --color-risk: var(--risk);
  --color-growth: var(--growth);
  --color-sky: var(--sky);
  --color-lichen-400: var(--l400);
  --color-lichen-700: var(--l700);
  --color-basalt-0: var(--b0);
  --color-basalt-100: var(--b100);
  --color-linen-100: var(--n100);
  --color-linen-900: var(--n900);
  --radius-xs: var(--r-xs);
  --radius-sm: var(--r-sm);
  --radius-md: var(--r-md);
  --radius-lg: var(--r-lg);
  --radius-xl: var(--r-xl);
  --font-display: "Urbanist", ui-rounded, "SF Pro Rounded", system-ui, sans-serif;
  --font-sans: "Figtree", ui-rounded, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

The Tailwind bridge defines no viewport breakpoints. The mockup's breakpoints are container-based (section 8). The full set of `--color-*` names can be extended the same way for any scale that is needed.

Product token overrides, placed directly after the mockup token block:

```css
:root {
  --subtle: #6B7069;
  --primary-text: #5C7810;
  --growth-text: #5B760F;
  --heat-text: #966409;
  --water-text: #0D7796;
}
:root[data-theme=dark] {
  --subtle: #79827A;
  --primary-text: var(--primary);
  --growth-text: var(--growth);
  --heat-text: var(--heat);
  --water-text: var(--water);
}
```

Registry aliases. coss ui and shadcn components read the shadcn variable names. These aliases map them to the mockup tokens, so registry components follow the mockup theme in both modes:

```css
:root {
  --card: var(--surface);
  --card-foreground: var(--foreground);
  --popover-foreground: var(--foreground);
  --muted-foreground: var(--muted);
  --secondary-foreground: var(--foreground);
  --accent: var(--accent-tint);
  --accent-foreground: var(--primary);
  --destructive: var(--risk);
  --input: var(--border);
  --ring: var(--ring-focus);
  --radius: var(--r-md);
}
```

Note the name clash: in the mockup `--muted` is the muted text color. In shadcn, `--muted` is a muted background. The alias keeps the mockup meaning and maps shadcn's `--muted-foreground` to it.

### 6.3 Theme rules

1. The default theme is dark. The root element is `<html lang="en" data-theme="dark">`.
2. The theme setting accepts `dark`, `light`, or `system`. For `system`, use `matchMedia('(prefers-color-scheme: dark)')`. It is stored in `profiles.settings`.
3. The product root writes the resolved theme to `document.documentElement.dataset.theme` (section 16.2).
4. The product root sets `--glow` inline on the root: `color-mix(in oklab, var(--primary) 14%, transparent)`. The mockup computes `round(accent × 0.2)` from an accent setting of 70. The accent setting is Deferred (F-43), so the value is constant. The inline value overrides the 12% dark value in the stylesheet.
5. Theme switching uses `document.startViewTransition` when it exists. The `vt-theme` class runs a circular wipe, `themewipe` (0.7s), from the pressed button. Without the API, or under reduced motion, the switch is instant.

### 6.4 Base styles (verbatim, reduced-motion lines removed)

Lines 720 and 721 of the mockup collapse every duration to 0.01ms under reduced motion. They are removed here because section 9.3 replaces them. The scroll-behavior reset moves into section 10.9.

```css
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body{height:100%}
body{font-family:var(--font-sans);background:var(--background);color:var(--foreground);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased;overflow:hidden;font-size:15px;line-height:1.5}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:inherit}
input,textarea,select{font:inherit;color:inherit}
a{color:inherit;text-decoration:none}
svg{flex-shrink:0}
:focus{outline:none}
:focus-visible{outline:2px solid var(--ring-focus);outline-offset:2px;border-radius:var(--r-sm)}
::selection{background:color-mix(in oklab,var(--primary) 35%,transparent)}
::-webkit-scrollbar{width:0;height:0}
.hide-sb{scrollbar-width:none}
```

### 6.5 Contrast corrections

The principles require at least 4.5:1 for normal text anywhere. Measured against the mockup's own backgrounds, the pairs below fell short. Each correction changes only the text color. Fills, icons, and borders keep the mockup values, and the dark theme changes only the caption color.

| Theme | Text | Before (worst) | After (worst) | Checked on |
|---|---|---:|---:|---|
| Dark | `--subtle` caption text | 3.65:1 | 4.51:1 | `#000000`, `#0D100E`, `#141815` |
| Light | `--subtle` caption text | 3.52:1 | 4.52:1 | `#F4F2EC`, `#FAF9F5` |
| Light | primary as text (`.wd.today .dn`, `.toast .tact`) | 4.29:1 | 4.52:1 | `#F4F2EC`, `#FAF9F5`, `#FFFFFF` |
| Light | growth text on growth tint | 4.17:1 | 4.51:1 | `#EAF3D2`, `#F4F2EC`, `#FAF9F5` |
| Light | heat text on heat tint | 3.72:1 | 4.50:1 | `#FBF0D9`, `#F4F2EC`, `#FAF9F5` |
| Light | water text on water tint | 4.04:1 | 4.50:1 | `#E3F3F8`, `#F4F2EC`, `#FAF9F5` |

Semantic text colors in the dark theme (`--heat`, `--growth`, `--water`, `--risk`, `--sky`, `--soil`) were measured on their backgrounds and tints and pass 4.5:1, so they are used as text unchanged.

Every other text pair in the mockup passes in both themes. The tokens that carry text are `--muted`, `--foreground`, `--primary-fg` on `--primary`, `--risk` on `--risk-tint`, `--sky`, and `--soil`, plus the dark-theme semantic text colors.

### 6.6 Corrections applied to the mockup

The product token overrides in section 6.2 and the text rules in section 10.9 are the only places the mockup's values change. The full list is in section 20.

### 6.7 Typography

Role classes are applied directly by the markup. Responsive sizes apply through the `bp-md` and `bp-lg` classes on the app root.

| Class | Family | Weight | Size | Line height | Tracking | Responsive size |
|---|---|---|---|---|---|---|
| `.display-xl` | Urbanist | 200 | 56px | 0.95 | -0.04em | md 80px, lg 96px |
| `.display-lg` | Urbanist | 300 | 40px | 1 | -0.035em | md 52px, lg 64px |
| `.display-md` | Urbanist | 700 | 32px | 1.05 | -0.03em | md 38px, lg 44px |
| `.title-lg` | Urbanist | 700 | 24px | 1.15 | -0.02em | md 26px, lg 28px |
| `.title-md` | Urbanist | 600 | 20px | 1.2 | -0.015em | none |
| `.title-sm` | Figtree | 650 | 16px | 1.3 | -0.01em | none |
| `.body-lg` | inherited | inherited | 17px | inherited | none | none |
| `.body-sm` | Figtree | 450 | 13px | 1.45 | 0.005em | none |
| `.label` | Figtree | 650 | 12px | 1.2 | 0.06em, uppercase | none; color `--muted` |
| `.caption` | Figtree | 500 | 11px | 1.3 | 0.02em | none; color `--subtle` |
| `.metric-xl` | Urbanist | 250 | 44px | 1 | -0.03em | md 54px, lg 64px |
| `.metric-md` | Urbanist | 300 | 28px | 1 | -0.02em | md 30px, lg 32px |
| `.metric-sm` | Urbanist | 300 | 20px | 1 | -0.02em | none |
| `.code`, `.mono` | JetBrains Mono | 500 | 13px | 1.4 | none | none |
| body | Figtree | 400 | 15px | 1.5 | none | tabular numerals, antialiased |

`.display-xl` and `.metric-xl` are defined but no mockup screen references them (the screens set those sizes inline). Keep the classes.

Rules: one family per role. Display text and metrics use Urbanist, and interface text uses Figtree. Numerals are tabular everywhere. Negative tracking applies only to display sizes, and positive tracking only to labels and captions.

```css
/* ============ Typography ============ */
.display-xl{font:200 56px/.95 var(--font-display);letter-spacing:-.04em}
.display-lg{font:300 40px/1 var(--font-display);letter-spacing:-.035em}
.display-md{font:700 32px/1.05 var(--font-display);letter-spacing:-.03em}
.title-lg{font:700 24px/1.15 var(--font-display);letter-spacing:-.02em}
.title-md{font:600 20px/1.2 var(--font-display);letter-spacing:-.015em}
.title-sm{font:650 16px/1.3 var(--font-sans);letter-spacing:-.01em}
.body-lg{font-size:17px}.body-sm{font-size:13px;font-weight:450;letter-spacing:.005em;line-height:1.45}
.label{font-size:12px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;line-height:1.2;color:var(--muted)}
.caption{font-size:11px;font-weight:500;letter-spacing:.02em;line-height:1.3;color:var(--subtle)}
.metric-xl{font:250 44px/1 var(--font-display);letter-spacing:-.03em}
.metric-md{font:300 28px/1 var(--font-display);letter-spacing:-.02em}
.metric-sm{font:300 20px/1 var(--font-display);letter-spacing:-.02em}
.code,.mono{font-family:var(--font-mono);font-weight:500;font-size:13px;line-height:1.4}
.bp-md .display-xl{font-size:80px}.bp-lg .display-xl{font-size:96px}
.bp-md .display-lg{font-size:52px}.bp-lg .display-lg{font-size:64px}
.bp-md .display-md{font-size:38px}.bp-lg .display-md{font-size:44px}
.bp-md .title-lg{font-size:26px}.bp-lg .title-lg{font-size:28px}
.bp-md .metric-xl{font-size:54px}.bp-lg .metric-xl{font-size:64px}
.bp-md .metric-md{font-size:30px}.bp-lg .metric-md{font-size:32px}
.muted{color:var(--muted)}.subtle{color:var(--subtle)}.primary-c{color:var(--primary)}
.c-water{color:var(--water)}.c-heat{color:var(--heat)}.c-soil{color:var(--soil)}.c-risk{color:var(--risk)}.c-growth{color:var(--growth)}.c-sky{color:var(--sky)}
.thin{font-weight:200}.heavy{font-weight:800}
.upper{text-transform:uppercase}.nowrap{white-space:nowrap}.ellip{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cap68{max-width:68ch}
```

### 6.8 Literal colors in scripts

R10 forbids raw hex in components. These literals appear in the mockup scripts. Each has a decision.

| Literal | Where | Decision |
|---|---|---|
| `#fff`, `#000`, and alpha black such as `#000a`, `#000b`, `#000e` | Text and scrims on photos, camera, map labels | Stay literal. Photos look the same in both themes. Most are already in the CSS. |
| QR ground `#fff`, ink `#000`, expired ink `#bbb` | Access-code QR (`HubCodes`, `SpaceCreate`) | Stay literal. Scanners need black on white in both themes. |
| `#5F7C10`, `#C6F135`, `#101612`, `#FFFFFF` | `mapColors`, `polyThumb` | Equal `--l700`, `--l400`, `--n900`, white. Keep them as one `MAP_COLORS` constant, because Leaflet and SVG data URIs cannot read CSS variables. |
| `#F0617B`, `#F5BC4B`, `#9AB4FF` | Invalid shape, attention space, locate dot | Equal the dark-theme `--risk`, `--heat`, `--sky`. Fixed on every map style. |
| `#E6C86A`, `#C89B6D`, `#8FBF7A`, `#E58B6A`, `#6CC6A0`, `#7FA8C9`, `#B79AD6`, `#A6D68A` | `pinHTML` crop-family colors | Equal the dark-theme family tokens. One `PIN_FAMILY` constant. |
| `#0B0E0C` | `pinHTML` pin ground | No token. Named constant `PIN_GROUND`. |
| `#17201B` | `polyThumb` backdrop | No token. Named constant `THUMB_GROUND`. |
| `hsl(h 55% 68%)` | `Avatar` without a photo | Stays. The hue comes from a hash of the user id. |

## 7. Map

The map is Leaflet with the mockup's controls, ported as an imperative client component (`MapView`, section 16) loaded with a dynamic import. The CSS for it is in section 10.7, kept in stylesheet order.

### 7.1 Modes and tiles

Three modes, switched by a floating segmented control (Satellite, Dark, Light). The default comes from the map-style setting (satellite by default, since it is best for drawing). With "Auto-switch with theme" on, overview maps follow Light or Dark.

| Mode | Tiles | Attribution |
|---|---|---|
| Light | CARTO Positron: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` | © OpenStreetMap contributors © CARTO |
| Dark | CARTO Dark Matter: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` | © OpenStreetMap contributors © CARTO |
| Satellite | Esri World Imagery: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | Esri, Maxar, Earthstar Geographics |

The blueprint calls for free tile styles that need no key. Read each URL from `NEXT_PUBLIC_TILE_LIGHT_URL`, `NEXT_PUBLIC_TILE_DARK_URL`, and `NEXT_PUBLIC_TILE_SAT_URL`, falling back to the URLs above, so a keyed provider can replace them later. The credit line is always visible in `.mapattr`. The mockup's "Preview imagery ·" prefix is not shipped.

### 7.2 Chrome

Floating controls only, with no map frame. Controls are 44px circles with a hairline, in a 22px-radius group for zoom. Controls: zoom in and out, locate me, labels, fullscreen. The style switch sits at the top center. Live readouts use the mono font for coordinates, zoom, and the tile name. Map corners follow `--r-xl`, and the map bleeds edge to edge on phones.

### 7.3 Drawing

| Rule | Field | Space |
|---|---|---|
| Minimum corners | 3 | 3 |
| Minimum area | 0.03 ha | 2 ha |
| Maximum area | 500 ha | none |
| Edges may not cross | yes | yes |
| Must lie inside | the chosen space boundary | none |

Geoman draws and edits. Turf gives the live area, perimeter, and self-intersection feedback. Invalid shapes turn risk-colored with an inline reason chip (`.poly-chip.risk`). Snap distance is 14 to 16px. Midpoints add corners. Undo steps back one vertex. Quick sketch drops an editable rectangle. Locate me flies to a pulsing dot (`.loc-dot`). The client validates for feedback only. The database is the authority (blueprint section 5.1).

### 7.4 Vector styling

| Element | Dark and satellite | Light |
|---|---|---|
| Space boundary | stroke `lichen-400` 2px, dashed 8 4, fill at 6% | stroke `lichen-700` 2px, dashed, fill at 8% |
| Field polygon | stroke white 2px, fill `lichen-400` at 18% | stroke `linen-900` 2px, fill `lichen-700` at 18% |
| Selected field | stroke `lichen-400` 3px with the dash march | same, with `lichen-700` |
| Invalid geometry | stroke and fill `--risk` (`#F0617B`), fill at 14 to 16%, reason chip | same |
| Attention space | `#F5BC4B` | same |

The exact calls are in the `MapView` block (section 16).

### 7.5 Place names

Photon reverse geocoding runs through a server proxy, with coordinates rounded to four decimals and a 30-day HTTP cache. The place chip (`.autochip` with a lock icon) shows the label. "© OpenStreetMap contributors" must appear wherever place names appear (blueprint section 8). The mockup does not draw that line (section 21).

### 7.6 Thumbnails

Field and space cards show the drawn polygon as a small SVG, generated in the browser by `polyThumb` when a field or space is saved, and stored in `thumb`. The SVG is a `#17201B` ground with the polygon filled at 38% and stroked 2px in `#C6F135`. The thumbnail uses the `.thumb` and `.tbg` classes. Server-side map snapshots are not built.

### 7.7 Keyboard alternative (blueprint requirement)

The blueprint requires an editable list of vertices with coordinate entry below the map, for keyboard use. The mockup does not draw it. Build it from existing tokens only: a `.table` or `.rowitem` list with one row per corner (index, then latitude and longitude in `.input` fields using the mono font), a remove icon button per row, and an "Add corner" `.btn.secondary.sm`. Edits update the polygon and run the same validation (section 21 lists this as unconfirmed).

## 8. Layout, shells, and breakpoints

### 8.1 Spacing

| Helper | Values |
|---|---|
| Gap `.g1` to `.g8` | 4, 8, 12, 16, 20, 24, 32 px |
| Top margin `.mt1` to `.mt12` | 4, 8, 12, 16, 24, 32, 40, 48 px |
| Page side padding `.pad` | 16px, 32px at `bp-lg` |
| Section gap `.sec` | 40px, 48px at `bp-md` |
| Compact density (`.app.compact`, not reachable: the density setting is Deferred) | Row padding 9px, stat rows 10px, accordion heads 9px, buttons 40px tall, section gap 30px |

The spacing scale is 4px based and matches the principles (4, 8, 12, 16, 20, 24, 32, 40, 48).

### 8.2 Radius, elevation, and z-index

Radius tokens: `--r-xs` 6px, `--r-sm` 10px, `--r-md` 14px, `--r-lg` 20px, `--r-xl` 28px. Components use literal radii for pills (999px), circles (50%), the 22px map control group, and 12px icon tiles.

Elevation is flat. Cards have a 1px `--border` and a `--surface` fill, and no shadow. Overlays (menus, toasts, dialogs, tooltips) carry their own shadow. The principle's dialog shadow, `0 24px 64px -24px #00000099`, is the mockup's dialog shadow.

Z-index values: overlay 100, menu 150, tooltips 300, toasts 500, top bar 30, rail 35, tab bar 40, focus screens 60, scroll progress 60, spectate banner 70, sticky action bar 20, map controls 1000, map drawers 1100. Leaflet panes keep their stock values from Appendix A.

### 8.3 Shells and main dimensions

| Element | Value |
|---|---|
| Top bar (phone) | padding 56px 16px 10px. At `bp-md`: 14px 32px 10px. With a rail, 32px side padding. |
| Tab bar | height 88px (`calc(64px + 24px)`), padding 0 8px 22px |
| Analyze button | 58px circle, `margin-top: -26px`, 4px border in `--background` |
| Rail | 72px collapsed, 240px expanded. Padding 56px 10px 16px (20px top at `bp-md`). Items 44px tall, 14px radius. |
| Icon button | 44px, 36px in the `sm` variant |
| Button height | 44px default, 36px `sm`, 52px `lg`, 40px in compact density |
| Chip | 34px, 28px `sm`, 999px radius |
| Input | 46px tall, 10px radius. Textarea height is automatic, padding 12px 14px. |
| Switch | 50 × 30px track, 24px knob, 3px inset |
| Segmented control | 999px pill, 3px padding, 34px buttons, 28px `sm` |
| Tabs | 44px, 2px underline |
| Sheet (phone) | Up to 92% height, 28px top radius |
| Drawer (`bp-md` and up) | 440px wide, 560px with `.wide`, 28px left radius. `.sheet` becomes this drawer at `bp-md`. |
| Dialog | `min(440px, 100% − 32px)`, 24px padding, 28px radius |
| Toast | 240px to 380px wide, 14px radius. Top 58px on phones. Bottom 24px and right 24px at `bp-md`. |
| Menu | 200px minimum, 6px padding, 14px radius, 40px items |
| Map drawer (left) | 372px wide, 12px inset, 28px radius. Bottom variant up to 70% height. |
| Grids | Entry: 2 columns, 3 at `bp-md`, 4 at `bp-lg`, 5 at `bp-xl` (`.f5`). Field: 1, 2 at `bp-md`, 3 at `bp-xl`. Crop: 4, 6 at `bp-md`. Entry and field gap 12px (16px at `bp-md`). Crop gap 10px. |
| Two-column | 32px gap. At `bp-lg`: 7fr and 5fr, or 8fr and 4fr with `.e84`. |

Phone safe areas: `.mobile-real` adds `env(safe-area-inset-*)` to the top bar, the focus header, the toasts, the map style switch, and the tab bar. The class is set on the body when the viewport is narrower than 720px (section 16.2).

```css
/* ============ Layout helpers ============ */
.row{display:flex;align-items:center}.col{display:flex;flex-direction:column}.wrap{flex-wrap:wrap}.grow{flex:1;min-width:0}.between{justify-content:space-between}.center{justify-content:center;align-items:center}.end{justify-content:flex-end}.start{align-items:flex-start}.stretch{align-items:stretch}.baseline{align-items:baseline}
.g1{gap:4px}.g2{gap:8px}.g3{gap:12px}.g4{gap:16px}.g5{gap:20px}.g6{gap:24px}.g8{gap:32px}
.mt1{margin-top:4px}.mt2{margin-top:8px}.mt3{margin-top:12px}.mt4{margin-top:16px}.mt6{margin-top:24px}.mt8{margin-top:32px}.mt10{margin-top:40px}.mt12{margin-top:48px}
.rel{position:relative}.abs{position:absolute}.fill{position:absolute;inset:0}.hidden{display:none!important}.clip{overflow:hidden}
.divider{height:1px;background:var(--divider);opacity:.55;border:0}
.hairline-t{border-top:1px solid var(--border)}.hairline-b{border-bottom:1px solid var(--border)}
.pad{padding:0 16px}.bp-lg .pad{padding:0 32px}
.sec{margin-top:40px}.bp-md .sec{margin-top:48px}
.grid{display:grid}.grid.cols2>.card{align-self:stretch}
.cols2{grid-template-columns:repeat(2,minmax(0,1fr))}.cols3{grid-template-columns:repeat(3,minmax(0,1fr))}.cols4{grid-template-columns:repeat(4,minmax(0,1fr))}
.tc{text-align:center}.tr{text-align:right}
.pointer{cursor:pointer}.disabled{opacity:.45;pointer-events:none;cursor:not-allowed}
```

```css
/* ============ App root & shells ============ */
.app{position:relative;width:100%;height:100%;overflow:hidden;background:var(--background);color:var(--foreground);font-family:var(--font-sans)}
.app.compact{--pad-y:.8}
.scroll{position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;scroll-behavior:smooth;overscroll-behavior:contain}
.page{min-height:100%;padding-bottom:calc(var(--tabbar-h,0px) + 40px);animation:pgin .38s var(--ease-em) both}
@keyframes pgin{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.page-in{max-width:1200px;margin:0 auto}
.bp-2xl .page-in.wide{max-width:1440px}
.topbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:10px;padding:56px 16px 10px;background:linear-gradient(var(--background) 82%,transparent);transition:padding .24s var(--ease)}
.bp-md .topbar{padding:14px 32px 10px}
.topbar.condensed{padding-top:52px;border-bottom:1px solid var(--border);background:var(--background)}
.bp-md .topbar.condensed{padding-top:12px}
.topbar .ttl{font:700 17px var(--font-display);opacity:0;transform:translateY(6px);transition:all .24s var(--ease);position:absolute;left:0;right:0;text-align:center;pointer-events:none}
.topbar.condensed .ttl{opacity:1;transform:none}
.iconbtn{width:44px;height:44px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:var(--foreground);position:relative;transition:transform .14s var(--spring),background .14s}
.iconbtn:hover{background:var(--surface-hover)}.iconbtn:active{transform:scale(.92)}
.iconbtn.sm{width:36px;height:36px}.iconbtn.bordered{border:1px solid var(--border);background:var(--surface)}
.iconbtn .badge-n{position:absolute;top:6px;right:6px;min-width:16px;height:16px;border-radius:8px;background:var(--risk);color:#fff;font:700 10px/16px var(--font-sans);text-align:center;padding:0 4px}
.tabbar{position:absolute;left:0;right:0;bottom:0;z-index:40;height:calc(64px + 24px);padding:0 8px 22px;display:flex;align-items:center;justify-content:space-around;background:var(--background);border-top:1px solid var(--border)}
.tabbar .tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;font-weight:600;color:var(--subtle);padding:6px 0;transition:color .14s}
.tabbar .tab.on{color:var(--foreground)}.tabbar .tab.on svg{color:var(--primary)}
.tabbar .tab svg{transition:transform .24s var(--spring)}.tabbar .tab.on svg{transform:translateY(-1px) scale(1.08)}
.analyze-fab{width:58px;height:58px;border-radius:50%;background:var(--primary);color:var(--primary-fg);display:flex;align-items:center;justify-content:center;margin-top:-26px;position:relative;flex-shrink:0;transition:transform .14s var(--spring);border:4px solid var(--background)}
.analyze-fab:active{transform:scale(.93)}
.analyze-fab::before{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid var(--primary);opacity:.5;animation:pulse-ring 2.4s ease-out infinite}
@keyframes pulse-ring{0%{transform:scale(.9);opacity:.6}100%{transform:scale(1.5);opacity:0}}
.rail{position:absolute;left:0;top:0;bottom:0;width:72px;z-index:35;border-right:1px solid var(--border);background:var(--background);padding:56px 10px 16px;display:flex;flex-direction:column;gap:4px;transition:width .38s var(--ease-em)}
.bp-md .rail{padding-top:20px}
.rail.expanded{width:240px}
.rail-item{display:flex;align-items:center;gap:14px;height:44px;border-radius:var(--r-md);padding:0 13px;color:var(--muted);font-weight:600;font-size:14.5px;white-space:nowrap;position:relative;transition:background .14s,color .14s}
.rail-item:hover{background:var(--surface-hover);color:var(--foreground)}
.rail-item.on{color:var(--foreground);background:var(--accent-tint)}.rail-item.on svg{color:var(--primary)}
.rail-item.on::before{content:"";position:absolute;left:-10px;top:10px;bottom:10px;width:3px;border-radius:2px;background:var(--primary)}
.rail-item .rl{opacity:0;transition:opacity .2s}.rail.expanded .rail-item .rl{opacity:1}
.rail-item .cnt{margin-left:auto;font-size:11px;font-weight:700;background:var(--secondary);border-radius:10px;padding:1px 7px;color:var(--muted)}
.rail-head{display:flex;align-items:center;gap:12px;padding:6px 8px 18px;font:800 20px var(--font-display);letter-spacing:-.03em}
.with-rail{padding-left:72px}.with-rail-x{padding-left:240px}
.with-rail .topbar,.with-rail-x .topbar{padding-left:32px}
.logo-mark{width:30px;height:30px;flex-shrink:0}
```

### 8.4 Breakpoints

Breakpoints respond to the app root width, not the viewport. The runtime measures `.app` with a `ResizeObserver` and writes cumulative classes on it:

| Name | Minimum width | Class on `.app` |
|---|---|---|
| sm | 480px | `bp-sm` |
| md | 768px | `bp-md` (also `bp-sm`) |
| lg | 1024px | `bp-lg` (also `bp-md`, `bp-sm`) |
| xl | 1280px | `bp-xl` (and the lower ones) |
| 2xl | 1600px | `bp-2xl` (and the lower ones) |

Below 480px, no breakpoint class is set. The viewport media queries in the mockup are not layout breakpoints. They are: `(max-width: 719px)` for the phone-width label, `(hover: hover)` for hover lifts and overlays, `(prefers-reduced-motion: reduce)` for motion, and `(max-height: 800px)` and `(max-height: 700px)` for the processing orbit. Use them the same way.

## 9. Motion

### 9.1 Easing and durations

Easing tokens: `--ease` for standard movement, `--ease-em` for entrances, `--ease-exit` for exits, `--ease-ring` for value fills, `--spring` for press and pop, `--spring-soft` for hover and reveal.

Duration tokens: `--d-fast` 140ms, `--d-base` 240ms, `--d-slow` 380ms, `--d-hero` 620ms. The principles add `--dur-instant` (80ms), which equals the mockup's press duration `.08s`. The CSS uses literal values. Use the literal value on each rule.

### 9.2 Motion catalogue (mockup)

Every row below is defined in the mockup CSS. Use the same duration and curve.

| Element | Selector | Motion | Duration and curve |
|---|---|---|---|
| Screen enter | `.page`, `.focus` | Fade in, rise 8px | 0.38s `--ease-em` |
| Scrim | `.scrim` | Fade in, fade out | 0.24s |
| Bottom sheet | `.sheet` | Slide up; out with `sheetdn` | 0.46s `--ease-em`; out 0.24s `--ease-exit` |
| Drawer | `.drawer` | Slide in from the right; out with `drawout` | As sheet |
| Dialog | `.dialog` | Scale from 0.94 and rise 10px; out with `dlgout` | 0.38s `--spring-soft`; out 0.2s |
| Menu | `.menu` | Same entrance as dialog | 0.24s `--spring-soft` |
| Toast | `.toast` | Drop in from -18px at 0.94 scale; at `bp-md`, slide in from the right 24px; out with `toastout` | In 0.5s `--spring`; out 0.24s `--ease-exit` |
| Button press | `.btn:active` | Scale 0.97 | 0.08s on press, 0.14s `--spring` |
| Chip press | `.chip:active` | Scale 0.96 | 0.14s `--spring` |
| Icon button press | `.iconbtn:active` | Scale 0.92 | 0.14s `--spring` |
| Card hover (hover devices) | `.card.hov:hover` | Lift 4px; thumbnail scales 1.04 | 0.24s `--spring-soft`; image 0.5s `--ease-em` |
| Card press | `.card.hov:active` | Scale 0.985 | 0.24s `--spring-soft` |
| Ring and meter fills | `.ring .rval`, `.meter>i` | Stroke offset or width | 0.62s `--ease-ring` |
| Segmented indicator | `.seg .ind` | Slide left and width | 0.38s `--spring` |
| Tab underline | `.tabs .tind` | Slide left and width | 0.38s `--spring` |
| Switch | `.switch` | Track color; knob slides | Track 0.24s `--ease`; knob 0.3s `--spring` |
| Entry card reveal | `.ovl`, `.ovl .m` | Overlay fades; metrics rise, staggered by `--i` × 40ms | Overlay 0.24s; metrics 0.38s `--ease-em` |
| Notifications | `.notif` | Rise and fade, staggered by `--i` × 60ms | 0.5s `--ease-em` |
| Accordion | `.acc-b`, `.acc .chev` | Row height; chevron rotates 90° | 0.38s `--ease-em`; chevron 0.3s `--spring-soft` |
| Skeleton | `.skel` | Shimmer sweep | 1.4s linear, infinite |
| Analyze button pulse | `.analyze-fab::before` | Ring expands and fades | 2.4s `ease-out`, infinite |
| Location dot | `.loc-dot` | Two rings expand and fade, second offset 1.2s | 2.4s, infinite |
| Live status dot | `.dot.live` | Soft glow pulse | 2s `ease-in-out`, infinite |
| Sync icon | `.sync-spin` | Rotate | 1s linear, infinite |
| Marquee | `.marquee` | Horizontal scroll | 30s linear, infinite |
| Orbit (processing) | `.orbit-spin`, `.orb-ic` | Ring turns; icons counter-rotate | 18s linear, infinite |
| Invalid code | `.codebox.shake` | Horizontal shake | 0.3s |
| Blur fade (in view) | `.bf` | Opacity, blur 6px to 0, rise 10px | 0.6s `--ease-em`, delayed by `--d` |
| Morphing text | `.morph span` | Blur and rise in | 0.5s `--ease-em` |
| Camera drift | `.cam .feed` | Slow pan and zoom, alternating | 9s `ease-in-out`, infinite |
| Shutter flash | `.cam .flash.go` | White flash fades | 0.45s `ease-out` |
| Moisture slider | `.mslider .mthumb`, `.mslider .mfill` | Thumb slides; fill follows | Thumb 0.36s `--spring`; fill 0.3s `--spring` |
| Ripple | `.ripple-s` | Expanding circle fades | 0.6s `--ease-em` |
| Primary shimmer | `.shimmer::after` | Light sweep | 2.8s `--ease`, infinite |
| Shared element | `::view-transition-group(hero)` | Entry thumbnail to detail | 0.62s `--ease-em` |
| Theme wipe | `themewipe` | Circular reveal | 0.7s `--ease-em` |

Haptics: the runtime calls `navigator.vibrate` with 8ms for a tick, `[10, 40, 16]` for ok, and 20ms otherwise. Tick haptics are skipped under reduced motion. There is no visual jolt (R7).

### 9.3 Principle-only behaviors

These behaviors appear in the early principles and are not in the mockup. Implement them with these values.

| Element | Behavior | Values |
|---|---|---|
| Hero ring on scroll | Parallax | The ring moves at 0.6× scroll speed: `translateY(0.4 × scrollY)` on the ring wrapper. Off under reduced motion. |
| Failed source icon | Shake once | 2 × 4px translation, 140ms. Dot turns `--risk`. Never repeats. |
| Tab change | Cross-slide | 240ms in the direction of travel |
| Polygon vertex | Pop-in | Spring-bounce pop. Area label animates number changes. |
| Map style switch | Crossfade | 240ms tile crossfade |
| Analyze docking | Pop | Each orbiting layer docks into the center ring with a spring-bounce pop; the ring then expands into the result |
| Section reveal | Stagger | Blur-fade stagger of 40ms per section |

### 9.4 Reduced motion

Reduced motion is on when the operating system asks for it (`prefers-reduced-motion: reduce`) or when the app setting is `reduced`. The app root then gets the `reduce-motion` class (section 16). The principles define the behavior, which replaces the mockup's 0.01ms collapse.

1. Durations and delays are divided by 4. Apply this in a build step that copies every rule with a `transition`, `animation`, or duration property inside `@media (prefers-reduced-motion: reduce)` and writes the copy with each time value divided by 4. Keyframes are not changed.
2. Springs become standard easing. In the copy, replace `var(--spring)`, `var(--spring-soft)`, and `var(--spring-bounce)` with `var(--ease)`.
3. Decorative loops stop. The rules in section 10.9 set `animation: none` on the pulse, the location rings, the shimmer, the marquee, the orbit, the live dot, and the skeleton.
4. No parallax. The hero ring stays at its resting position.
5. Number tickers jump to their value. The count-up hook (`useCount`) does this when reduced.
6. The first-visit skeleton is skipped. The `useLoad` hook does this when reduced.
7. The processing orbit shows the docked layers as static. The mockup's `.orbit-stage.reduced` class does this.
8. Scroll behavior is `auto`.
9. Tick haptics are suppressed.

### 9.5 Timers in the runtime

These literal delays appear in the runtime screens and shared code. Timers in the demo chrome, the mock engine (`createEntry`, `driveEntry`), the simulated provider check in `DataHealth`, the download helper, the store (`emit`), and the haptic class toggle are excluded. The toast, `useCount`, and `useLoad` values are default parameters, not literals.

| Delay (ms) | Source lines | Inside |
|---:|---|---|
| 60 | 1750 | `MapView` |
| 80 | 1360, 1370 | `Ring`, `SegRing` |
| 180 | 1949 | `Analyze` |
| 240 | 1338 | `closeOv` |
| 260 | 1334, 1817 | `SpaceSwitch`, `toast` |
| 300 | 2119 | `JoinSheet` |
| 320 | 1774, 2110 | `CodeInput`, `MapView` |
| 400 | 2017 | `FieldCapture` |
| 460 | 1863 | `EntryCard` |
| 520 | 1350 | `useLoad` |
| 620 | 1348, 1377 | `Btn`, `useCount` |
| 750 | 2018 | `FieldCapture` |
| 1100 | 1975 | `Processing` |
| 1400 | 1905 | `EntryDetail` |
| 2200 | 1863 | `EntryCard` |
| 3200 | 1334 | `toast` |

## 10. Components

Class names are the contract between CSS and markup. The markup uses these classes on these elements.

| Class | First rule in the mockup CSS (line) |
|---|---:|
| `.btn` | 837 |
| `.chip` | 851 |
| `.badge` | 855 |
| `.autochip` | 859 |
| `.seg` | 883 |
| `.tabs` | 889 |
| `.switch` | 880 |
| `.field` | 872 |
| `.input` | 873 |
| `.input-group` | 877 |
| `.numfield` | 896 |
| `.range` | 893 |
| `.sel-wrap` | 900 |
| `.card` | 758 |
| `.alert` | 910 |
| `.sheet` | 919 |
| `.drawer` | not in app CSS |
| `.dialog` | 930 |
| `.toast` | 935 |
| `.menu` | 940 |
| `.ring` | 947 |
| `.meter` | 955 |
| `.sbar` | 961 |
| `.delta` | 958 |
| `.rowitem` | 964 |
| `.cropico` | 968 |
| `.sec-h` | 969 |
| `.stat-row` | 970 |
| `.table` | 972 |
| `.acc` | 978 |
| `.reason` | 984 |
| `.empty` | 986 |
| `.skel` | 988 |
| `.avatar` | 990 |
| `.astack` | 992 |
| `.thumb` | 905 |
| `.entrycard` | 999 |
| `.ovl` | 1006 |
| `.egrid` | 1013 |
| `.fgrid` | 1015 |
| `.week` | 1024 |
| `.wd` | 1025 |
| `.mapwrap` | 1034 |
| `.mapctl` | 1037 |
| `.mapstyle` | 1042 |
| `.mapread` | 1044 |
| `.mapdrawer` | 1065 |
| `.pin` | 1054 |
| `.loc-dot` | 1056 |
| `.focus` | 1070 |
| `.bigchoice` | 1078 |
| `.cropcell` | 1102 |
| `.cam` | 1084 |
| `.shutter` | 1090 |
| `.mslider` | 1092 |
| `.cropgrid` | 1101 |
| `.orbit-stage` | 1104 |
| `.codebox` | 1113 |
| `.marquee` | 1118 |
| `.cmd` | 1123 |
| `.notif` | 1135 |
| `.offline-chip` | 1138 |
| `.page` | 799 |
| `.topbar` | 803 |
| `.tabbar` | 814 |
| `.analyze-fab` | 818 |
| `.rail` | 822 |
| `.rail-item` | 825 |
| `.iconbtn` | 810 |
| `.app` | 796 |
| `.scroll` | 798 |
| `.admin-top` | 1147 |
| `.admin-scroll` | 1149 |
| `.pill-tabs` | 1141 |
| `.twocol` | 1155 |
| `.sticky-act` | 1143 |
| `.lstat` | 1108 |
| `.legend` | 1142 |
| `.bars` | 1128 |
| `.brow` | 1128 |
| `.cal` | 1129 |
| `.tl-ring` | 1133 |
| `.dotpat` | 1112 |

### 10.1 Buttons, chips, and badges

Button variants: `.primary` (default), `.secondary`, `.outline`, `.ghost`, `.destructive`. Sizes: `.sm`, `.lg`, `.block`. Chips: `.on` is selected, `.sm` is small, `.static` is non-interactive. Badges tone with `.growth`, `.heat`, `.risk`, `.water`, `.sky`, or `.soil`, and `.outline` gives a bordered badge.

```css
/* ============ Buttons, chips, badges ============ */
.btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 18px;border-radius:var(--r-md);font-weight:650;font-size:15px;border:1px solid transparent;white-space:nowrap;transition:transform .14s var(--spring),background .14s,border-color .14s,opacity .14s;user-select:none}
.btn:active{transform:scale(.97);transition-duration:.08s}
.btn.sm{height:36px;padding:0 13px;font-size:13.5px;border-radius:12px}.btn.lg{height:52px;padding:0 24px;font-size:16px}
.btn.primary{background:var(--primary);color:var(--primary-fg)}.btn.primary:hover{filter:brightness(1.07)}
.btn.secondary{background:var(--surface);border-color:var(--border)}.btn.secondary:hover{background:var(--surface-hover)}
.btn.outline{border-color:var(--divider)}.btn.outline:hover{background:var(--surface-hover)}
.btn.ghost:hover{background:var(--surface-hover)}
.btn.destructive{background:var(--risk-tint);color:var(--risk);border-color:color-mix(in oklab,var(--risk) 35%,transparent)}.btn.destructive:hover{background:color-mix(in oklab,var(--risk) 22%,var(--risk-tint))}
.btn.block{width:100%}.btn[disabled]{opacity:.4;pointer-events:none}
.ripple-s{position:absolute;border-radius:50%;background:currentColor;opacity:.28;transform:scale(0);animation:rip .6s var(--ease-em) forwards;pointer-events:none}
@keyframes rip{to{transform:scale(1);opacity:0}}
.shimmer{background:var(--primary);color:var(--primary-fg);position:relative;overflow:hidden}
.shimmer::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,#ffffff66 50%,transparent 65%);transform:translateX(-120%);animation:shim 2.8s var(--ease) infinite}
@keyframes shim{0%,30%{transform:translateX(-120%)}70%,100%{transform:translateX(120%)}}
.chip{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px;border-radius:999px;border:1px solid var(--border);font-size:13.5px;font-weight:600;white-space:nowrap;color:var(--foreground);transition:all .14s var(--spring);background:transparent}
.chip:hover{background:var(--surface-hover)}.chip:active{transform:scale(.96)}
.chip.on{border-color:var(--primary);box-shadow:inset 0 0 0 .5px var(--primary);background:var(--accent-tint)}
.chip.sm{height:28px;padding:0 11px;font-size:12.5px}.chip.static{pointer-events:none}
.badge{display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:650;background:var(--secondary);color:var(--foreground);white-space:nowrap}
.badge.growth{background:var(--growth-tint);color:var(--growth)}.badge.heat{background:var(--heat-tint);color:var(--heat)}.badge.risk{background:var(--risk-tint);color:var(--risk)}.badge.water{background:var(--water-tint);color:var(--water)}.badge.sky{background:var(--sky-tint);color:var(--sky)}.badge.soil{background:var(--soil-tint);color:var(--soil)}
.badge.outline{background:transparent;border:1px solid var(--border);color:var(--muted)}
.badge.lg{height:28px;padding:0 12px;font-size:13px}
.autochip{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px;border-radius:999px;background:var(--secondary);font-size:13.5px;font-weight:600;position:relative}
.autochip .lock{color:var(--subtle)}
.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0;background:var(--subtle)}
.dot.ok{background:var(--growth)}.dot.warn{background:var(--heat)}.dot.bad{background:var(--risk)}.dot.info{background:var(--sky)}
.dot.live{animation:pulse-dot 2s ease-in-out infinite}
@keyframes pulse-dot{0%,100%{box-shadow:0 0 0 0 color-mix(in oklab,currentColor 0%,transparent)}50%{box-shadow:0 0 0 4px color-mix(in oklab,var(--growth) 25%,transparent)}}
.dot.warn.live{animation-name:pulse-dot-w}@keyframes pulse-dot-w{50%{box-shadow:0 0 0 4px color-mix(in oklab,var(--heat) 25%,transparent)}}
.kbd{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:var(--r-xs);border:1px solid var(--border);background:var(--secondary);font:600 11px var(--font-mono);color:var(--muted)}
[data-tip]{position:relative}
[data-tip]:hover::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:var(--popover);color:var(--foreground);border:1px solid var(--border);padding:6px 10px;border-radius:10px;font-size:12px;font-weight:600;white-space:nowrap;z-index:300;pointer-events:none;box-shadow:0 12px 30px -12px #000a;animation:pgin .14s both}
[data-tip].tip-b:hover::after{bottom:auto;top:calc(100% + 8px)}
```

### 10.2 Inputs and segmented controls

Inputs focus with a 3px primary halo. The error state is `.input.err`, and the error line is `.err-msg`. Selects use the `.sel-wrap` arrow.

```css
/* ============ Inputs ============ */
.field{display:flex;flex-direction:column;gap:6px}.field>label{font-size:13px;font-weight:650;color:var(--muted)}
.input{height:46px;width:100%;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--surface);padding:0 14px;font-size:15px;transition:border-color .14s,box-shadow .14s}
.input:focus{border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in oklab,var(--primary) 18%,transparent)}
.input.err{border-color:var(--risk)}
textarea.input{height:auto;padding:12px 14px;resize:none;line-height:1.5}
.input-group{display:flex;align-items:center;gap:10px;height:46px;border-radius:var(--r-sm);border:1px solid var(--border);background:var(--surface);padding:0 14px;color:var(--muted)}
.input-group:focus-within{border-color:var(--primary)}.input-group input{flex:1;background:none;border:0;outline:0;height:100%;color:var(--foreground);min-width:0}
.err-msg{display:flex;gap:6px;align-items:center;color:var(--risk);font-size:13px;font-weight:550}
.switch{width:50px;height:30px;border-radius:15px;background:var(--divider);position:relative;transition:background .24s var(--ease);flex-shrink:0}
.switch::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .3s var(--spring)}
.switch.on{background:var(--primary)}.switch.on::after{transform:translateX(20px);background:var(--primary-fg)}.switch:active::after{width:28px}.switch.on:active::after{transform:translateX(16px)}
.seg{display:inline-flex;position:relative;padding:3px;border-radius:999px;background:var(--secondary);gap:0}
.seg button{position:relative;z-index:1;height:34px;padding:0 16px;border-radius:999px;font-size:13.5px;font-weight:650;color:var(--muted);transition:color .2s;display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
.seg button.on{color:var(--primary-fg)}
.seg .ind{position:absolute;top:3px;bottom:3px;border-radius:999px;background:var(--primary);transition:left .38s var(--spring),width .38s var(--spring)}
.seg.neutral button.on{color:var(--foreground)}.seg.neutral .ind{background:var(--surface);box-shadow:inset 0 0 0 1px var(--border)}
.seg.sm button{height:28px;padding:0 12px;font-size:12.5px}.seg.block{display:flex;width:100%}.seg.block button{flex:1;justify-content:center}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);position:relative;overflow-x:auto}
.tabs button{height:44px;padding:0 14px;font-weight:650;color:var(--muted);font-size:14px;white-space:nowrap;display:flex;align-items:center;gap:7px;position:relative}
.tabs button.on{color:var(--foreground)}
.tabs .tind{position:absolute;bottom:-1px;height:2px;background:var(--primary);border-radius:2px;transition:left .38s var(--spring),width .38s var(--spring)}
.range{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:3px;background:var(--track);outline:0}
.range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:var(--primary);border:3px solid var(--background);cursor:pointer}
.range::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--primary);border:3px solid var(--background);cursor:pointer}
.numfield{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface);overflow:hidden;height:40px}
.numfield button{width:36px;height:100%;color:var(--muted);display:flex;align-items:center;justify-content:center}.numfield button:hover{background:var(--surface-hover)}
.numfield input{width:56px;text-align:center;border:0;background:none;height:100%;font-weight:650;outline:0}
select.input{appearance:none;background-image:none;padding-right:34px;cursor:pointer}
.sel-wrap{position:relative}.sel-wrap svg{position:absolute;right:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted)}
```

### 10.3 Surfaces: cards, alerts, sheets, dialogs, toasts, menus

Alerts tone with `.info`, `.warn`, `.risk`, and `.ok`. `.card.sel` is the selected state. `.sheet` is a bottom sheet on phones and becomes a right-side panel at `bp-md`. `.sheet.drawer` is always a right-side panel, and `.drawer.wide` is 560px.

```css
/* ============ Surfaces: cards, alerts, sheets ============ */
.card{position:relative;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;transition:transform .24s var(--spring-soft),border-color .14s}
.card.hov{cursor:pointer}
@media (hover:hover){.card.hov:hover{transform:translateY(-4px);border-color:var(--divider)}.card.hov:hover .thumb img,.card.hov:hover .thumb .tbg{transform:scale(1.04)}}
.card.hov:active{transform:scale(.985)}
.card.sel{border-color:var(--primary);box-shadow:inset 0 0 0 1px var(--primary)}
.card .spot{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity .3s;background:radial-gradient(260px circle at var(--mx,50%) var(--my,50%),color-mix(in oklab,var(--primary) 14%,transparent),transparent 70%)}
.card:hover .spot{opacity:1}
.alert{display:flex;gap:12px;padding:14px 16px;border-radius:var(--r-md);border:1px solid var(--border);background:var(--surface);font-size:14px}
.alert.info{background:var(--sky-tint);border-color:color-mix(in oklab,var(--sky) 30%,transparent)}.alert.info>svg{color:var(--sky)}
.alert.warn{background:var(--heat-tint);border-color:color-mix(in oklab,var(--heat) 30%,transparent)}.alert.warn>svg{color:var(--heat)}
.alert.risk{background:var(--risk-tint);border-color:color-mix(in oklab,var(--risk) 30%,transparent)}.alert.risk>svg{color:var(--risk)}
.alert.ok{background:var(--growth-tint);border-color:color-mix(in oklab,var(--growth) 30%,transparent)}.alert.ok>svg{color:var(--growth)}
.alert b{font-weight:700;display:block;margin-bottom:2px}
.overlay{position:absolute;inset:0;z-index:100;display:flex}
.scrim{position:absolute;inset:0;background:var(--scrim);animation:fadein .24s both}
@keyframes fadein{from{opacity:0}}
.sheet{position:absolute;left:0;right:0;bottom:0;max-height:92%;background:var(--popover);border:1px solid var(--border);border-bottom:0;border-radius:var(--r-xl) var(--r-xl) 0 0;display:flex;flex-direction:column;animation:sheetup .46s var(--ease-em) both;overflow:hidden}
@keyframes sheetup{from{transform:translateY(100%)}}
.sheet.closing{animation:sheetdn .24s var(--ease-exit) both}.sheet.closing~.scrim,.overlay.closing .scrim{animation:fadeout .24s both}
@keyframes sheetdn{to{transform:translateY(100%)}}@keyframes fadeout{to{opacity:0}}
.sheet .grab{width:38px;height:5px;border-radius:3px;background:var(--divider);margin:10px auto 2px;flex-shrink:0}
.bp-md .sheet,.sheet.drawer{left:auto;top:0;width:440px;max-height:none;border-radius:var(--r-xl) 0 0 var(--r-xl);border:1px solid var(--border);border-right:0;animation-name:drawin}
.sheet.drawer.wide{width:560px}
@keyframes drawin{from{transform:translateX(100%)}}
.bp-md .sheet.closing,.sheet.drawer.closing{animation-name:drawout}@keyframes drawout{to{transform:translateX(100%)}}
.sheet-h{display:flex;align-items:center;justify-content:space-between;padding:12px 20px 8px;flex-shrink:0}
.sheet-b{overflow-y:auto;padding:8px 20px 28px;flex:1}
.dialog{margin:auto;position:relative;width:min(440px,calc(100% - 32px));background:var(--popover);border:1px solid var(--border);border-radius:var(--r-xl);padding:24px;box-shadow:0 24px 64px -24px #00000099;animation:dlg .38s var(--spring-soft) both}
@keyframes dlg{from{opacity:0;transform:scale(.94) translateY(10px)}}
.overlay.closing .dialog{animation:dlgout .2s both}@keyframes dlgout{to{opacity:0;transform:scale(.96)}}
.toasts{position:absolute;top:58px;left:12px;right:12px;z-index:500;display:flex;flex-direction:column;gap:8px;pointer-events:none;align-items:center}
.bp-md .toasts{top:auto;bottom:24px;left:auto;right:24px;align-items:flex-end}
.toast{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r-md);background:var(--popover);border:1px solid var(--border);box-shadow:0 18px 40px -18px #000c;min-width:240px;max-width:380px;font-size:14px;font-weight:550;animation:toastin .5s var(--spring) both}
.toast.out{animation:toastout .24s var(--ease-exit) both}
@keyframes toastin{from{opacity:0;transform:translateY(-18px) scale(.94)}}@keyframes toastout{to{opacity:0;transform:translateY(-10px) scale(.96)}}
.bp-md .toast{animation-name:toastin2}@keyframes toastin2{from{opacity:0;transform:translateX(24px)}}
.toast .tact{color:var(--primary);font-weight:700;margin-left:auto;padding:4px 8px}
.menu{position:absolute;z-index:150;min-width:200px;background:var(--popover);border:1px solid var(--border);border-radius:var(--r-md);padding:6px;box-shadow:0 24px 50px -20px #000b;animation:dlg .24s var(--spring-soft) both}
.menu button,.menu a{display:flex;align-items:center;gap:10px;width:100%;height:40px;padding:0 12px;border-radius:10px;font-size:14px;font-weight:600}
.menu button:hover{background:var(--surface-hover)}.menu .danger{color:var(--risk)}
.menu hr{border:0;height:1px;background:var(--border);margin:6px 4px}
.menu .mlabel{padding:8px 12px 4px}
```

### 10.4 Rings and meters

Rings draw an SVG stroke rotated -90°. The value arc transitions over 0.62s. Meters are 6px bars. `.seg8` is a segmented bar: flex segments with a 3px gap, 10px tall, and each filled segment has `.f`.

```css
/* ============ Rings & meters ============ */
.ring{position:relative;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.ring>svg{transform:rotate(-90deg)}
.ring .rtrack{stroke:var(--track);fill:none}
.ring .rval{fill:none;stroke-linecap:round;transition:stroke-dashoffset .62s var(--ease-ring)}
.ring .rc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.ring-lbl{margin-top:10px;text-align:center}
.rings{display:grid;gap:12px}
.glow{position:absolute;width:480px;height:480px;left:50%;top:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,var(--glow),transparent 65%);pointer-events:none}
.meter{height:6px;border-radius:3px;background:var(--track);overflow:hidden;flex:1}
.meter>i{display:block;height:100%;border-radius:3px;background:var(--primary);width:0;transition:width .62s var(--ease-ring)}
.meter.seg8{display:flex;gap:3px;background:none;overflow:visible;height:10px}.meter.seg8>i{flex:1;height:100%;width:auto;background:var(--track);transition:background .3s}.meter.seg8>i.f{background:var(--primary)}
.delta{display:inline-flex;align-items:center;gap:3px;font-size:11.5px;font-weight:700;padding:2px 7px;border-radius:9px}
.delta.up{background:var(--growth-tint);color:var(--growth)}.delta.dn{background:var(--risk-tint);color:var(--risk)}.delta.eq{background:var(--secondary);color:var(--muted)}
.segring{display:flex;flex-direction:column;align-items:center;gap:14px}
.sbar{display:flex;height:12px;border-radius:6px;overflow:hidden;gap:2px;background:none}.sbar>i{display:block;height:100%;transition:flex .62s var(--ease-ring)}
```

### 10.5 Rows, lists, tables, empty states, and avatars

Lists are rows with hairline dividers and a hover state on `.hv` rows. Tables use 13.5px text with 11.5px uppercase headers. Empty states use the `.dotpat` background and a 48px duotone icon.

```css
/* ============ Rows & lists (canvas content) ============ */
.rowitem{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--divider);cursor:pointer;position:relative;transition:background .14s}
.rowitem{border-bottom-color:color-mix(in oklab,var(--divider) 55%,transparent)}
.rowitem:last-child{border-bottom:0}
.rowitem.hv:hover{background:var(--surface-hover);margin:0 -12px;padding:14px 12px;border-radius:var(--r-md);border-color:transparent}
.cropico{display:inline-flex;align-items:center;justify-content:center;border-radius:12px;flex-shrink:0;position:relative}
.sec-h{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}
.stat-row{display:flex;flex-direction:column;gap:6px;padding:16px 0;border-bottom:1px solid color-mix(in oklab,var(--divider) 55%,transparent)}
.stat-row:last-child{border-bottom:0}
.table{width:100%;border-collapse:collapse;font-size:13.5px}
.table th{text-align:left;font-size:11.5px;font-weight:650;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);padding:10px 12px;border-bottom:1px solid var(--divider);white-space:nowrap;position:sticky;top:0;background:var(--background);z-index:2}
.table td{padding:12px;border-bottom:1px solid color-mix(in oklab,var(--divider) 50%,transparent);vertical-align:middle}
.table tr.hv{cursor:pointer;transition:background .12s}.table tr.hv:hover td{background:var(--surface-hover)}
.table td.num,.table th.num{text-align:right}
.tscroll{overflow-x:auto;border-radius:var(--r-md)}
.acc{border-bottom:1px solid color-mix(in oklab,var(--divider) 55%,transparent)}
.acc-h{display:flex;align-items:center;gap:12px;padding:14px 0;width:100%;cursor:pointer}
.acc-h .chev{transition:transform .3s var(--spring-soft);color:var(--subtle)}.acc.open .chev{transform:rotate(90deg)}
.acc-b{display:grid;grid-template-rows:0fr;transition:grid-template-rows .38s var(--ease-em)}.acc.open .acc-b{grid-template-rows:1fr}
.acc-b>div{overflow:hidden;min-height:0}
.acc-b .in{padding:0 0 16px}
.reason{display:flex;gap:10px;align-items:flex-start;padding:7px 0;font-size:14px}
.reason .imp{margin-left:auto;font:600 11.5px var(--font-mono);flex-shrink:0;padding-top:2px}
.empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:56px 24px;gap:6px;position:relative}
.empty .ei{color:var(--subtle);margin-bottom:8px}
.skel{border-radius:var(--r-sm);background:linear-gradient(100deg,var(--secondary) 30%,color-mix(in oklab,var(--secondary) 60%,var(--foreground) 8%) 50%,var(--secondary) 70%);background-size:300% 100%;animation:skel 1.4s linear infinite}
@keyframes skel{from{background-position:100% 0}to{background-position:-100% 0}}
.avatar{width:36px;height:36px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:700 13px var(--font-display);flex-shrink:0;color:#0A1000;background-size:cover;background-position:center;border:2px solid var(--background)}
.avatar.lg{width:72px;height:72px;font-size:24px}.avatar.sm{width:28px;height:28px;font-size:11px}
.astack{display:flex}.astack .avatar{margin-left:-9px}.astack .avatar:first-child{margin-left:0}
.astack .more{background:var(--secondary);color:var(--muted)}
```

### 10.6 Entry and field cards, grids, and the week strip

Entry cards are photo-first. Metadata sits on the bottom gradient. On hover (or long-press, `.lp`) the overlay replaces the metadata. Selection mode shows `.check`. The week grid (`.week`) has seven equal columns. `.week.snap` turns it into a horizontal snap strip with 78px days.

```css
/* ============ Entry / field cards ============ */
.thumb{position:relative;overflow:hidden;background:var(--secondary)}
.thumb .tbg{position:absolute;inset:0;background-size:cover;background-position:center;transition:transform .5s var(--ease-em)}
.thumb::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,#000000CC 100%);pointer-events:none}
.entrycard .thumb{aspect-ratio:4/5}.bp-md .entrycard .thumb{aspect-ratio:1/1}
.entrycard .meta{position:absolute;left:0;right:0;bottom:0;padding:12px 14px;z-index:2;color:#fff}
.entrycard .meta .t{font:600 18px/1.15 var(--font-display);letter-spacing:-.015em}
.entrycard .meta .s{font-size:12.5px;opacity:.78;margin-top:2px;display:flex;gap:6px;align-items:center}
.entrycard .meta .b{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13px;font-weight:650}
.entrycard .kind{position:absolute;top:10px;left:10px;z-index:2;width:30px;height:30px;border-radius:50%;background:#000a;color:var(--l400);display:flex;align-items:center;justify-content:center}
.entrycard .stat{position:absolute;top:10px;right:10px;z-index:2}
.ovl{position:absolute;inset:0;z-index:3;background:#000e;display:flex;flex-direction:column;justify-content:flex-end;padding:14px;gap:8px;opacity:0;pointer-events:none;transition:opacity .24s;color:#fff}
.ovl .m{display:flex;justify-content:space-between;font-size:13px;transform:translateY(12px);opacity:0;transition:all .38s var(--ease-em);transition-delay:calc(var(--i)*40ms)}
.ovl .m span:first-child{opacity:.7;display:flex;gap:6px;align-items:center}
.entrycard .meta,.entrycard .kind,.entrycard .stat{transition:opacity .24s}.card.lp .ovl{opacity:1}.card.lp .ovl .m{transform:none;opacity:1}.card.lp .meta,.card.lp .kind,.card.lp .stat{opacity:0}
@media (hover:hover){.card:hover .ovl{opacity:1}.card:hover .ovl .m{transform:none;opacity:1}.card:hover .meta,.card:hover .kind,.card:hover .stat{opacity:0}}
.card .check{position:absolute;top:10px;right:10px;z-index:4;width:26px;height:26px;border-radius:50%;border:2px solid #fff;background:#0007;display:flex;align-items:center;justify-content:center;color:transparent;transition:all .24s var(--spring)}
.card.sel .check{background:var(--primary);border-color:var(--primary);color:var(--primary-fg);transform:scale(1.1)}
.egrid{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr))}
.bp-md .egrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.bp-lg .egrid{grid-template-columns:repeat(4,minmax(0,1fr))}.bp-xl .egrid.f5{grid-template-columns:repeat(5,minmax(0,1fr))}
.fgrid{display:grid;gap:12px;grid-template-columns:minmax(0,1fr)}.bp-md .fgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.bp-xl .fgrid{grid-template-columns:repeat(3,minmax(0,1fr))}
.beam{position:absolute;inset:0;border-radius:inherit;pointer-events:none;padding:2px;-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;z-index:5}
.beam::before{content:"";position:absolute;width:90px;height:90px;aspect-ratio:1;background:linear-gradient(90deg,transparent,var(--primary),transparent);offset-path:rect(0 auto auto 0 round 20px);animation:beam 3.4s linear infinite;offset-anchor:50% 50%}
@keyframes beam{to{offset-distance:100%}}
.strip{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding:0 16px 4px;margin:0 -16px}.bp-lg .strip{margin:0 -32px;padding:0 32px 4px}
.strip>*{scroll-snap-align:start;flex-shrink:0}
.daysep{margin:24px 0 10px}

/* ============ Week grid ============ */
.week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:0}
.week.snap{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -16px;padding:0 16px}.week.snap>.wd{flex:0 0 78px;scroll-snap-align:start}
.wd{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 4px;border-right:1px solid color-mix(in oklab,var(--divider) 45%,transparent);position:relative}
.wd:last-child{border-right:0}.wd.today::before{content:"";position:absolute;top:0;left:20%;right:20%;height:2px;border-radius:2px;background:var(--primary)}
.wd .dn{font-size:12px;font-weight:650;letter-spacing:.04em;color:var(--muted);text-transform:uppercase}.wd.today .dn{color:var(--primary)}
.wd .hl{font:500 13px var(--font-sans)}.wd .rp{font-size:12px;font-weight:600;color:var(--water);display:flex;align-items:center;gap:3px}
.wd .wk{display:flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 8px;border-radius:10px}
.wk.y{background:var(--growth-tint);color:var(--growth)}.wk.n{background:var(--secondary);color:var(--subtle)}.wk.m{background:var(--heat-tint);color:var(--heat)}
```

### 10.7 Map CSS

The behavior and specification are in section 7. This block stays here to keep the stylesheet in the mockup's rule order.

```css
/* ============ Map ============ */
.mapwrap{position:relative;overflow:hidden;background:var(--background);border-radius:var(--r-xl)}
.mapwrap.bleed{border-radius:0}.mapwrap .leaflet-container{position:absolute;inset:0;background:var(--background);font-family:var(--font-sans);outline:0;cursor:grab}
.mapwrap.drawing .leaflet-container{cursor:crosshair}
.mapctl{position:absolute;z-index:1000;display:flex;flex-direction:column;gap:8px}
.mapctl .cbtn{width:44px;height:44px;border-radius:50%;background:var(--popover);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--foreground);transition:transform .14s var(--spring),background .14s}
.mapctl .cbtn:hover{background:var(--surface-hover)}.mapctl .cbtn:active{transform:scale(.92)}.mapctl .cbtn.on{background:var(--primary);color:var(--primary-fg);border-color:var(--primary)}
.mapctl .group{display:flex;flex-direction:column;border-radius:22px;background:var(--popover);border:1px solid var(--border);overflow:hidden}
.mapctl .group .cbtn{border:0;border-radius:0;background:none}.mapctl .group .cbtn+.cbtn{border-top:1px solid var(--border)}
.mapstyle{position:absolute;z-index:1000;top:12px;left:50%;transform:translateX(-50%)}
.mapstyle .seg{background:var(--popover);border:1px solid var(--border)}
.mapread{position:absolute;z-index:1000;left:12px;bottom:12px;display:flex;flex-direction:column;gap:6px;font:500 11.5px var(--font-mono);color:var(--foreground);background:color-mix(in oklab,var(--popover) 88%,transparent);border:1px solid var(--border);border-radius:12px;padding:8px 12px}
.mapattr{position:absolute;z-index:999;right:6px;bottom:4px;font-size:10px;color:var(--foreground);opacity:.7;background:color-mix(in oklab,var(--popover) 70%,transparent);padding:1px 7px;border-radius:6px;max-width:55%;text-align:right}
.leaflet-container .leaflet-control-scale{margin:0 0 12px 0!important;position:absolute;bottom:0;right:10px}
.leaflet-control-scale-line{background:color-mix(in oklab,var(--popover) 80%,transparent)!important;color:var(--foreground)!important;border-color:var(--foreground)!important;font:500 10px var(--font-mono)!important;border-radius:0 0 4px 4px}
.leaflet-tooltip.poly-chip{background:var(--popover);color:var(--foreground);border:1px solid var(--border);border-radius:999px;padding:5px 12px;font:650 12.5px var(--font-sans);box-shadow:0 8px 24px -10px #000a}
.leaflet-tooltip.poly-chip.risk{background:var(--risk-tint);color:var(--risk);border-color:var(--risk)}
.leaflet-tooltip.poly-chip::before{display:none}
.leaflet-tooltip.map-lbl{background:none;border:0;box-shadow:none;color:#fff;font:700 12px var(--font-sans);text-shadow:0 1px 3px #000c;padding:0}.leaflet-tooltip.map-lbl::before{display:none}
.leaflet-interactive{outline:0}
.dash-march{stroke-dasharray:10 8;animation:march 1s linear infinite}@keyframes march{to{stroke-dashoffset:-36}}
.pin{width:30px;height:30px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 4px 10px #0008}
.pin>span{transform:rotate(45deg);display:flex}.pin i{position:absolute;right:-3px;top:-3px;width:10px;height:10px;border-radius:50%;border:2px solid #000;transform:rotate(45deg)}
.loc-dot{width:16px;height:16px;border-radius:50%;background:var(--sky);border:3px solid #fff;position:relative}
.loc-dot::before,.loc-dot::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--sky);animation:locp 2.4s ease-out infinite}.loc-dot::after{animation-delay:1.2s}
@keyframes locp{from{transform:scale(1);opacity:.8}to{transform:scale(4.5);opacity:0}}
.pm-vtx{}
.marker-icon{background:#fff!important;border:3px solid var(--l400)!important;border-radius:50%!important;box-shadow:0 2px 6px #0008}
.marker-icon-middle{opacity:.55}
.leaflet-pm-toolbar{display:none!important}
.leaflet-container .leaflet-pm-draggable{cursor:grab}
.leaflet-tooltip-pane .leaflet-tooltip.leaflet-pm-tooltip,.leaflet-pm-tooltip{background:var(--popover);color:var(--foreground);border:1px solid var(--border);border-radius:10px;font:600 12px var(--font-sans)}
.mapdrawer{position:absolute;z-index:1100;background:var(--popover);border:1px solid var(--border);display:flex;flex-direction:column}
.mapdrawer.left{top:12px;left:12px;bottom:12px;width:372px;border-radius:var(--r-xl);overflow:hidden}
.mapdrawer.bottom{left:0;right:0;bottom:0;border-radius:var(--r-xl) var(--r-xl) 0 0;max-height:70%;border-bottom:0}
```

### 10.8 Analyze flow, miscellaneous, and additions

Each analyze step is a `.focus` screen with a 2px progress bar. Choices are `.bigchoice` cards with a 58px icon tile. The crop picker is a grid of `.cropcell`. The `.cam` frame is 3:4 by default with a 3×3 guide grid, and square inside `.photo-step`. The shutter is 72px. The moisture slider is `.mslider`. The access code is `.codebox`: one 38 × 52px input per character and a 10 × 2px separator. Ranked bars use `.bars` and `.brow`. Notifications use `.notif` with an unread dot.

```css
/* ============ Analyze flow ============ */
.focus{position:absolute;inset:0;z-index:60;background:var(--background);display:flex;flex-direction:column;animation:pgin .38s var(--ease-em) both}
.focus .prog{height:2px;background:var(--border);flex-shrink:0;margin-top:0}.focus .prog i{display:block;height:100%;background:var(--primary);transition:width .5s var(--ease-em)}
.focus-top{display:flex;align-items:center;justify-content:space-between;padding:54px 12px 6px;flex-shrink:0}
.bp-md .focus-top{padding-top:16px}
.focus-body{flex:1;overflow-y:auto;padding:12px 20px 24px;position:relative}
.bp-md .focus-body{padding:24px 0}.bp-md .focus-in{max-width:620px;margin:0 auto;padding:0 20px}
.focus-foot{padding:12px 16px 28px;display:flex;gap:10px;flex-shrink:0;background:linear-gradient(transparent,var(--background) 30%)}
.bp-md .focus-foot{padding:16px 32px 28px;max-width:660px;margin:0 auto;width:100%}
.bigchoice{display:flex;align-items:center;gap:16px;padding:20px;border-radius:var(--r-lg);border:1.5px solid var(--border);width:100%;transition:all .24s var(--spring-soft);position:relative;overflow:hidden}
.bigchoice.on{border-color:var(--primary);background:var(--accent-tint)}.bigchoice:active{transform:scale(.98)}
.bigchoice .bi{width:58px;height:58px;border-radius:18px;background:var(--secondary);display:flex;align-items:center;justify-content:center;color:var(--primary);flex-shrink:0;transition:all .3s var(--spring)}
.bigchoice.on .bi{background:var(--primary);color:var(--primary-fg);transform:rotate(-6deg) scale(1.06)}
.radio{width:24px;height:24px;border-radius:50%;border:2px solid var(--divider);margin-left:auto;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .2s}
.on .radio{border-color:var(--primary)}.on .radio::after{content:"";width:12px;height:12px;border-radius:50%;background:var(--primary);animation:dlg .3s var(--spring) both}
.cam{position:relative;border-radius:var(--r-xl);overflow:hidden;aspect-ratio:3/4;background:#000}
.cam .feed{position:absolute;inset:-6%;background-size:cover;background-position:center;animation:camdrift 9s ease-in-out infinite alternate}
@keyframes camdrift{from{transform:translate(-1.5%,0) scale(1.02)}to{transform:translate(1.5%,-1%) scale(1.06)}}
.cam .grid3{position:absolute;inset:0;background-image:linear-gradient(#fff4 1px,transparent 1px),linear-gradient(90deg,#fff4 1px,transparent 1px);background-size:33.33% 33.33%;pointer-events:none}
.cam .flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}.cam .flash.go{animation:flash .45s ease-out}
@keyframes flash{0%{opacity:.95}100%{opacity:0}}
.shutter{width:72px;height:72px;border-radius:50%;border:4px solid #fff;display:flex;align-items:center;justify-content:center;transition:transform .14s var(--spring)}.shutter:active{transform:scale(.9)}.shutter i{width:56px;height:56px;border-radius:50%;background:#fff;display:block}
.moist-wrap{padding:28px 6px 10px}
.mslider{position:relative;height:56px;touch-action:none;cursor:pointer}
.mslider .mtrack{position:absolute;left:14px;right:14px;top:24px;height:8px;border-radius:4px;background:var(--track)}
.mslider .mfill{position:absolute;left:0;top:0;bottom:0;border-radius:4px;background:linear-gradient(90deg,var(--soil),var(--water));transition:width .3s var(--spring)}
.mslider .mstop{position:absolute;top:20px;width:16px;height:16px;margin-left:-8px;border-radius:50%;background:var(--background);border:2px solid var(--track);z-index:1}
.mslider .mstop.f{border-color:var(--water)}
.mslider .mthumb{position:absolute;top:10px;width:36px;height:36px;margin-left:-18px;border-radius:50%;background:var(--water);color:#001;display:flex;align-items:center;justify-content:center;z-index:2;transition:left .36s var(--spring);box-shadow:0 0 0 6px color-mix(in oklab,var(--water) 20%,transparent)}
.mslider.drag .mthumb{transition:none}
.morph{display:inline-block;position:relative}.morph span{display:inline-block;animation:morphin .5s var(--ease-em) both}
@keyframes morphin{from{opacity:0;filter:blur(8px);transform:translateY(8px)}}
.cropgrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.bp-md .cropgrid{grid-template-columns:repeat(6,minmax(0,1fr))}
.cropcell{display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 4px 10px;border-radius:var(--r-md);border:1.5px solid transparent;font-size:12px;font-weight:650;text-align:center;transition:all .2s var(--spring);position:relative}
.cropcell:hover{background:var(--surface-hover)}.cropcell.on{border-color:var(--primary);background:var(--accent-tint)}.cropcell:active{transform:scale(.95)}
.orbit-stage{position:relative;width:300px;height:300px;margin:0 auto}
.orbit-ring{position:absolute;inset:40px;border-radius:50%;border:1px dashed var(--divider)}
.orbit-core{position:absolute;inset:80px;display:flex;align-items:center;justify-content:center;transition:transform .6s var(--spring-soft)}
@keyframes shake{25%{translate:-4px 0}75%{translate:4px 0}}
.lstat{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid color-mix(in oklab,var(--divider) 50%,transparent);font-size:14px}
.lstat .st{margin-left:auto}
```

```css
/* ============ Misc ============ */
.dotpat{position:absolute;inset:0;background-image:radial-gradient(color-mix(in oklab,var(--foreground) 12%,transparent) 1px,transparent 1.4px);background-size:20px 20px;mask-image:radial-gradient(ellipse at center,#000 30%,transparent 78%);-webkit-mask-image:radial-gradient(ellipse at center,#000 30%,transparent 78%);pointer-events:none}
.codebox{display:flex;gap:6px;justify-content:center;align-items:center}
.codebox input{width:38px;height:52px;border-radius:var(--r-sm);border:1.5px solid var(--border);background:var(--surface);text-align:center;font:600 20px var(--font-mono);text-transform:uppercase;transition:all .14s}
.codebox input:focus{border-color:var(--primary);transform:translateY(-2px)}.codebox input.filled{border-color:var(--divider)}
.codebox .sep{width:10px;height:2px;background:var(--divider);border-radius:1px}
.codebox.shake{animation:shake .3s}
.marquee{display:flex;overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.marquee>div{display:flex;gap:14px;animation:mq 30s linear infinite;padding-right:14px}@keyframes mq{to{transform:translateX(-100%)}}
.scrollprog{position:absolute;top:0;left:0;height:2px;background:var(--primary);z-index:60;width:0;transition:width .1s linear}
.spectate{position:sticky;top:0;z-index:70}
.sbanner{display:flex;align-items:center;gap:10px;padding:8px 16px;background:var(--sky-tint);color:var(--sky);font-size:13px;font-weight:650;border-bottom:1px solid color-mix(in oklab,var(--sky) 30%,transparent)}
.cmd{width:min(620px,calc(100% - 32px));margin:12vh auto auto;background:var(--popover);border:1px solid var(--border);border-radius:var(--r-xl);overflow:hidden;box-shadow:0 30px 80px -30px #000c;animation:dlg .3s var(--spring-soft) both;position:relative;max-height:70%;display:flex;flex-direction:column}
.cmd .ci{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border)}.cmd .ci input{flex:1;background:none;border:0;outline:0;font-size:16px;height:28px}
.cmd .cl{overflow-y:auto;padding:8px}.cmd .cg{padding:10px 12px 4px}
.cmd .cr{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;font-size:14.5px;font-weight:600;cursor:pointer}.cmd .cr.on{background:var(--accent-tint)}.cmd .cr.on svg:first-child{color:var(--primary)}
.cmd .cf{display:flex;gap:16px;padding:10px 18px;border-top:1px solid var(--border);font-size:12px;color:var(--muted)}
.bars{display:flex;flex-direction:column;gap:10px}.brow{display:flex;align-items:center;gap:12px;font-size:13.5px}.brow .bl{width:120px;flex-shrink:0;font-weight:600}.brow .bv{width:48px;text-align:right;font:500 12.5px var(--font-mono);color:var(--muted)}
.cal{display:flex;align-items:flex-end;gap:8px;height:150px;padding:0 4px}.cal .cb{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:3px;height:100%;position:relative}
.cal .cb .pr{width:100%;border-radius:4px 4px 0 0;background:var(--sky);opacity:.35;transition:height .62s var(--ease-ring)}.cal .cb .ob{width:100%;border-radius:4px 4px 0 0;background:var(--primary);transition:height .62s var(--ease-ring)}
.hbtn{padding:2px;border-radius:8px}
.adm-stat{padding:4px 0}
.tl-ring{display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0}
.progress-lines{height:2px}
.notif{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid color-mix(in oklab,var(--divider) 50%,transparent);cursor:pointer;position:relative;animation:pgin .5s var(--ease-em) both;animation-delay:calc(var(--i)*60ms)}
.notif .nd{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.notif.unread::after{content:"";position:absolute;right:0;top:20px;width:8px;height:8px;border-radius:50%;background:var(--primary)}
.offline-chip{position:absolute;top:54px;left:50%;transform:translateX(-50%);z-index:300;display:flex;gap:8px;align-items:center;background:var(--heat-tint);color:var(--heat);border:1px solid color-mix(in oklab,var(--heat) 40%,transparent);border-radius:999px;padding:6px 14px;font-size:12.5px;font-weight:700;animation:toastin .5s var(--spring) both}
.bp-md .offline-chip{top:14px}
.sync-spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.pill-tabs{display:flex;gap:8px;overflow-x:auto}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px}
.sticky-act{position:sticky;bottom:calc(var(--tabbar-h,0px) + 12px);z-index:20;display:flex;gap:8px;padding:10px;border-radius:var(--r-lg);background:var(--popover);border:1px solid var(--border);margin-top:20px}
.tabular{font-variant-numeric:tabular-nums}
.diag{display:grid;gap:16px}
.admin-main{position:absolute;inset:0;display:flex;flex-direction:column}
.admin-top{height:56px;flex-shrink:0;display:flex;align-items:center;gap:12px;padding:0 20px;border-bottom:1px solid var(--border);background:var(--background);z-index:30;position:relative}
.admin-body{flex:1;min-height:0;position:relative}
.admin-scroll{position:absolute;inset:0;overflow-y:auto;padding:28px 32px 80px}
.cmdbtn{display:flex;align-items:center;gap:10px;height:38px;padding:0 12px 0 14px;border-radius:12px;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-size:13.5px;font-weight:550;min-width:280px;transition:border-color .14s}
.cmdbtn:hover{border-color:var(--divider)}
.hero-ring{position:relative;display:flex;justify-content:center;padding:20px 0}
.tag-row{display:flex;gap:8px;flex-wrap:wrap}
.live-feed>*{animation:pgin .5s var(--ease-em) both}
.twocol{display:grid;gap:32px;grid-template-columns:minmax(0,1fr)}.bp-lg .twocol{grid-template-columns:minmax(0,7fr) minmax(0,5fr)}
.twocol.e84{}.bp-lg .twocol.e84{grid-template-columns:minmax(0,8fr) minmax(0,4fr)}
.stick{position:sticky;top:76px;align-self:start}
@keyframes vtfade{from{opacity:0}}
::view-transition-group(root){animation:none}
::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}
::view-transition-group(hero){animation-duration:.62s;animation-timing-function:var(--ease-em)}
::view-transition-old(hero),::view-transition-new(hero){height:100%;object-fit:cover}
::view-transition-group(themewipe){animation:none}
.vt-theme::view-transition-old(root){animation:none;z-index:1}.vt-theme::view-transition-new(root){animation:themewipe .7s var(--ease-em) both;z-index:2}
@keyframes themewipe{from{clip-path:circle(0 at var(--tx,90%) var(--ty,30px))}to{clip-path:circle(150% at var(--tx,90%) var(--ty,30px))}}
.sk-inline{display:inline-block;vertical-align:middle}
.hr-sp{height:1px}
.compactable{}
.app.compact .rowitem{padding:9px 0}.app.compact .stat-row{padding:10px 0}.app.compact .acc-h{padding:9px 0}.app.compact .btn{height:40px}.app.compact .sec{margin-top:30px}
```

```css
/* ---- additions ---- */
.bf{opacity:0;filter:blur(6px);transform:translateY(10px);transition:opacity .6s var(--ease-em),filter .6s var(--ease-em),transform .6s var(--ease-em);transition-delay:var(--d,0ms)}
.bf.in{opacity:1;filter:none;transform:none}
.glassb{background:#000a!important;color:#fff!important}
.bp-md .hide-md{display:none}
.mapwrap.fs{position:fixed;inset:0;z-index:90;border-radius:0}
.rowitem.sel{background:var(--accent-tint)}
.mobile-real .topbar{padding-top:calc(env(safe-area-inset-top,0px) + 12px)!important}
.mobile-real .focus-top{padding-top:calc(env(safe-area-inset-top,0px) + 8px)!important}
.mobile-real .toasts{top:calc(env(safe-area-inset-top,0px) + 10px)}
.mobile-real .tabbar{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 8px)}
.admin-main .topbar{position:sticky}
.admin-scroll .page-in .twocol{align-items:start}
.admin-scroll .topbar{top:-28px}
.farmer-root .page-in{padding-top:2px}

.mapwrap.bleed{position:absolute;inset:0;height:auto}
.mapwrap.compact .mapread{display:none}
.bubble{width:34px;height:34px;border-radius:50%;background:var(--primary);color:var(--primary-fg);font:800 13px/34px var(--font-display);text-align:center;border:3px solid var(--background);box-shadow:0 4px 14px #0009}
.leaflet-marker-icon{border:0;background:none}
.mapwrap.bleed .mapstyle{top:58px}.mapwrap.bleed .mapctl{top:106px!important}
.bp-md .mapwrap.bleed .mapstyle{top:12px}.bp-md .mapwrap.bleed .mapctl{top:58px!important}
.mobile-real .mapwrap.bleed .mapstyle{top:calc(env(safe-area-inset-top,0px) + 56px)}

.strip,.week.snap{scroll-padding-inline:16px}.bp-lg .strip{scroll-padding-inline:32px}

/* orbit: one rigid ring, evenly spaced, constantly turning */
.orbit-spin{position:absolute;inset:0;animation:ospin 18s linear infinite}
@keyframes ospin{to{transform:rotate(360deg)}}
.orbiter{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:var(--secondary);display:flex;align-items:center;justify-content:center;transform:rotate(calc(var(--i)*90deg)) translateY(-112px);transition:background .5s var(--ease)}
.orbiter.ok{background:var(--primary)}.orbiter.fb{background:var(--heat)}.orbiter.fail{background:var(--risk)}
.orb-ic{display:flex;transform:rotate(calc(var(--i)*-90deg));animation:ocounter 18s linear infinite}
@keyframes ocounter{to{transform:rotate(calc(var(--i)*-90deg - 360deg))}}
.orbit-stage.reduced .orbit-spin,.orbit-stage.reduced .orb-ic{animation:none}
/* photo step: fits the screen, never scrolls */
.focus-body.nos{overflow:hidden;display:flex;flex-direction:column;padding-bottom:8px}
.nos .focus-in{display:flex;flex-direction:column;flex:1;min-height:0;width:100%}
.nos .focus-in>.display-md,.nos .focus-in>.display-lg{font-size:28px;margin:2px 0 12px!important;flex-shrink:0}
.photo-step{flex:1;min-height:0;display:flex;flex-direction:column;gap:12px}
.cam-wrap{flex:1;min-height:0;container-type:size;display:flex;align-items:center;justify-content:center}
.cam-wrap .cam{width:min(100cqw,100cqh);height:min(100cqw,100cqh);aspect-ratio:auto}
.photo-ctl{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:0 8px}
.photo-skip{flex-shrink:0;padding:4px 0 2px}

/* processing screen: fit short phones */
.proc-body{overflow-x:hidden}
@media (max-height:800px){.orbit-stage{zoom:.82}.proc-hero{padding-top:4px!important}}
@media (max-height:700px){.orbit-stage{zoom:.72}.lstat{padding:7px 0}}
```

### 10.9 Product overrides (load last)

These rules are product additions. They load after every rule above. Each one changes only what section 6.5 or section 9.4 requires.

Text-safe color on the text roles listed in section 6.5. Fills and icons keep the mockup colors.

```css
.badge.growth, .delta.up, .wk.y, .c-growth { color: var(--growth-text); }
.badge.heat, .wk.m, .c-heat { color: var(--heat-text); }
.badge.water, .wd .rp, .c-water { color: var(--water-text); }
.wd.today .dn, .toast .tact, .primary-c { color: var(--primary-text); }
```

Reduced motion (section 9.4, rules 3 and 8).

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .analyze-fab::before, .loc-dot::before, .loc-dot::after, .shimmer::after,
  .marquee > div, .orbit-spin, .orb-ic, .dot.live, .skel { animation: none; }
}
.reduce-motion .analyze-fab::before, .reduce-motion .loc-dot::before,
.reduce-motion .loc-dot::after, .reduce-motion .shimmer::after,
.reduce-motion .marquee > div, .reduce-motion .orbit-spin,
.reduce-motion .orb-ic, .reduce-motion .dot.live, .reduce-motion .skel {
  animation: none;
}
```

### 10.10 Classes the product screens do not use

These classes are in the mockup stylesheet and stay in the stylesheet (R4). No mockup screen references them. Do not build UI for them (R9).

| Classes | Reason |
|---|---|
| `.cmd`, `.ci`, `.cg`, `.cf`, `.cmdbtn`, `.kbd` | Command palette (F-42, Deferred) |
| `.offline-chip` | Offline queue (F-21, Deferred). `.sync-spin` is still used by the processing view. |
| `.app.compact` rules | Density setting (F-43, Deferred) |
| `.cal`, `.cb`, `.pr`, `.ob` | Column bars. The mockup has no column chart. |
| `.sticky-act`, `.segring`, `.hbtn`, `.adm-stat`, `.progress-lines`, `.tabular`, `.sk-inline`, `.hr-sp`, `.compactable`, `.proc-body` | Defined, not referenced |
| `.display-xl`, `.metric-xl`, `.thin`, `.upper`, `.nowrap`, `.hidden`, `.clip`, `.hairline-t`, `.hairline-b`, `.mt10`, `.mt12`, `.cols4`, `.c-soil`, `.c-sky`, `.static` | Utilities and variants kept for completeness |

## 11. Iconography

Icons are Phosphor 2.1.1, from `@phosphor-icons/react`. All 492 glyph variants the mockup bundles (123 icons in four weights) were checked against the published Phosphor 2.1.1 core assets and match exactly. The icon bundle is unchanged from the approved build.

Rules:

1. Weights in use: `regular` (default), `fill`, `bold`, and `duotone`. Use the weight the mockup uses on each usage.
2. The default size is 20px. Use the literal size on each usage.
3. Color is the `c` value when given, otherwise the inherited current color. Icons are `aria-hidden`.
4. One icon per concept, used everywhere. Do not add another icon family.
5. Import named icons only. Icons for Deferred features are in the mockup bundle but unused, so they are not imported (list below).
6. `Analyze`, `Overview`, and `Retry` are button labels in the source, not icons.

Port wrapper, equivalent to the mockup's `Ic` component:

```tsx
import * as Ph from "@phosphor-icons/react";

type Weight = "regular" | "fill" | "bold" | "duotone";
export function Ic({ n, w = "regular", s = 20, c, style, cls }: {
  n: string; w?: Weight; s?: number; c?: string; style?: React.CSSProperties; cls?: string;
}) {
  const Cmp = (Ph as unknown as Record<string, React.ComponentType<any>>)[n];
  if (!Cmp) return null;
  return <Cmp weight={w} size={s} className={cls}
    style={c ? { color: c, ...style } : style} aria-hidden="true" />;
}
```

For production, import named icons instead of the whole namespace, to keep the bundle small.

Concept icons (all exported by Phosphor 2.1.1):

| Concept | Icon | Concept | Icon |
|---|---|---|---|
| Recommend | `Sparkle` | Check-up | `Heartbeat` |
| Crop (generic) | `Plant` | Growth or thriving | `Leaf` |
| Field | `Polygon` | Space | `Stack` |
| Map | `MapTrifold` | Location pin | `MapPin` |
| Locate me | `Crosshair` | Draw polygon | `PenNib` |
| Photo or capture | `Camera` | Gallery | `Image` |
| Soil | `Mountains` | Moisture or water | `Drop` |
| Humidity | `DropHalf` | Temperature | `Thermometer` |
| Heat stress | `ThermometerHot` | Rain | `CloudRain` |
| Weather (generic) | `CloudSun` | Wind | `Wind` |
| Sun or clear | `Sun` | Elevation | `ArrowLineUp` |
| Dashboard | `SquaresFour` | Entries | `Images` |
| Analytics | `ChartDonut` | Reliability high, medium, low | `ShieldCheck`, `ShieldWarning`, `ShieldSlash` |
| Data source | `Database` | Model | `Cpu` |
| Promote | `Medal` | Roll back | `ArrowCounterClockwise` |
| Access code | `Key` | Members | `Users` |
| Spectate | `Eye` | Compare | `ArrowsLeftRight` |
| Planting window | `CalendarCheck` | Outcome | `Flag` |
| Notification | `Bell` | Announcement | `Megaphone` |
| Settings | `Gear` | Search | `MagnifyingGlass` |
| Sync or retry | `ArrowsClockwise` | Warning, at risk | `Warning`, `WarningOctagon` |
| Info | `Info` | Theme dark, light | `Moon`, `SunDim` |
| Back, forward | `CaretLeft`, `CaretRight` | Gate pass, fail | `CheckCircle`, `XCircle` |

Crop illustrations: the mockup draws each crop as an inline SVG (`CropIcon`, section 16): a 24px grid, 1.5px stroke, and an 18% family-tint tile. It is kept because it is the approved look.

Icons passed as props (`icon=`, option arrays, maps) take their weight and size from the host component:

| Host | Weight | Size |
|---|---|---|
| `Btn` icon | `fill` on primary buttons, else `regular` | 16 for `sm`, else 20 |
| `Badge` icon | `fill` | 13 |
| `Chip` icon | `fill` when on, else `regular` | 16 |
| `Seg` option icon | `fill` when on, else `regular` | 16 |
| `Tabs` option icon | `fill` when on, else `regular` | 17 |
| `Alert` icon | `fill` | 22 |
| `Empty` icon | `duotone` | 48 |
| Toast icon | `fill` | 22 |
| Rail item | `bold` when active, else `regular` | 22 |
| Tab bar item | `fill` when active, else `regular` | 24 |

Icon usage across the product, generated from the source. "Direct calls" counts lines with a literal `<Ic n="Name">`, and weight and size come from those calls. "Other lines" counts lines where the name appears as a string in a prop, option array, or map, so weight and size come from the host (table above). Used in lists up to five functions.

| Icon | Direct calls | Weight | Size | Other lines | Used in |
|---|---:|---|---|---:|---|
| `Archive` | 0 | by host | by host | 2 | FieldDetail |
| `ArrowCounterClockwise` | 1 | regular | 18, 22 | 7 | Analyze, AuditLog, FieldCapture, ModelDetail, SpaceCreate |
| `ArrowDown` | 1 | bold | 14 | 2 | Delta, MoistureSlider, ReasonList |
| `ArrowLeft` | 0 | by host | by host | 2 | CodeInput, MoistureSlider |
| `ArrowLineUp` | 0 | by host | by host | 4 | GROUP_META, LayerPreview, ResultBody, TrustPanel |
| `ArrowRight` | 1 | regular | 20 | 2 | CodeInput, MoistureSlider, ResultBody |
| `ArrowSquareOut` | 0 | by host | by host | 1 | EntryPeek |
| `ArrowUp` | 1 | bold | 14 | 2 | Delta, MoistureSlider, ReasonList |
| `ArrowsClockwise` | 2 | bold, regular | 15, 34 | 8 | AppRoot, AuditLog, EntryCard, EntryDetail, HubCodes |
| `ArrowsLeftRight` | 0 | by host | by host | 4 | Entries, EntryDetail, Tools, advise |
| `Backspace` | 0 | by host | by host | 1 | CodeInput |
| `Bell` | 2 | regular | 18, 22 | 4 | AdminApp, FarmerApp, MoreSheet, Notifs, Page |
| `BellRinging` | 1 | duotone | 28 | 0 | Tools |
| `CalendarCheck` | 1 | fill | 18 | 5 | Analyze, GROUP_META, ResultBody, Tools, advise |
| `Camera` | 1 | fill | 16 | 2 | EntryDetail, SettingsBody |
| `CaretLeft` | 3 | bold, regular | 16, 20 | 1 | AdminApp, EntryDetail, Page, Paginate |
| `CaretRight` | 8 | bold, regular | 11, 13, 14, 16, 18 | 1 | Acc, AdminApp, AdminPage, FieldDetail, MoreSheet |
| `ChartDonut` | 0 | by host | by host | 3 | FarmerApp, MoreSheet, rails |
| `Check` | 1 | bold | 14 | 6 | Advisory, CropEditor, EntryCard, FieldCapture, HubSettings |
| `CheckCircle` | 5 | fill | 18, 22 | 10 | Advisory, Alert, Dashboard, DataHealth, FieldCapture |
| `Checks` | 0 | by host | by host | 1 | Notifs |
| `ClockCounterClockwise` | 1 | regular | 18 | 1 | AdminApp, rails |
| `Cloud` | 0 | by host | by host | 1 | WX |
| `CloudLightning` | 0 | by host | by host | 1 | WX |
| `CloudRain` | 1 | fill | 14 | 4 | EntryCard, NK, Planting, WX, advise |
| `CloudSun` | 0 | by host | by host | 5 | LAYERS, LayerPreview, ResultBody, TrustPanel, WX |
| `Copy` | 0 | by host | by host | 2 | HubCodes, SpaceCreate |
| `CornersIn` | 0 | by host | by host | 1 | MapView |
| `CornersOut` | 0 | by host | by host | 1 | MapView |
| `Cpu` | 2 | duotone | 22, 34 | 2 | AdminApp, AdminOverview, DatasetSheet, rails |
| `Crop` | 0 | by host | by host | 2 | CropCatalog, ModelDetail |
| `Crosshair` | 1 | regular | 22 | 0 | MapView |
| `Database` | 0 | by host | by host | 3 | NK, Table, rails |
| `DotsThree` | 1 | bold | 24 | 0 | FarmerApp |
| `Drop` | 2 | fill | 11, 14 | 7 | Dashboard, EntryCard, GROUP_META, LAYERS, MOIST |
| `DropHalf` | 0 | by host | by host | 1 | MOIST |
| `Envelope` | 1 | regular | 20 | 0 | SignIn |
| `Eye` | 3 | fill, regular | 16 | 6 | AuditLog, EntryDetail, EntryPeek, FarmerApp, HubCodes |
| `EyeSlash` | 0 | by host | by host | 2 | HubCodes, SignIn |
| `Faders` | 0 | by host | by host | 1 | SettingsBody |
| `Flag` | 0 | by host | by host | 9 | AdminApp, EntryDetail, EntryPeek, NK, Outcomes |
| `Flask` | 0 | by host | by host | 2 | FarmerApp, MoreSheet |
| `Funnel` | 1 | regular | 20 | 0 | Entries |
| `Gear` | 3 | regular | 18, 22 | 3 | AdminApp, FarmerApp, MoreSheet, Page, SpaceHub |
| `GridFour` | 0 | by host | by host | 1 | AdminEntries |
| `Heartbeat` | 0 | by host | by host | 8 | AdminEntries, Analyze, Entries, EntryCard, EntryDetail |
| `Hourglass` | 0 | by host | by host | 3 | FieldDetail, HubCodes, Outcomes |
| `Image` | 1 | regular | 22 | 0 | Analyze |
| `Images` | 0 | by host | by host | 7 | Entries, EntryDetail, FarmerApp, HubEntries, SpaceHub |
| `Info` | 5 | fill | 18, 20 | 7 | Alert, CropEditor, FieldCapture, Onboarding, OutcomeQueue |
| `Key` | 0 | by host | by host | 8 | AuditLog, HubCodes, Onboarding, SettingsBody, SpaceCreate |
| `Leaf` | 0 | by host | by host | 2 | Outcomes, bandIcon |
| `Lightning` | 0 | by host | by host | 2 | AuditLog, ResultBody |
| `ListChecks` | 0 | by host | by host | 2 | AuditLog, rails |
| `Lock` | 1 | regular | 13 | 0 | Analyze |
| `LockKey` | 1 | regular | 20 | 1 | Forbidden, SignIn |
| `MagicWand` | 0 | by host | by host | 2 | FieldCapture, SpaceCreate |
| `MagnifyingGlass` | 3 | regular | 18 | 0 | AdminEntries, HubMembers, UsersAdmin |
| `MapPin` | 4 | fill, regular | 18, 20 | 1 | Analyze, FieldCapture, MapView, SpaceCreate |
| `MapTrifold` | 0 | by host | by host | 3 | AdminApp, FarmerApp, SettingsBody |
| `Medal` | 1 | duotone | 24 | 6 | AuditLog, DataHealth, ModelDetail, PromoteSheet, promoteModel |
| `Megaphone` | 2 | duotone | 22 | 5 | AuditLog, HubAnnounce, NK, SpaceHub, SpaceView |
| `Minus` | 3 | bold, regular | 14, 18, 20 | 2 | Dashboard, Delta, FieldCard, MapView, NumField |
| `MinusCircle` | 0 | by host | by host | 1 | ReasonList |
| `Moon` | 0 | by host | by host | 2 | SettingsBody, ThemeBtn |
| `Mountains` | 0 | by host | by host | 7 | GROUP_META, LAYERS, LayerPreview, ResultBody, TrustPanel |
| `Palette` | 0 | by host | by host | 1 | SettingsBody |
| `Password` | 0 | by host | by host | 2 | SignIn, SignUp |
| `PenNib` | 1 | duotone | 26 | 9 | AdminOverview, Analyze, AuditLog, FieldCapture, FieldDetail |
| `Plant` | 1 | duotone, regular | 18, 26 | 8 | AuditLog, Empty, FieldDetail, Outcomes, ResultBody |
| `Plus` | 4 | bold, regular | 14, 20, 28 | 0 | Analyze, Compare, MapView, NumField |
| `Polygon` | 0 | by host | by host | 12 | EntryDetail, EntryFilters, FarmerApp, FieldCapture, FieldDetail |
| `Prohibit` | 1 | duotone | 26 | 5 | AuditLog, HubCodes, OutcomeQueue, ResultBody, UsersAdmin |
| `Pulse` | 0 | by host | by host | 3 | AdminApp, DataHealth, rails |
| `Rows` | 0 | by host | by host | 2 | AdminEntries, Datasets |
| `Ruler` | 0 | by host | by host | 1 | advise |
| `Share` | 0 | by host | by host | 1 | I18N_EN |
| `ShieldCheck` | 1 | fill | 14 | 7 | Analyze, AuditLog, EntryCard, FieldDetail, OutcomeQueue |
| `ShieldSlash` | 1 | regular | 22 | 5 | Dashboard, EntryCard, Processing, RELI, ResultBody |
| `ShieldWarning` | 0 | by host | by host | 1 | RELI |
| `SignOut` | 2 | duotone, regular | 18, 28 | 2 | AdminApp, MoreSheet, SettingsBody, SpaceView |
| `Sliders` | 0 | by host | by host | 2 | AuditLog, SettingsBody |
| `Sparkle` | 2 | fill | 20, 28 | 14 | AdminEntries, Analyze, Dashboard, Entries, EntryCard |
| `SquaresFour` | 0 | by host | by host | 4 | FarmerApp, SpaceHub, rails |
| `Stack` | 2 | duotone, regular | 18, 24, 26 | 11 | Analyze, Dashboard, FarmerApp, FieldCapture, MoreSheet |
| `Sun` | 0 | by host | by host | 2 | MOIST, WX |
| `SunDim` | 0 | by host | by host | 2 | SettingsBody, ThemeBtn |
| `Table` | 0 | by host | by host | 1 | AdminEntries |
| `Target` | 0 | by host | by host | 1 | AuditLog |
| `Thermometer` | 0 | by host | by host | 6 | GROUP_META, LAYERS, LayerPreview, Planting, ResultBody |
| `ThermometerHot` | 0 | by host | by host | 2 | advise |
| `Translate` | 0 | by host | by host | 1 | SettingsBody |
| `Trash` | 0 | by host | by host | 7 | Entries, EntryDetail, FieldCapture, HubSettings, SpaceCreate |
| `User` | 0 | by host | by host | 2 | SettingsBody, UsersAdmin |
| `UserMinus` | 1 | regular | 18 | 1 | HubMembers |
| `UserPlus` | 0 | by host | by host | 1 | SignUp |
| `Users` | 0 | by host | by host | 5 | AuditLog, SpaceHub, UsersAdmin, rails |
| `Warning` | 3 | fill | 14, 15 | 8 | Advisory, Alert, CodeInput, CropEditor, EntryCard |
| `WarningOctagon` | 0 | by host | by host | 6 | Alert, FieldCapture, Outcomes, SpaceCreate, bandIcon |
| `Watch` | 0 | by host | by host | 1 | analyze |
| `Waves` | 0 | by host | by host | 1 | MOIST |
| `Wind` | 0 | by host | by host | 3 | MOIST, Planting, advise |
| `X` | 0 | by host | by host | 8 | Analyze, Dashboard, FieldCapture, OutcomeQueue, Overlays |
| `XCircle` | 1 | fill | 22 | 0 | PromoteSheet |

104 icons are used by the product. Used only in the excluded demo chrome: `BatteryFull`, `CellSignalFull`, `Desktop`, `DeviceMobile`, `DeviceTablet`, `Lightbulb`, `LockSimple`, `Phone`, `WifiHigh`. Bundled but never used (Deferred features and removed flows): `CircleNotch`, `Command`, `DownloadSimple`, `FileCsv`, `FileText`, `Hash`, `Link`, `PaperPlaneTilt`, `ShareNetwork`, `WifiSlash`.

## 12. Data visualization

No line graphs, area charts, or axis charts. Use these patterns.

| Pattern | Use | Build |
|---|---|---|
| Ring metric | One value: suitability, Health Index, high-reliability share | `Ring` (section 10.4). Magic UI ring only if it matches (section 14). |
| Ring cluster | Four drivers: fit, water, thermal, soil, each in its semantic hue | Several `Ring`s |
| Segmented bar | Distribution of crops or statuses | `SegBar`, `.sbar`, `.seg8` |
| Ranked rows | Top crops by field: icon, name, suitability bar, percentage | `.rowitem`, `Meter` |
| Week grid | Seven days of weather and workable days | `.week`, `.wd` |
| Stat row | Small label, large thin value, delta chip | `StatRow`, `.stat-row`, `.delta` |
| Statistical table | Model list, dataset list, per-class metrics, audit log | `.table` |
| Confusion matrix | Model detail: true class by predicted class | `confTable`: a `.table` with the diagonal tinted in `--primary` in proportion to the row share |
| Stops | Reliability tier (3 stops), moisture (5 stops) | `.mslider`, `RelBadge` |

Ring specification: stroke 8px (hero 12px), round caps, track in `--track` (the same value as `--border`), value stroke in the semantic color, center number in the Urbanist 250 weight, label beneath in `label` style, optional delta chip. Rings animate once on first view per session (the mockup's `seenRings` set). The ring that read "Match" is labeled "Suitability". Size, animation, and colors are unchanged.

## 13. States, feedback, and accessibility

### 13.1 States

| Element | Specification |
|---|---|
| Status dots | 8px, semantic color, 2s soft pulse only while live (processing layers, the current space) |
| Freshness stamp | `caption`, relative time such as "2 h ago", turns `--heat-text` when stale |
| Reliability badge | Shield icon and tier. A sheet lists the four checks in plain language (section 15.3). |
| Skeleton | Mirrors the final layout. Shimmer 1.4s. Static under reduced motion. |
| Empty state | Duotone icon 48px, `title-md`, one line of sub text, one primary action |
| Error | Inline, `--risk`, icon and a plain-language fix. Never raw codes. |
| Degraded result | Full-width warning `Alert` above the ranking, listing each warning in plain language |
| Abstained result | No ranking. A risk `Alert` with Retry, and a "What is missing" list (section 15.4) |
| Failed result | Processing ring stops, Retry shown, with a note that the attempt did not count against the quota |
| Optimistic updates | Delete, settings, and mark-read apply at once, with an undo toast where the blueprint specifies one |
| Haptics | Slider stops, confirmations, long-press. Mobile only. Vibration only. |
| Counters and rings | Animate on first view per session only |
| Pointer | Object cards `pointer`, map drawing `crosshair`, disabled `not-allowed` |
| Focus | 2px ring in `--ring-focus`, offset 2px, visible on keyboard focus only (`:focus-visible`) |

### 13.2 Accessibility

1. Contrast: body text is 7:1 or higher on the canvas. Every text pair is at least 4.5:1 after the corrections in section 6.5.
2. Color is never the only signal. Status pairs color with an icon and a label.
3. Targets are at least 44px. Primary actions are 52px on mobile.
4. The slider and picker support arrow keys, and screen readers announce the value, for example "Moisture, Moist, 4 of 5".
5. The map has keyboard-accessible controls, a text alternative for area and location, and the vertex list (section 7.7).
6. Reduced motion is honored, from the system setting or the app setting. Text scales to 200% without breaking the layout.
7. Language: English only. Strings use i18n keys, so Filipino can be added later (blueprint F-44). Number, date, and unit formatting follow the unit settings.

## 14. Component bank: registries and libraries

Components are installed from registries. They are not hand-built. The early principles name two registries: coss ui for primitives and Magic UI for animated components. Neither is a stock Radix or shadcn set.

### 14.1 Setup

```bash
# Project: Next.js with Tailwind v4, then initialize the shadcn CLI (registry plumbing).
npx shadcn@latest init

# coss ui: all primitives plus its neutral color tokens (coss ui "Get started" page).
pnpm dlx shadcn@latest add @coss/ui @coss/colors-neutral

# Individual coss ui components use the same pattern.
npx shadcn@latest add @coss/toolbar

# Magic UI: per component, through the shadcn @magicui namespace.
npx shadcn@latest add @magicui/shimmer-button
npx shadcn@latest add "https://magicui.design/r/marquee.json"

# Non-UI packages, pinned to the mockup versions where the mockup pins them.
pnpm add @phosphor-icons/react@2.1.1 leaflet@1.9.4
pnpm add @geoman-io/leaflet-geoman-free@2.17.0 @turf/turf@6.5.0 qrcode-generator@1.4.4
pnpm add react-hook-form zod next-intl
```

Verification status. The coss ui commands were checked against the coss ui documentation. The shadcn `init` step and the `@magicui/<slug>` form were checked against the Magic UI guidance. The Magic UI marquee and shimmer-button URLs were checked against published examples. Other slugs in section 14.2 are not verified. Run each `add` command, and review the diff after each one.

Components are installed into `components/ui` (coss ui) and `components/magicui` (Magic UI). Compatibility rule: a registry component renders its own classes, and the mockup's classes are applied to it. Because the mockup CSS is unlayered (section 5), the mockup's declared properties win on that element. Properties the mockup does not declare, such as focus outlines, keep the registry's values. Overlay components take the app root as their portal container (R11). If a registry component cannot match the mockup markup, keep the mockup implementation (section 3).

### 14.2 Where registry components are used

| Mockup component | Registry | Notes |
|---|---|---|
| Buttons (`.btn`) | `@coss/button` | Mockup classes (section 10.1). Sizes 36, 44, 52px. |
| Inputs and input groups | `@coss/input`, `@coss/input-group`, `@coss/field`, `@coss/label` | Labels above the input. Errors use `.err-msg` with the `Warning` icon. |
| Switch (`.switch`) | `@coss/switch` | Settings toggles, rule toggles |
| Slider (`.mslider`) | `@coss/slider` | The moisture slider keeps the mockup's custom track. The registry handles keyboard and value behavior. |
| Tabs (`.tabs`) | `@coss/tabs` | Animated indicator, as `.tind` |
| Dialog | `@coss/dialog`, `@coss/alert-dialog` | Confirmations (role change, roll back). Becomes a sheet on phones. |
| Sheet and drawer | `@coss/sheet` | Bottom sheet on phones, right drawer from `bp-md` |
| Menu (`.menu`) | `@coss/menu` | Row and card actions |
| Tooltip | `@coss/tooltip` | Icon-only controls |
| Toast (`.toast`) | `@coss/toast` | Position top on phones (section 8.3) |
| Alert (`.alert`) | `@coss/alert` | Disclaimer, degraded and abstained results, spectate banner |
| Badge (`.badge`) | `@coss/badge` | Status chips |
| Avatar (`.avatar`) | `@coss/avatar` | Users and members |
| Card (`.card`) | `@coss/card` | Object cards and sheets only |
| Table (`.table`) | `@coss/table` | Model list, datasets, per-class metrics, confusion matrix, audit log, users |
| Accordion (`.acc`) | `@coss/accordion` | Data-trust layers |
| Empty (`.empty`) | `@coss/empty` | Duotone icon and one action |
| Skeleton (`.skel`) | `@coss/skeleton` | Mirrors the final layout |
| Ring | Mockup `Ring` | Magic UI `animated-circular-progress-bar` only if it matches (section 3) |
| Number ticker | Mockup count-up (`useCount`) | Magic UI `number-ticker` only if verified |
| Shimmer CTA | `@magicui/shimmer-button` | The run-analysis action |
| Marquee | `@magicui/marquee` | Crop ribbon on onboarding |
| Blur fade | Mockup `BlurFade` | Principle: 40ms stagger |
| Orbit | Mockup orbit (`.orbit-stage`) | Keep the mockup implementation |
| Scroll progress | Mockup `ScrollProg` (`.scrollprog`) | Keep the mockup implementation |
| Theme toggle | Mockup `ThemeBtn` | Keep the mockup implementation |

Not used, because the feature is Deferred: `@coss/command` and `@coss/kbd` (command palette), and Magic UI `confetti`. Do not use Magic UI bento grids, which conflict with the card rule. The principles also list Magic UI `magic-card`, `border-beam`, `animated-list`, `avatar-circles`, `pulsating-button`, `ripple`, `hyper-text`, `morphing-text`, `dot-pattern`, and `text-animate`. Install each one when its screen is built, with the same verification.

### 14.3 Compositions

| Composition | Built from | Anatomy |
|---|---|---|
| EntryCard | `.entrycard`, `.card`, `Badge` | Photo thumbnail (4:5 phone, 1:1 desktop), title, date and kind line, crop and result row (suitability percent or Health Index). Status badge for Degraded, Processing, or Abstained. Hover or long-press shows the overlay: suitability or health, reliability tier, moisture, 7-day rain. |
| FieldCard | `FieldCard`, `.card`, `Ring` | Polygon thumbnail, name, place, area, latest status ring |
| SpaceCard | `.card`, `.astack` | Polygon thumbnail, name, member stack, field and entry counts |
| RingMetric | `Ring` | Value ring, label, optional delta chip |
| StatRow | `StatRow`, `.stat-row` | Small label, large value, delta chip, hairline |
| TopCropRow | `.rowitem`, `Meter` | Crop icon, crop name, field, suitability bar, percentage |
| WeekGrid | `.week`, `.wd` | Seven days: weekday, weather icon, high and low, rain percentage, workable marker |
| MoistureSlider | `.mslider`, `MoistureSlider` | Five stops, morphing label, water-tint track, haptic per stop |
| CropPicker | `CropPicker`, `.cropgrid`, `.cropcell` | Icon grid, 4 columns on phones and 6 at `bp-md`, single select |
| AnalyzeStepper | `.focus`, `.prog` | Four steps: field, type, photo, details. Progress hairline, back and next. |
| AutoChip | `.autochip` | Auto-filled date and location, with a lock icon |
| OrbitProgress | `.orbit-stage`, `.orbiter` | Four layers (soil and terrain, climate, forecast, your input). They read "reading" until the response arrives, then settle. The ring then completes. |
| ReliabilityBadge | `RelBadge`, `RelSheet` | High, medium, or low. The sheet shows four checks (section 15.3). |
| DataTrustPanel | `TrustPanel`, `.acc` | Per layer: status dot, source, provenance badge, freshness, note, flags |
| ReasonList | `ReasonList` | "What supports it" and "Limiting factors" lists with signed impact to two decimals, then a readiness line |
| GateTable | `PromoteSheet`, `.lstat` | G1 to G4 rows with a status dot, label, value, and a pass or fail icon |
| MapShell | `MapView`, `.mapwrap`, `.mapctl` | Tile switcher, locate, zoom, readouts, draw tools |
| SpectateBanner | `.sbanner` | Read-only strip with an exit action |
| PeekDrawer | `.drawer` | Right drawer with an entry, field, or dataset preview |

### 14.4 Page patterns

| Screen | Pattern | Implemented with |
|---|---|---|
| Farmer dashboard | Canvas, no cards. Greeting, ring cluster, ranked crops, week grid, field status rings, and a strip of recent entries as the only cards. | `.display-md`, `Ring`, `.rowitem`, `.week`, `.strip` |
| Entries gallery | Segmented tabs, a filter sheet, a uniform grid, newest first, day separators | `.seg`, `.sheet`, `.egrid`, `.daysep` |
| Entry detail | Edge-to-edge hero with a photo and map toggle, floating back button, two panes at `bp-lg` (result on the left, map and trust on the right) | `.twocol`, `.stick`, `.scrollprog` |
| Analyze flow | Full-screen focused mode, no tab bar, progress hairline, one decision per screen, primary action docked at 52px | `.focus`, `.focus-foot`, `.btn.lg` |
| Admin overview | Rail, top bar, six ring metrics, coverage map (8 columns) with crop distribution (4 columns), recent activity (refreshed on load) | `.admin-top`, `.twocol.e84`, `.rings` |
| Model Lab | A table with status, macro-F1, dataset, and gate result. Detail: essentials, confusion matrix, per-class table, holdout and support-band results, feature importance, the gate table, and champion history. Promote and roll back both ask for a reason. | `.table`, `.bars`, `.lstat` |
| Data health | Environment Grid manifest, champion status, and two provider checks with "Test now" | `.twocol`, `.lstat`, `SecHead` |
| Space creation | Full-bleed satellite map, floating step panel (sheet on phones, left panel on desktop), live area readout | `.mapwrap.bleed`, `.mapdrawer` |
| Auth and join | Calm large type, dot-pattern ground, single column, access code as `.codebox` with paste-split and auto-advance | `.dotpat`, `.codebox` |
| Onboarding | Two steps: preferences (units and map style), then join a space | `.marquee`, `Seg`, `.btn.lg` |

Check each screen against its pattern (section 19).

## 15. Result presentation

This section binds the blueprint's presentation rules (blueprint section 11) to the mockup's components and colors. The codes the model returns are mapped to i18n keys in `lib/codes.ts`. A code with no mapping shows as "unknown". Raw code strings are never displayed.

### 15.1 Suitability

The ring is labeled **Suitability**, with the class name as its sub-label. The ranking is ordered by suitability alone. Readiness (this week's conditions) is shown apart from it, on its own line and badge.

| Class | English | Badge tone |
|---|---|---|
| `S1` | Very suitable | growth |
| `S2` | Suitable | growth |
| `S3` | Moderately suitable | heat |
| `S4` | Marginally suitable | heat |
| `NS` | Not suitable | risk |

### 15.2 Reference disclaimer

Every assessment screen carries the reference disclaimer. It is an `Alert` with the `info` tone and the `Info` icon, and it is never hidden behind a tooltip. In the mockup the title is "Reference-based estimate" and the body is "Based on GAEZ suitability data and environmental datasets. This is not a field test or a guarantee of yield." The blueprint's sentence for the text key `assess.reference_disclaimer` is "Reference-based estimate from GAEZ suitability data and environmental datasets. This is not a field test or a guarantee of yield." Both read as the same sentence. Use two keys (title and body) so the rendered text keeps the mockup layout. The blueprint also asks for a `reference` badge. The mockup does not draw one (section 21).

### 15.3 Reliability

| Tier | Tone | Icon | Ring fill |
|---|---|---|---|
| High | growth | `ShieldCheck` | 100% |
| Medium | heat | `ShieldWarning` | 66% |
| Low | risk | `ShieldSlash` | 33% |

The result header shows a Reliability ring with the tier name in the center and the sub-label "Rule-based · not validated". The badge opens a sheet titled "Reliability" with four bars: Data completeness ("% of required features"), Input quality ("% passed checks"), Typicality (the typicality wording), and Model confidence ("% top class"). The sheet states the tier rules (High: all required data present, values inside plausible ranges, typical for the training data, and model confidence 0.60 or more. Medium: at least 80% of required data, not atypical, and confidence 0.40 or more. Otherwise Low) and ends with the note "Not an accuracy measure." A tier never claims to predict accuracy.

### 15.4 Statuses

| Status | Presentation |
|---|---|
| `ok` | Full ranking |
| `degraded` | Warning `Alert` titled "Degraded result · reliability capped at Medium", naming the partial sources. The ranking is shown beneath. |
| `abstained` | No ranking. The disclaimer, then a risk `Alert` titled "Not enough data to rank crops" with Retry, then a "What is missing" list of layers with a dot and a plain reason. A field outside the Environment Grid says "Environmental data could not be read for this location." |
| `failed` | Retry, with a note that the attempt did not count against the quota |

Processing view: the ring completes with a check for `ok` and `degraded`, with `ShieldSlash` for `abstained`, and stops for `failed`. Layers read "reading" until the response arrives. The view holds at least about one second and never invents progress.

### 15.5 Explanations, check-up, and readiness

Each ranked crop lists "What supports it" (growth, `ArrowUp`) and "Limiting factors" (heat, `ArrowDown`), up to three each, with signed impact to two decimals. A "Readiness this week · separate from suitability" line follows. Check-up shows the Health Index ring with its band (Thriving, Steady, Watch, At risk), four driver rings (Fit, Water, Thermal, Soil), a dash with a note when Water was omitted, and a "Consider instead" row when present. The moisture reading is shown as the farmer's own reading. The seven-day strip is hidden, with a note, when readiness is unavailable.

### 15.6 Provenance and typicality

| Provenance | Label | Badge tone |
|---|---|---|
| `modeled` | Modeled | soil |
| `derived` | Derived | sky |
| `reanalysis` | Reanalysis | heat |
| `forecast` | Forecast | water |
| `observed` | Measured | growth |

A modeled value is never presented as a field measurement. Measured is reserved for the farmer's own entries. Typicality wording: "Typical for the training data", "Unusual compared with the training data", "Atypical: unlike most of the training data". These describe representation only. The result footer names the Environment Grid and Open-Meteo, with their attribution.

### 15.7 Feedback and outcomes

The outcome screen reads "Tell us how the season went. Your outcome helps us review the model later. It does not change today's results." (the mockup says "report" where the blueprint says "outcome"; the blueprint wording is used). Result choices are good, average, poor, and failed. Review status shows as "Submitted" (heat, `Hourglass`) or "Reviewed" (growth, `ShieldCheck`), and admins can reject with a reason. Counts read "outcomes received" and "outcomes reviewed", never accuracy. There is no celebration animation.

### 15.8 Admin model views

| Element | Specification |
|---|---|
| Model status badge | champion: growth. candidate: heat. retired: neutral. Shadow is Deferred. |
| Gate table | Four rows, G1 to G4. A dot (`ok` or `bad`), the label, the value, and `CheckCircle` (growth) or `XCircle` (risk). |
| Promote | Disabled, with the failed criterion named, until all four gates pass. It asks for a reason. |
| Roll back | Shown on the champion when a previous champion exists. It asks for a reason. |
| Metrics | Essentials: accuracy, balanced accuracy, macro-F1, weighted F1, per-class table, confusion matrix. Optional metrics are off by default. |
| Crop catalogue notice | "This changes readiness and health only. Reference labels are not affected." in an `info` `Alert`. Saving creates a new catalogue version. |

## 16. Product runtime

### 16.1 Edits to the mockup source

The runtime below is the mockup's shared code, copied as written except for the edits listed in section 20. Port it to JSX and React state. Replace the global store `S` and `emit()` with React state or context, the hash router with the Next.js App Router, and the data accessors with server data. Keep the markup, class names, inline styles, delays, and copy. Screens are not reproduced here (section 17).

Settings and state defaults:

```js
/* settings defaults (stored in profiles.settings) and UI state */
const DEF_SETTINGS={theme:'dark',motion:'full',mapStyle:'sat',autoMap:false,labels:true,units:'metric',temp:'C',area:'ha',
  notif:{weather:true,announce:true},defaultKind:'recommend',homeLayout:'rings',
  alertHeat:34,alertRain:60};
const S={settings:Object.assign({},DEF_SETTINGS),session:{authed:false,role:null,email:'',name:''},
  ui:{ov:[],toasts:[]},route:{path:'/',q:{}},bp:'xs',hist:[],vt:null};
```

Copy (English only):

```js
/* copy: English only, through i18n keys */
const I18N_EN={home:'Home',entries:'Entries',analyze:'Analyze',fields:'Fields',more:'More',spaces:'Spaces',analytics:'Analytics',tools:'Tools',notifications:'Notifications',settings:'Settings',gm:'Good morning',ga:'Good afternoon',ge:'Good evening',avgMatch:'Avg suitability',fieldsL:'Fields',entriesMo:'Entries / mo',reliability:'Reliability',topCrops:'Top crops by field',thisWeek:'This week',fieldStatus:'Field status',recent:'Recent entries',recommend:'Recommend',checkup:'Check-up',next:'Next',back:'Back',run:'Run analysis',save:'Save',cancel:'Cancel',del:'Delete',share:'Share',rerun:'Re-run',compare:'Compare',logOutcome:'Log outcome',m1:'Bone dry',m2:'Dry',m3:'Balanced',m4:'Moist',m5:'Waterlogged',moisture:'Soil moisture',all:'All',signin:'Sign in',today:'Today',workable:'Workable',newfield:'New field',joinspace:'Join a space',whichfield:'Which field?',whattype:'What do you need?',photo:'Field photo',inputs:'Details',autoDate:'Date',autoLoc:'Location',crop:'Currently planted'};
I18N.en=I18N_EN;
const t=(k,fb)=>fb||I18N.en?.[k]||k;
```

Icon wrapper and crop illustrations. In the product, `Ic` is the Phosphor wrapper in section 11. The mockup version is shown for the call contract:

```js
/* ---------- icons ---------- */
function Ic({n,w='regular',s=20,c,style,cls}){const g=ICONS[n];if(!g){(window.__missing=window.__missing||new Set()).add(n);return null}return h('svg',{viewBox:'0 0 256 256',width:s,height:s,fill:'currentColor',class:cls,style:c?Object.assign({color:c},style):style,'aria-hidden':'true',dangerouslySetInnerHTML:{__html:g[w]||g.regular}})}
const CROP_SVG={
const FAM_COLOR={cereal:'var(--cereal)',root:'var(--root)',legume:'var(--legume)',fruit:'var(--fruit)',vegetable:'var(--vegetable)',plantation:'var(--plantation)',fiber:'var(--fiber)',herb:'var(--herb)'};
function CropIcon({id,s=40,bare}){const c=CROPS[id];if(!c)return null;const col=FAM_COLOR[c.family];const ico=h('svg',{viewBox:'0 0 24 24',width:bare?s:Math.round(s*.58),height:bare?s:Math.round(s*.58),fill:'none',stroke:'currentColor','stroke-width':1.5,'stroke-linecap':'round','stroke-linejoin':'round',dangerouslySetInnerHTML:{__html:CROP_SVG[id]||''}});
 if(bare)return h('span',{style:{color:col,display:'inline-flex'}},ico);return html`<span class="cropico" style=${{width:s+'px',height:s+'px',color:col,background:`color-mix(in oklab,${col} 18%,transparent)`,borderRadius:Math.round(s*.3)+'px'}}>${ico}</span>`}
```

Haptics, toasts, and overlays:

```js
/* ---------- haptics, toasts, overlays ---------- */
function haptic(k='tick'){if(S.settings.motion==='reduced'&&k==='tick')return;try{navigator.vibrate&&navigator.vibrate(k==='tick'?8:k==='ok'?[10,40,16]:20)}catch(e){}}
function toast(msg,o={}){const id=uid('t');const tt={id,msg,icon:o.icon||'CheckCircle',tone:o.tone||'growth',action:o.action,onAction:o.onAction,out:false};S.ui.toasts.push(tt);emit();setTimeout(()=>{tt.out=true;emit();setTimeout(()=>{S.ui.toasts=S.ui.toasts.filter(x=>x.id!==id);emit()},260)},o.dur||3200);return id}
function Toasts(){const s=useS();return html`<div class="toasts">${s.ui.toasts.map(x=>html`<div key=${x.id} class=${'toast'+(x.out?' out':'')}><${Ic} n=${x.icon} w="fill" s=22 c=${'var(--'+x.tone+')'}/><span>${x.msg}</span>${x.action&&html`<button class="tact" onClick=${()=>{x.onAction&&x.onAction();x.out=true;emit()}}>${x.action}</button>`}</div>`)}</div>`}
function openOv(kind,Comp,props={},opts={}){const id=uid('ov');S.ui.ov.push({id,kind,Comp,props,opts,closing:false});emit();return id}
const openSheet=(C,p,o)=>openOv('sheet',C,p,o),openDialog=(C,p,o)=>openOv('dialog',C,p,o);
function closeOv(id){const o=id?S.ui.ov.find(x=>x.id===id):S.ui.ov[S.ui.ov.length-1];if(!o||o.closing)return;o.closing=true;emit();setTimeout(()=>{S.ui.ov=S.ui.ov.filter(x=>x!==o);emit()},240)}
function Overlays(){const s=useS();useEffect(()=>{const k=e=>{if(e.key==='Escape'&&S.ui.ov.length)closeOv()};addEventListener('keydown',k);return()=>removeEventListener('keydown',k)},[]);
 return s.ui.ov.map(o=>{const close=()=>closeOv(o.id);const C=o.Comp;
  if(o.kind==='sheet')return html`<div key=${o.id} class=${'overlay'+(o.closing?' closing':'')}><div class="scrim" onClick=${close}></div><div class=${cx('sheet',o.opts.drawer&&'drawer',o.opts.wide&&'wide',o.closing&&'closing')}><div class="grab"></div>${o.opts.title&&html`<div class="sheet-h"><div class="title-md">${o.opts.title}</div><button class="iconbtn sm" onClick=${close}><${Ic} n="X" s=20/></button></div>`}<div class="sheet-b"><${C} close=${close} ...${o.props}/></div></div></div>`;
  return html`<div key=${o.id} class=${'overlay'+(o.closing?' closing':'')}><div class="scrim" onClick=${close}></div><div class="dialog"><${C} close=${close} ...${o.props}/></div></div>`})}
function confirmDlg({title,body,confirm='Confirm',tone='destructive',onOk,icon='Warning'}){openDialog(({close})=>html`<div class="col g3"><${Ic} n=${icon} w="duotone" s=40 c=${tone==='destructive'?'var(--risk)':'var(--primary)'}/><div class="title-md">${title}</div><div class="muted">${body}</div><div class="row g2 end mt4"><button class="btn secondary" onClick=${close}>${t('cancel')}</button><button class=${'btn '+(tone==='destructive'?'destructive':'primary')} onClick=${()=>{close();onOk&&onOk()}}>${confirm}</button></div></div>`)}
```

Hooks:

```js
/* ---------- hooks ---------- */
const reduced=()=>S.settings.motion==='reduced'||matchMedia('(prefers-reduced-motion: reduce)').matches;
function useCount(target,init,dur=620){const[n,setN]=useState(init??target);const prev=useRef(init??target);useEffect(()=>{if(reduced()){setN(target);prev.current=target;return}const from=prev.current,to=target,t0=performance.now();let raf;const step=t=>{const p=clamp((t-t0)/dur,0,1),e=1-Math.pow(1-p,3),v=from+(to-from)*e;prev.current=v;setN(v);if(p<1)raf=requestAnimationFrame(step)};raf=requestAnimationFrame(step);return()=>cancelAnimationFrame(raf)},[target]);return n}
const loadedKeys=new Set();
function useLoad(key,ms=520){const first=!loadedKeys.has(key);const[l,setL]=useState(first&&!reduced());useEffect(()=>{if(!l){loadedKeys.add(key);return}const tm=setTimeout(()=>{loadedKeys.add(key);setL(false)},ms);return()=>clearTimeout(tm)},[key]);return l}
function useInView(once=true){const ref=useRef();const[v,setV]=useState(false);useEffect(()=>{if(!ref.current||typeof IntersectionObserver==='undefined'){setV(true);return}const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){setV(true);once&&io.disconnect()}else if(!once)setV(false)},{threshold:.12});io.observe(ref.current);return()=>io.disconnect()},[]);return[ref,v]}
function useClickOut(ref,fn,on=true){useEffect(()=>{if(!on)return;const f=e=>{if(ref.current&&!ref.current.contains(e.target))fn()};addEventListener('pointerdown',f,true);return()=>removeEventListener('pointerdown',f,true)},[on])}
```

Primitives:

```js
/* ---------- primitives ---------- */
function BlurFade({children,delay=0,cls='',as='div',style}){const[ref,v]=useInView();const r=reduced();return h(as,{ref,class:cx('bf',(v||r)&&'in',cls),style:Object.assign({'--d':delay+'ms'},style)},children)}
function TextAnimate({parts}){return html`<span>${parts.map((p,i)=>html`<span key=${i} style=${{fontWeight:p.w||300,display:'inline-block',whiteSpace:'pre',color:p.c,animation:reduced()?'none':`morphin .7s var(--ease-em) ${i*80}ms both`}}>${p.t}</span>`)}</span>`}
const seenRings=new Set();
function Ring({value=0,max=100,size=96,stroke=8,color='var(--primary)',label,sub,delta,id,dec=0,suffix='',unit,center,noNum,lblCls,onClick}){
 const r=(size-stroke)/2,C=2*Math.PI*r,key=id||(label+'|'+size+'|'+color);const[v,setV]=useState(seenRings.has(key)||reduced()?value:0);const ref=useRef();
 useEffect(()=>{if(seenRings.has(key)||reduced()){setV(value);return}const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){seenRings.add(key);setTimeout(()=>setV(value),80);io.disconnect()}},{threshold:.2});ref.current&&io.observe(ref.current);return()=>io.disconnect()},[value]);
 const n=useCount(v,0);const frac=clamp(v/max,0,1);const fs=Math.round(size*(size>150?.36:.33));
 return html`<div class="ring-wrap col" style="align-items:center" onClick=${onClick}><div class="ring" ref=${ref} style=${{width:size+'px',height:size+'px'}}><svg width=${size} height=${size}><circle class="rtrack" cx=${size/2} cy=${size/2} r=${r} stroke-width=${stroke}/><circle class="rval" cx=${size/2} cy=${size/2} r=${r} stroke-width=${stroke} stroke=${color} stroke-dasharray=${C} stroke-dashoffset=${C*(1-frac)}/></svg>
  <div class="rc">${center||(noNum?null:html`<span style=${{font:`250 ${fs}px/1 var(--font-display)`,letterSpacing:'-.03em'}}>${fnum(n*(max===1?1:1),dec)}${suffix&&html`<span style=${{fontSize:Math.round(fs*.45)+'px',fontWeight:300,marginLeft:'1px'}}>${suffix}</span>`}</span>`)}${unit&&html`<span class="caption" style="margin-top:3px">${unit}</span>`}</div></div>
  ${label&&html`<div class=${'ring-lbl '+(lblCls||'')}><div class="label">${label}</div>${sub&&html`<div class="caption mt1">${sub}</div>`}${delta!=null&&html`<div class="mt1"><${Delta} v=${delta}/></div>`}</div>`}</div>`}
function Delta({v,suffix=''}){const c=v>0?'up':v<0?'dn':'eq';return html`<span class=${'delta '+c}><${Ic} n=${v>0?'ArrowUp':v<0?'ArrowDown':'Minus'} s=11 w="bold"/>${v>0?'+':''}${v}${suffix}</span>`}
function Meter({v,max=100,color,cls='',seg}){const[w,setW]=useState(0);useEffect(()=>{const a=requestAnimationFrame(()=>setW(clamp(v/max,0,1)));return()=>cancelAnimationFrame(a)},[v]);
 if(seg){const n=Math.round(w*seg);return html`<div class=${'meter seg8 '+cls}>${Array.from({length:seg},(_,i)=>html`<i class=${i<n?'f':''} style=${i<n&&color?{background:color}:null}></i>`)}</div>`}
 return html`<div class=${'meter '+cls}><i style=${{width:w*100+'%',background:color}}></i></div>`}
function SegBar({items,h:hh=12}){const tot=sum(items.map(i=>i.v))||1;return html`<div class="sbar" style=${{height:hh+'px'}}>${items.map(i=>html`<i style=${{flex:i.v/tot,background:i.c}} data-tip=${i.l+' · '+fnum(i.v/tot*100,0)+'%'}></i>`)}</div>`}
function SegRing({items,size=170,stroke=18,center}){const r=(size-stroke)/2,C=2*Math.PI*r,tot=sum(items.map(i=>i.v))||1;let off=0;const[go_,setGo]=useState(false);useEffect(()=>{const a=setTimeout(()=>setGo(true),80);return()=>clearTimeout(a)},[]);
 return html`<div class="ring" style=${{width:size+'px',height:size+'px'}}><svg width=${size} height=${size}><circle class="rtrack" cx=${size/2} cy=${size/2} r=${r} stroke-width=${stroke}/>${items.map((i,k)=>{const len=i.v/tot*C,gap=3;const el=html`<circle key=${k} cx=${size/2} cy=${size/2} r=${r} fill="none" stroke=${i.c} stroke-width=${stroke} stroke-dasharray=${go_?`${Math.max(len-gap,1)} ${C}`:`0 ${C}`} stroke-dashoffset=${-off} style=${{transition:`stroke-dasharray .8s var(--ease-ring) ${k*60}ms`}}/>`;off+=len;return el})}</svg><div class="rc">${center}</div></div>`}
function Badge({tone='',icon,children,cls='',lg,onClick}){return html`<span class=${cx('badge',tone,lg&&'lg',cls)} onClick=${onClick}>${icon&&html`<${Ic} n=${icon} w="fill" s=13/>`}${children}</span>`}
const Chip=({on,onClick,icon,children,sm,cls=''})=>html`<button class=${cx('chip',on&&'on',sm&&'sm',cls)} onClick=${e=>{haptic();onClick&&onClick(e)}} aria-pressed=${!!on}>${icon&&html`<${Ic} n=${icon} s=16 w=${on?'fill':'regular'}/>`}${children}</button>`;
const Dot=({s='ok',live})=>html`<span class=${cx('dot',s,live&&'live')}></span>`;
function Btn({children,cls='primary',icon,onClick,sz='',block,disabled,shimmer,ripple=true,style,title,type}){const ref=useRef();
 const down=e=>{if(!ripple||!ref.current)return;const b=ref.current,rc=b.getBoundingClientRect(),sc=rc.width/(b.offsetWidth||1);const d=Math.max(rc.width,rc.height)/sc*2.2;const s=document.createElement('span');s.className='ripple-s';s.style.cssText=`width:${d}px;height:${d}px;left:${(e.clientX-rc.left)/sc-d/2}px;top:${(e.clientY-rc.top)/sc-d/2}px`;b.appendChild(s);setTimeout(()=>s.remove(),620)};
 return html`<button ref=${ref} type=${type||'button'} class=${cx('btn',cls,sz,block&&'block',shimmer&&'shimmer')} disabled=${disabled} onPointerDown=${down} onClick=${e=>{haptic();onClick&&onClick(e)}} style=${style} title=${title}>${icon&&html`<${Ic} n=${icon} w=${cls==='primary'?'fill':'regular'} s=${sz==='sm'?16:20}/>`}${children}</button>`}
function Seg({opts,v,on,cls='',block}){const ref=useRef();const[pos,setPos]=useState({l:0,w:0});const m=()=>{const el=ref.current&&ref.current.querySelector('button.on');if(el)setPos({l:el.offsetLeft,w:el.offsetWidth})};
 useLayoutEffect(m,[v,opts.length]);useEffect(()=>{const ro=new ResizeObserver(m);ref.current&&ro.observe(ref.current);document.fonts&&document.fonts.ready.then(m);return()=>ro.disconnect()},[]);
 return html`<div class=${cx('seg',cls,block&&'block')} ref=${ref} role="tablist"><span class="ind" style=${{left:pos.l+'px',width:pos.w+'px'}}></span>${opts.map(o=>html`<button key=${o.k} role="tab" class=${o.k===v?'on':''} onClick=${()=>{haptic();on(o.k)}}>${o.i&&html`<${Ic} n=${o.i} s=16 w=${o.k===v?'fill':'regular'}/>`}${o.l}${o.n!=null&&html`<span style="opacity:.65;font-size:.9em">${o.n}</span>`}</button>`)}</div>`}
function Tabs({opts,v,on}){const ref=useRef();const[pos,setPos]=useState({l:0,w:0});const m=()=>{const el=ref.current&&ref.current.querySelector('button.on');if(el)setPos({l:el.offsetLeft,w:el.offsetWidth})};useLayoutEffect(m,[v]);useEffect(()=>{const ro=new ResizeObserver(m);ref.current&&ro.observe(ref.current);document.fonts&&document.fonts.ready.then(m);return()=>ro.disconnect()},[]);
 return html`<div class="tabs hide-sb" ref=${ref}>${opts.map(o=>html`<button key=${o.k} class=${o.k===v?'on':''} onClick=${()=>on(o.k)}>${o.i&&html`<${Ic} n=${o.i} s=17 w=${o.k===v?'fill':'regular'}/>`}${o.l}${o.n!=null&&html`<span class="badge">${o.n}</span>`}</button>`)}<span class="tind" style=${{left:pos.l+'px',width:pos.w+'px'}}></span></div>`}
const Switch=({on,onChange,label})=>html`<button class=${'switch'+(on?' on':'')} role="switch" aria-checked=${!!on} aria-label=${label} onClick=${()=>{haptic();onChange(!on)}}></button>`;
function Acc({head,children,open:o0=false,flush}){const[o,setO]=useState(o0);return html`<div class=${cx('acc',o&&'open')}><button class="acc-h" onClick=${()=>setO(!o)} aria-expanded=${o}><div class="grow">${head}</div><${Ic} n="CaretRight" s=16 cls="chev" w="bold"/></button><div class="acc-b"><div><div class="in">${children}</div></div></div></div>`}
function Pop({btn,children,align='right',up,cls=''}){const[o,setO]=useState(false);const ref=useRef();useClickOut(ref,()=>setO(false),o);
 return html`<span class="rel" ref=${ref} style="display:inline-flex">${btn(()=>setO(!o),o)}${o&&html`<div class=${'menu '+cls} style=${{[align]:0,[up?'bottom':'top']:'calc(100% + 6px)'}} onClick=${()=>setO(false)}>${typeof children==='function'?children(()=>setO(false)):children}</div>`}</span>`}
const Skel=({w='100%',h:hh=16,r,cls=''})=>html`<div class=${'skel '+cls} style=${{width:typeof w==='number'?w+'px':w,height:hh+'px',borderRadius:r}}></div>`;
const Empty=({icon='Plant',title,sub,action,onAction})=>html`<div class="empty"><div class="dotpat"></div><${Ic} n=${icon} w="duotone" s=48 cls="ei"/><div class="title-md">${title}</div><div class="muted body-sm" style="max-width:34ch">${sub}</div>${action&&html`<div class="mt4"><${Btn} onClick=${onAction}>${action}<//></div>`}</div>`;
const Alert=({tone='info',icon,title,children,action,onAction})=>html`<div class=${'alert '+tone}><${Ic} n=${icon||(tone==='risk'?'WarningOctagon':tone==='warn'?'Warning':tone==='ok'?'CheckCircle':'Info')} w="fill" s=22/><div class="grow"><b>${title}</b><span class="muted">${children}</span></div>${action&&html`<button class="btn sm secondary" onClick=${onAction} style="align-self:center">${action}</button>`}</div>`;
const Avatar=({u,sz='',style})=>{const nm=u?u.name:'?';return html`<span class=${'avatar '+sz} style=${Object.assign({background:u&&u.photo?`url(${u.photo})`:`hsl(${(u?hashStr(u.id||nm)%360:0)} 55% 68%)`},style)}>${!(u&&u.photo)&&nm.split(' ').map(x=>x[0]).slice(0,2).join('')}</span>`};
const AvatarStack=({users,max=4})=>html`<div class="astack">${users.slice(0,max).map(u=>html`<${Avatar} u=${u} sz="sm"/>`)}${users.length>max&&html`<span class="avatar sm more">+${users.length-max}</span>`}</div>`;
const SecHead=({label,right,cls=''})=>html`<div class=${'sec-h '+cls}><span class="label">${label}</span>${right}</div>`;
const StatRow=({label,value,delta,sub,unit})=>html`<div class="stat-row"><span class="label">${label}</span><div class="row g3 baseline"><span class="metric-md">${value}</span>${unit&&html`<span class="muted body-sm">${unit}</span>`}${delta!=null&&html`<${Delta} v=${delta}/>`}</div>${sub&&html`<span class="caption">${sub}</span>`}</div>`;
function Table({cols,rows,onRow,empty='Nothing here yet',dense}){return html`<div class="tscroll"><table class="table"><thead><tr>${cols.map(c=>html`<th class=${c.num?'num':''} style=${c.w?{width:c.w}:null}>${c.h}</th>`)}</tr></thead><tbody>${rows.length?rows.map((r,i)=>html`<tr class=${onRow?'hv':''} onClick=${onRow?()=>onRow(r):null}>${cols.map(c=>html`<td class=${c.num?'num':''}>${c.r(r,i)}</td>`)}</tr>`):html`<tr><td colspan=${cols.length}><${Empty} icon="Database" title=${empty}/></td></tr>`}</tbody></table></div>`}
function Paginate({page,pages,on}){return html`<div class="row g2 end mt3"><span class="caption" style="margin-right:6px">Page ${page+1} of ${pages}</span><button class="iconbtn sm bordered" disabled=${page<=0} onClick=${()=>on(page-1)}><${Ic} n="CaretLeft" s=16/></button><button class="iconbtn sm bordered" disabled=${page>=pages-1} onClick=${()=>on(page+1)}><${Ic} n="CaretRight" s=16/></button></div>`}
function NumField({v,on,min=0,max=999,step=1,suffix}){return html`<div class="numfield"><button onClick=${()=>on(clamp(+(v-step).toFixed(2),min,max))}><${Ic} n="Minus" s=14 w="bold"/></button><input value=${v} onInput=${e=>{const n=parseFloat(e.target.value);if(!isNaN(n))on(clamp(n,min,max))}}/>${suffix&&html`<span class="caption" style="margin-right:8px">${suffix}</span>`}<button onClick=${()=>on(clamp(+(v+step).toFixed(2),min,max))}><${Ic} n="Plus" s=14 w="bold"/></button></div>`}
function Field({label,children,err}){return html`<div class="field"><label>${label}</label>${children}${err&&html`<div class="err-msg"><${Ic} n="Warning" w="fill" s=14/>${err}</div>`}</div>`}
const Sel=({v,on,opts,cls=''})=>html`<div class=${'sel-wrap '+cls}><select class="input" value=${v} onChange=${e=>on(e.target.value)}>${opts.map(o=>html`<option value=${o.k??o} selected=${(o.k??o)===v}>${o.l??o}</option>`)}</select><${Ic} n="CaretRight" s=14 w="bold" style="transform:translateY(-50%) rotate(90deg)"/></div>`;
```

Moisture slider, QR code, and logo:

```js
/* moisture slider, QR, logo */
const MOIST=[{k:1,i:'Sun'},{k:2,i:'Wind'},{k:3,i:'DropHalf'},{k:4,i:'Drop'},{k:5,i:'Waves'}];
function MoistureSlider({v,on,disabled}){const ref=useRef();const[drag,setDrag]=useState(false);
 const setFrom=e=>{const tr=ref.current.querySelector('.mtrack').getBoundingClientRect();const f=clamp((e.clientX-tr.left)/tr.width,0,1);const k=Math.round(f*4)+1;if(k!==v){haptic();on(k)}};
 const key=e=>{if(e.key==='ArrowRight'||e.key==='ArrowUp'){e.preventDefault();on(Math.min(5,v+1));haptic()}if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();on(Math.max(1,v-1));haptic()}};
 const pos=k=>`calc(14px + (100% - 28px) * ${(k-1)/4})`;const lbl=t('m'+v);const cur=MOIST[v-1];
 return html`<div class="moist-wrap"><div class="col" style="align-items:center;gap:6px;margin-bottom:22px"><${Ic} n=${cur.i} w="duotone" s=56 c="var(--water)" style=${{transition:'transform .4s var(--spring)',transform:`scale(${.9+v*.04})`}}/><div class="display-md morph" key=${v}><span>${lbl}</span></div><div class="caption">${v} of 5 · ${['Cracked surface, plants wilting','Crumbly, dry to a thumb-depth','Holds shape, slightly cool','Dark and sticky, clearly damp','Standing water on the surface'][v-1]}</div></div>
 <div class=${'mslider'+(drag?' drag':'')} ref=${ref} role="slider" tabindex="0" aria-valuemin="1" aria-valuemax="5" aria-valuenow=${v} aria-valuetext=${`Moisture, ${lbl}, ${v} of 5`} onKeyDown=${key}
  onPointerDown=${e=>{if(disabled)return;e.currentTarget.setPointerCapture(e.pointerId);setDrag(true);setFrom(e)}} onPointerMove=${e=>{if(drag)setFrom(e)}} onPointerUp=${()=>setDrag(false)}>
  <div class="mtrack"><div class="mfill" style=${{width:`${(v-1)/4*100}%`}}></div></div>${MOIST.map(m=>html`<span class=${'mstop'+(m.k<=v?' f':'')} style=${{left:pos(m.k)}}></span>`)}<div class="mthumb" style=${{left:pos(v)}}><${Ic} n=${cur.i} w="fill" s=18/></div></div>
 <div class="row between" style="padding:0 4px">${MOIST.map(m=>html`<span class="caption tc" style=${{width:'20%',color:m.k===v?'var(--foreground)':'',fontWeight:m.k===v?700:500}}>${t('m'+m.k)}</span>`)}</div></div>`}

/* QR */
function QR({text,size=160}){let svg='';try{if(window.qrcode){const q=qrcode(0,'M');q.addData(text);q.make();const n=q.getModuleCount(),c=size/n;let p='';for(let r=0;r<n;r++)for(let k=0;k<n;k++)if(q.isDark(r,k))p+=`M${k*c} ${r*c}h${c}v${c}h${-c}z`;svg=`<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><path d="${p}" fill="currentColor"/></svg>`}}catch(e){}
 if(!svg){const rg=RNG(text),n=25,c=size/n;let p='';for(let r=0;r<n;r++)for(let k=0;k<n;k++){const f=(r<7&&k<7)||(r<7&&k>n-8)||(r>n-8&&k<7);const e=(r===0||r===6||k===0||k===6)||(r>1&&r<5&&k>1&&k<5);if(f?(r%(n-7)===0||k%(n-7)===0||k===6||r===6||k===n-1||r===n-1||(r>1&&r<5&&k>1&&k<5)||(r>1&&r<5&&k>n-6&&k<n-2)||(r>n-6&&r<n-2&&k>1&&k<5)):rg()>.52)p+=`M${k*c} ${r*c}h${c}v${c}h${-c}z`}svg=`<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><path d="${p}" fill="currentColor"/></svg>`}
 return html`<div dangerouslySetInnerHTML=${{__html:svg}} style="line-height:0"></div>`}

/* logo */
const Logo=({s=30})=>html`<svg class="logo-mark" width=${s} height=${s} viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="10" fill="var(--primary)"/><path d="M16 26V14" stroke="var(--primary-fg)" stroke-width="2.2" stroke-linecap="round"/><path d="M16 15c-4.5 0-7-2.6-7-6.5 4.5 0 7 2.6 7 6.5z" fill="var(--primary-fg)"/><path d="M16 19.5c4.2 0 6.8-2.3 6.8-6-4.2 0-6.8 2.3-6.8 6z" fill="var(--primary-fg)" opacity=".62"/></svg>`;
```

Result copy and tone constants (section 15):

```js
/* ---------- result copy and tone constants ---------- */
const CLASS_L={S1:'Very suitable',S2:'Suitable',S3:'Moderately suitable',S4:'Marginally suitable',NS:'Not suitable'};
const RELI={high:{tone:'growth',icon:'ShieldCheck',l:'High'},medium:{tone:'heat',icon:'ShieldWarning',l:'Medium'},low:{tone:'risk',icon:'ShieldSlash',l:'Low'}};
function RelBadge({tier,score,comps,lg}){const m=RELI[tier]||RELI.medium;return html`<button onClick=${()=>comps&&openSheet(RelSheet,{tier,score,comps},{title:'Reliability'})} style="display:inline-flex" data-tip=${'Reliability '+(score!=null?score.toFixed(2):'')}><${Badge} tone=${m.tone} icon=${m.icon} lg=${lg}>${m.l}<//></button>`}
function RelSheet({tier,comps}){const m=RELI[tier];const SUP={typical:'Typical for the training data',unusual:'Unusual compared with the training data',atypical:'Atypical: unlike most of the training data'};const supV={typical:100,unusual:60,atypical:20}[comps.feature_support];
 const bar=(l,v,txt)=>html`<div class="col g1"><div class="row between body-sm"><span style="font-weight:650">${l}</span><span class="mono muted">${txt}</span></div><${Meter} v=${v} color=${v>=80?'var(--growth)':v>=50?'var(--heat)':'var(--risk)'}/></div>`;
 return html`<div class="col g4"><div class="row g4"><${Badge} tone=${m.tone} icon=${m.icon} lg>${m.l} reliability<//><div class="grow body-sm muted">Rule-based, from four checks. High: all required data present, values inside plausible ranges, typical for the training data, and model confidence 0.60 or more. Medium: at least 80% of required data present, not atypical, and confidence 0.40 or more. Otherwise Low.</div></div>
 ${bar('Data completeness',comps.completeness*100,Math.round(comps.completeness*100)+'% of required features')}
 ${bar('Input quality',comps.input_quality*100,Math.round(comps.input_quality*100)+'% passed checks')}
 ${bar('Typicality',supV,SUP[comps.feature_support])}
 ${bar('Model confidence',comps.confidence*100,Math.round(comps.confidence*100)+'% top class')}
 <div class="alert info"><${Ic} n="Info" w="fill" s=18/><div class="body-sm"><b>Not an accuracy measure.</b>Typicality describes how representative the inputs are. It does not predict how accurate the ranking is. Validation against field outcomes comes in a later release.</div></div></div>`}
const FLAG_LBL={moisture_mismatch:'Moisture differs from model',photo_off_site:'Photo off-site'};
const SUP_LBL={typical:'Typical for the training data',unusual:'Unusual compared with the training data',atypical:'Atypical: unlike most of the training data'};
const PROV_LBL={modeled:'Modeled',derived:'Derived',reanalysis:'Reanalysis',forecast:'Forecast',observed:'Measured'};
const PROV_TONE={modeled:'soil',derived:'sky',reanalysis:'heat',forecast:'water',observed:'growth'};
const STAT_TONE={champion:'growth',candidate:'heat',retired:''};
const NK={entry:['Sparkle','growth'],weather:['CloudRain','water'],announce:['Megaphone','sky'],data:['Database','heat'],outcome:['Flag','soil']};
const WX={sun:{i:'Sun',l:'Clear'},partly:{i:'CloudSun',l:'Partly cloudy'},cloud:{i:'Cloud',l:'Overcast'},rain:{i:'CloudRain',l:'Rain'},storm:{i:'CloudLightning',l:'Thunderstorm'}};
const bandColor=b=>({Thriving:'var(--growth)',Steady:'color-mix(in oklab,var(--growth) 72%,var(--water))',Watch:'var(--heat)','At risk':'var(--risk)'})[b];
const bandIcon=b=>({Thriving:'Plant',Steady:'Leaf',Watch:'Warning','At risk':'WarningOctagon'})[b];
const bandTone=b=>({Thriving:'growth',Steady:'growth',Watch:'heat','At risk':'risk'})[b];
```

Map: geometry helpers, thumbnail, validation, tile layers, pins, and the map component. The procedural layer and the "Preview imagery" attribution are removed (section 20).

```js
/* ---------- geometry helpers ---------- */
const sum=a=>a.reduce((x,y)=>x+y,0),avg=a=>a.length?sum(a)/a.length:0;
const MLAT=111320,dLat=m=>m/MLAT,dLng=(m,lat)=>m/(MLAT*Math.cos(lat*Math.PI/180));
const polyAreaHa=p=>{const k=Math.cos(avg(p.map(q=>q[0]))*Math.PI/180)*MLAT;let a=0;for(let i=0;i<p.length;i++){const[y1,x1]=p[i],[y2,x2]=p[(i+1)%p.length];a+=x1*k*y2*MLAT-x2*k*y1*MLAT}return Math.abs(a)/2/1e4};
const centroidOf=p=>[avg(p.map(q=>q[0])),avg(p.map(q=>q[1]))];
const perimM=p=>{let s=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];const dy=(b[0]-a[0])*MLAT,dx=(b[1]-a[1])*MLAT*Math.cos(a[0]*Math.PI/180);s+=Math.hypot(dx,dy)}return s};
const distKm=(a,b)=>Math.hypot((a[0]-b[0])*111.32,(a[1]-b[1])*111.32*Math.cos(a[0]*Math.PI/180));

/* ---------- thumbnail ---------- */
function polyThumb(poly,{w=200,hh=200,fill='#C6F135',stroke='#C6F135'}={}){const lats=poly.map(p=>p[0]),lngs=poly.map(p=>p[1]);const a=Math.min(...lats),b=Math.max(...lats),l=Math.min(...lngs),r=Math.max(...lngs);const kx=Math.cos((a+b)/2*Math.PI/180);const sx=Math.max((r-l)*kx,1e-6),sy=Math.max(b-a,1e-6);const pad=.14;const sc=Math.min((w*(1-2*pad))/sx,(hh*(1-2*pad))/sy);const ox=(w-sx*sc)/2,oy=(hh-sy*sc)/2;const d=poly.map((p,i)=>{const x=ox+((p[1]-l)*kx)*sc,y=oy+(b-p[0])*sc;return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}).join(' ')+' Z';const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${hh}"><rect width="${w}" height="${hh}" fill="#17201b"/><path d="${d}" fill="${fill}" fill-opacity="0.38" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/></svg>`;return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}

/* geometry validation */
const pip=(pt,poly)=>{let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const[yi,xi]=poly[i],[yj,xj]=poly[j];if(((yi>pt[0])!==(yj>pt[0]))&&(pt[1]<(xj-xi)*(pt[0]-yi)/(yj-yi)+xi))ins=!ins}return ins};
const segInt=(a,b,c,d)=>{const o=(p,q,r)=>(q[1]-p[1])*(r[0]-q[0])-(q[0]-p[0])*(r[1]-q[1]);const o1=o(a,b,c),o2=o(a,b,d),o3=o(c,d,a),o4=o(c,d,b);return o1*o2<0&&o3*o4<0};
const selfX=p=>{const n=p.length;for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){if(i===0&&j===n-1)continue;if(segInt(p[i],p[(i+1)%n],p[j],p[(j+1)%n]))return true}return false};
function validatePoly(pts,bound,kind='field',bname){const n=pts.length;const area=n>=3?polyAreaHa(pts):0,perim=n>=3?perimM(pts):0;let area2=area;try{if(window.turf&&n>=3)area2=turf.area(turf.polygon([[...pts.map(p=>[p[1],p[0]]),[pts[0][1],pts[0][0]]]]))/1e4}catch(e){}
 const o={pts,areaHa:area2||area,perim,centroid:n?centroidOf(pts):null,ok:true,reason:''};
 if(n<3){o.ok=false;o.reason='Add at least 3 corners';return o}
 if(selfX(pts)){o.ok=false;o.reason='Edges cross each other — drag a corner to fix';return o}
 if(area<(kind==='space'?2:.03)){o.ok=false;o.reason=kind==='space'?'Space must be at least 2 ha':'Too small — minimum 0.03 ha';return o}
 if(bound){let inside=pts.every(p=>pip(p,bound));if(inside)for(let i=0;i<n&&inside;i++)for(let j=0;j<bound.length;j++)if(segInt(pts[i],pts[(i+1)%n],bound[j],bound[(j+1)%bound.length])){inside=false;break}if(!inside){o.ok=false;o.reason='Outside the '+(bname||'space')+' boundary';return o}}
 return o}

/* ---------- MapView ---------- */
const TILES={light:['https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png','© OpenStreetMap contributors © CARTO'],dark:['https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png','© OpenStreetMap contributors © CARTO'],sat:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}','Esri, Maxar, Earthstar Geographics']};
const PNG0='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const mapColors=st=>st==='light'?{pri:'#5F7C10',fld:'#101612'}:{pri:'#C6F135',fld:'#FFFFFF'};
function pinHTML(crop,status){const c=CROPS[crop];const col=c?FAM_COLOR[c.family]:'#C6F135';const hex={cereal:'#E6C86A',root:'#C89B6D',legume:'#8FBF7A',fruit:'#E58B6A',vegetable:'#6CC6A0',plantation:'#7FA8C9',fiber:'#B79AD6',herb:'#A6D68A'}[c&&c.family]||'#C6F135';const sd={ok:'#C6F135',warn:'#F5BC4B',bad:'#F0617B'}[status||'ok'];
 return `<div class="pin" style="background:#0b0e0c"><span><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="${hex}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${CROP_SVG[crop]||''}</svg></span><i style="background:${sd}"></i></div>`}
function MapView({defaultStyle,center=[13.1765,121.276],zoom=15,spaces=[],fields=[],bound,boundName,drawKind='field',apiRef,onMeasure,onFieldClick,onSpaceClick,selected,bleed,cls='',children,markers=[],fit,height,noStyle,noCtl,hideLabels,locatePt,drawing,minZoom=5,attribPad,strong}){
 const s=useS();const el=useRef(),M=useRef({}),[style,setStyle]=useState(()=>defaultStyle||(s.settings.autoMap?(s.settings.theme==='light'?'light':'dark'):s.settings.mapStyle));const[coords,setCoords]=useState(center);const[zm,setZm]=useState(zoom);const[realOk,setRealOk]=useState(false);const[labels,setLabels]=useState(s.settings.labels&&!hideLabels);const[fs,setFs]=useState(false);const[loc,setLoc]=useState(false);const[isDraw,setIsDraw]=useState(false);
 const compact=!!height&&height<340;const eff=s.settings.autoMap&&!defaultStyle?(s.settings.theme==='light'?'light':'dark'):style;const P=useRef({});P.current={onFieldClick,onSpaceClick,onMeasure,bound,boundName,drawKind};
 /* mount */
 useEffect(()=>{const map=L.map(el.current,{zoomControl:false,attributionControl:false,center,zoom,minZoom,maxZoom:19,zoomSnap:.5,zoomDelta:1,wheelPxPerZoomLevel:90,doubleClickZoom:false,boxZoom:false});M.current.map=map;M.current.vec=L.layerGroup().addTo(map);M.current.mk=L.layerGroup().addTo(map);
  map.on('mousemove',e=>{const n=performance.now();if(n-(M.current.lm||0)>60){M.current.lm=n;setCoords([e.latlng.lat,e.latlng.lng])}});map.on('zoomend',()=>setZm(map.getZoom()));map.on('moveend',()=>setCoords([map.getCenter().lat,map.getCenter().lng]));
  L.control.scale({imperial:false,position:'bottomright'}).addTo(map);const ro=new ResizeObserver(()=>map.invalidateSize());ro.observe(el.current);const _t0=setTimeout(()=>{try{map.invalidateSize()}catch(e){}},60);
  /* drawing plumbing */
  const D=M.current.draw={layer:null,hist:[],active:false};
  const measure=()=>{if(!D.layer)return;const pts=D.layer.getLatLngs()[0].map(p=>[p.lat,p.lng]);const v=validatePoly(pts,P.current.bound,P.current.drawKind,P.current.boundName);D.last=v;const col=mapColors(M.current.style||'sat');const ok=v.ok;D.layer.setStyle({color:ok?col.fld:'#F0617B',fillColor:ok?col.pri:'#F0617B',fillOpacity:ok?.2:.16,weight:2.5});
   D.layer.unbindTooltip();D.layer.bindTooltip(ok?fA(v.areaHa,2):v.reason,{permanent:true,direction:'center',className:'poly-chip'+(ok?'':' risk')});P.current.onMeasure&&P.current.onMeasure(v)};
  const adopt=layer=>{D.layer=layer;D.hist=[layer.getLatLngs()[0].map(p=>[p.lat,p.lng])];layer.addTo(map);try{layer.pm.enable({allowSelfIntersection:true,snappable:true,snapDistance:14})}catch(e){}
   const h=()=>{if(!D.layer)return;const pts=D.layer.getLatLngs()[0].map(p=>[p.lat,p.lng]);const last=D.hist[D.hist.length-1];if(!last||JSON.stringify(last)!==JSON.stringify(pts))D.hist.push(pts);measure()};['pm:edit','pm:markerdragend','pm:vertexadded','pm:vertexremoved'].forEach(ev=>layer.on(ev,h));measure();setIsDraw(false)};
  D.adopt=adopt;D.measure=measure;
  map.on('pm:create',e=>{map.pm.disableDraw();el.current.parentNode.classList.remove('drawing');if(D.layer){map.removeLayer(D.layer)}adopt(e.layer);haptic('ok')});
  const live=e=>{const wl=e.workingLayer;if(!wl)return;const pts=(wl.getLatLngs&&wl.getLatLngs()||[]).flat().map(p=>[p.lat,p.lng]);if(pts.length>=3){const v=validatePoly(pts,P.current.bound,P.current.drawKind,P.current.boundName);P.current.onMeasure&&P.current.onMeasure(Object.assign({},v,{live:true}))}else P.current.onMeasure&&P.current.onMeasure({ok:false,live:true,areaHa:0,perim:0,pts,reason:'Keep tapping corners — close the shape on the first point'})};
  map.on('pm:vertexadded',live);
  return()=>{clearTimeout(_t0);ro.disconnect();clearTimeout(M.current.fsT);map.remove()}},[]);
 /* tiles */
 useEffect(()=>{const map=M.current.map;if(!map)return;M.current.style=eff;if(M.current.real)map.removeLayer(M.current.real);const[u]=TILES[eff];const real=L.tileLayer(u,{maxZoom:19,subdomains:'abcd',zIndex:2,errorTileUrl:PNG0,crossOrigin:false,updateWhenZooming:false,keepBuffer:1}).addTo(map);real.on('tileload',()=>setRealOk(true));M.current.real=real;
  if(M.current.draw.layer)M.current.draw.measure()},[eff]);
 /* vectors */
 useEffect(()=>{const map=M.current.map;if(!map)return;const g=M.current.vec,col=mapColors(eff);g.clearLayers();
  spaces.forEach(sp=>{const tone=sp.status==='attention'?'#F5BC4B':col.pri;const pg=L.polygon(sp.boundary,{color:tone,weight:strong?3:2,dashArray:strong?null:'8 4',fillColor:tone,fillOpacity:strong?.28:(eff==='light'?.08:.06),interactive:!!onSpaceClick,pmIgnore:true}).addTo(g);if(onSpaceClick){pg.on('click',()=>P.current.onSpaceClick(sp));pg.on('mouseover',()=>pg.setStyle({fillOpacity:.2}));pg.on('mouseout',()=>pg.setStyle({fillOpacity:strong?.28:(eff==='light'?.08:.06)}))}
   if(labels)pg.bindTooltip(sp.name,{permanent:true,direction:'center',className:'map-lbl'})});
  if(bound&&!spaces.length)L.polygon(bound,{color:col.pri,weight:2,dashArray:'8 4',fillColor:col.pri,fillOpacity:eff==='light'?.08:.06,interactive:false,pmIgnore:true}).addTo(g);
  fields.forEach(f=>{const sel=f.id===selected;const pg=L.polygon(f.geom,{color:sel?col.pri:col.fld,weight:sel?3:2,fillColor:col.pri,fillOpacity:.18,className:sel?'dash-march':'',pmIgnore:true}).addTo(g);pg.on('click',()=>P.current.onFieldClick&&P.current.onFieldClick(f));if(labels)pg.bindTooltip(f.name,{permanent:true,direction:'center',className:'map-lbl'})});
  const mg=M.current.mk;mg.clearLayers();markers.forEach(m=>L.marker(m.at,{icon:m.bubble!=null?L.divIcon({className:'',html:`<div class="bubble">${m.bubble}</div>`,iconSize:[34,34],iconAnchor:[17,17]}):L.divIcon({className:'',html:pinHTML(m.crop,m.status),iconSize:[30,30],iconAnchor:[8,30]})}).on('click',()=>m.onClick&&m.onClick()).addTo(mg))},[eff,spaces,fields,selected,labels,bound,markers.length]);
 useEffect(()=>{const map=M.current.map;if(!map||!fit)return;const pts=fit;map.fitBounds(L.latLngBounds(pts),{padding:[fit.pad||40,fit.pad||40],maxZoom:fit.maxZoom||17,animate:false})},[JSON.stringify(fit&&fit.slice(0,2)),fit&&fit.length]);
 useEffect(()=>{const map=M.current.map;if(map&&drawing==='clear'){}},[drawing]);
 useEffect(()=>{const map=M.current.map;if(!map)return;if(M.current.fsT)clearTimeout(M.current.fsT);M.current.fsT=setTimeout(()=>{try{map.invalidateSize()}catch(e){}},320)},[fs]);
 /* api */
 useEffect(()=>{const map=M.current.map,D=M.current.draw;if(!apiRef)return;apiRef.current={map,
  startDraw(){if(D.layer){map.removeLayer(D.layer);D.layer=null}const col=mapColors(M.current.style);map.pm.disableDraw();map.pm.enableDraw('Polygon',{snappable:true,snapDistance:16,allowSelfIntersection:true,finishOn:'dblclick',tooltips:true,templineStyle:{color:col.pri,weight:2,dashArray:'6 6'},hintlineStyle:{color:col.pri,weight:2,dashArray:'6 6'},pathOptions:{color:col.fld,weight:2.5,fillColor:col.pri,fillOpacity:.2},markerStyle:{radius:6}});el.current.parentNode.classList.add('drawing');setIsDraw(true);P.current.onMeasure&&P.current.onMeasure({ok:false,live:true,areaHa:0,perim:0,pts:[],reason:'Tap the map to place the first corner'})},
  cancel(){map.pm.disableDraw();el.current.parentNode.classList.remove('drawing');setIsDraw(false)},
  undo(){if(isDrawNow()){try{map.pm.Draw.Polygon._removeLastVertex()}catch(e){}return}if(D.layer&&D.hist.length>1){D.hist.pop();const prev=D.hist[D.hist.length-1];D.layer.pm.disable();D.layer.setLatLngs([prev]);D.layer.pm.enable({allowSelfIntersection:true,snappable:true});D.measure()}},
  clear(){map.pm.disableDraw();el.current.parentNode.classList.remove('drawing');if(D.layer){map.removeLayer(D.layer);D.layer=null}D.hist=[];setIsDraw(false);P.current.onMeasure&&P.current.onMeasure(null)},
  sketch(wm=120,hm=95){const c=map.getCenter();const b=P.current.bound;let pt=[c.lat,c.lng];if(b&&!pip(pt,b))pt=centroidOf(b);const g=dLat(hm/2),g2=dLng(wm/2,pt[0]);const pts=[[pt[0]-g,pt[1]-g2],[pt[0]-g*.9,pt[1]+g2*1.05],[pt[0]+g,pt[1]+g2],[pt[0]+g*1.05,pt[1]-g2*.95]];if(D.layer)map.removeLayer(D.layer);map.pm.disableDraw();const poly=L.polygon(pts);D.adopt(poly);map.flyToBounds(poly.getBounds().pad(2.2),{duration:.6})},
  setPoly(pts){const poly=L.polygon(pts);if(D.layer)map.removeLayer(D.layer);D.adopt(poly);map.fitBounds(poly.getBounds().pad(1.6),{maxZoom:18,animate:false})},
  fit(pts,o){map.fitBounds(L.latLngBounds(pts),Object.assign({padding:[40,40],maxZoom:17},o))},
  layer:()=>D.layer,last:()=>D.last};
  const isDrawNow=()=>!!(map.pm.globalDrawModeEnabled&&map.pm.globalDrawModeEnabled());
  return()=>{if(apiRef)apiRef.current=null}},[]);
 const zoomBy=d=>M.current.map&&M.current.map.setZoom(M.current.map.getZoom()+d);
 const locate=()=>{const map=M.current.map;if(!map)return;haptic('ok');const pt=locatePt||(bound?centroidOf(bound):center);const p=[pt[0]+.0006,pt[1]-.0009];if(M.current.loc)M.current.loc.remove();const g=L.layerGroup().addTo(map);L.circle(p,{radius:34,color:'#9AB4FF',weight:1,fillColor:'#9AB4FF',fillOpacity:.14,interactive:false}).addTo(g);L.marker(p,{icon:L.divIcon({className:'',html:'<div class="loc-dot"></div>',iconSize:[16,16],iconAnchor:[8,8]}),interactive:false}).addTo(g);M.current.loc=g;setLoc(true);map.flyTo(p,17,{duration:1.1})};
 const attrib=TILES[eff][1];
 return html`<div class=${cx('mapwrap',bleed&&'bleed',fs&&'fs',compact&&'compact',cls)} style=${height?{height:height+'px'}:null}><div ref=${el} class="leaflet-host" style="position:absolute;inset:0"></div>
 ${!noStyle&&html`<div class="mapstyle"><${Seg} sm opts=${[{k:'sat',l:'Satellite'},{k:'dark',l:'Dark'},{k:'light',l:'Light'}]} v=${eff} on=${k=>{setStyle(k)}}/></div>`}
 ${!noCtl&&html`<div class="mapctl" style="right:12px;top:${noStyle?12:58}px"><div class="group"><button class="cbtn" aria-label="Zoom in" onClick=${()=>zoomBy(1)}><${Ic} n="Plus" s=20/></button><button class="cbtn" aria-label="Zoom out" onClick=${()=>zoomBy(-1)}><${Ic} n="Minus" s=20/></button></div><button class=${'cbtn'+(loc?' on':'')} aria-label="Locate me" onClick=${locate}><${Ic} n="Crosshair" s=22 w=${loc?'fill':'regular'}/></button>${!compact&&html`<button class=${'cbtn'+(labels?' on':'')} aria-label="Labels" onClick=${()=>setLabels(!labels)}><${Ic} n="MapPin" s=20 w=${labels?'fill':'regular'}/></button><button class="cbtn" aria-label="Fullscreen" onClick=${()=>setFs(!fs)}><${Ic} n=${fs?'CornersIn':'CornersOut'} s=20/></button>`}</div>
 <div class="mapread"><div>${fCoord(coords[0],coords[1])}</div><div style="opacity:.7">z${zm.toFixed(1)} · ${eff==='sat'?'Esri World Imagery':eff==='dark'?'CARTO Dark Matter':'CARTO Positron'}</div></div>`}
 <div class="mapattr" style=${attribPad?{bottom:attribPad+'px'}:null}>${attrib}</div>${children}</div>`}
```

Processing layers:

```js
/* layers shown on the processing screen */
const LAYERS=[['soil','Mountains','Soil & terrain','Environment Grid'],['climate','Thermometer','Climate','Environment Grid'],['weather','CloudSun','Forecast','Open-Meteo'],['input','Drop','Your input','Field form']];
```

Farmer shell, page frame, and routes:

```js
/* ================= Farmer app: shell, page frame ================= */
let VIEW={base:'/farmer',uid:null,ro:false};
const fp=p=>VIEW.base+p;
const entryImg=e=>e.photo.url;
const curSpace=()=>{const ms=mySpaces(VIEW.uid);return ms.find(s=>s.id===S.cur.spaceId)||ms[0]||null};
const spaceFields=()=>{const sp=curSpace();return sp?myFields(VIEW.uid,sp.id):[]};
const roGuard=()=>{if(VIEW.ro){toast('Spectate mode is read-only',{icon:'Eye',tone:'sky'});return true}return false};
const wxIcon=c=>({sun:'var(--heat)',partly:'var(--sky)',cloud:'var(--muted)',rain:'var(--water)',storm:'var(--water)'})[c];
const bpWide=bp=>bp!=='xs'&&bp!=='sm';
function Page({title,backTo,right,children,wide,top}){const ref=useRef();const[c,setC]=useState(false);const s=useS();
 useEffect(()=>{const sc=ref.current&&ref.current.closest('.scroll');if(!sc)return;const f=()=>setC(sc.scrollTop>40);f();sc.addEventListener('scroll',f,{passive:true});return()=>sc.removeEventListener('scroll',f)},[]);
 const nu=S.db.notifs.filter(n=>n.userId===VIEW.uid&&!n.read).length;
 return html`<div class="page" ref=${ref}><div class=${'topbar'+(c?' condensed':'')}>
  ${backTo?html`<button class="iconbtn bordered" aria-label="Back" onClick=${()=>back(backTo)}><${Ic} n="CaretLeft" s=20 w="bold"/></button>`:html`<${SpaceChip}/>`}
  ${backTo&&html`<div class="ttl">${title}</div>`}<div class="grow"></div>${right}
  ${!backTo&&html`<button class="iconbtn" aria-label="Notifications" onClick=${()=>go(fp('/notifications'))}><${Ic} n="Bell" s=22/>${nu>0&&html`<span class="badge-n">${nu}</span>`}</button><button class="iconbtn hide-md" aria-label="Settings" onClick=${()=>go(fp('/settings'))}><${Ic} n="Gear" s=22/></button>`}</div>
  <div class=${'page-in pad'+(wide?' wide':'')}>${children}</div></div>`}
function SpaceChip(){const sp=curSpace();const ms=mySpaces(VIEW.uid);
 return html`<button class="chip" style="max-width:62%;padding:0 12px 0 14px" onClick=${()=>openSheet(SpaceSwitch,{},{title:'Your spaces'})}><${Dot} s=${sp&&sp.status==='attention'?'warn':'ok'} live/><span class="ellip">${sp?sp.name:'No space yet'}</span><${Ic} n="CaretRight" s=13 w="bold" style="transform:rotate(90deg)"/></button>`}
function SpaceSwitch({close}){const ms=mySpaces(VIEW.uid);return html`<div class="col g1">${ms.map(sp=>html`<button class=${'rowitem hv'+(sp.id===S.cur.spaceId?' sel':'')} onClick=${()=>{S.cur.spaceId=sp.id;emit();close();haptic()}}><span class="cropico" style="width:44px;height:44px;background:var(--accent-tint);color:var(--primary)"><${Ic} n="Stack" w="duotone" s=24/></span><div class="grow"><div class="title-sm">${sp.name}</div><div class="body-sm muted">${sp.place.municipality} · ${myFields(VIEW.uid,sp.id).length} fields · ${membersOf(sp.id).length} farmers</div></div>${sp.id===S.cur.spaceId&&html`<${Ic} n="CheckCircle" w="fill" s=22 c="var(--primary)"/>`}</button>`)}
 ${!VIEW.ro&&html`<div class="mt4 col g2"><${Btn} cls="secondary" icon="Key" block onClick=${()=>{close();setTimeout(()=>openSheet(JoinSheet,{},{title:'Join a space'}),260)}}>${t('joinspace')}<//></div>`}</div>`}
function FarmerApp({base='/farmer',sub='/',uid,readonly}){const s=useS();VIEW={base,uid:uid||meId(),ro:!!readonly};const parts=seg(sub);const bp=s.bp,wide=bpWide(bp),focusMode=parts[0]==='analyze'||(parts[0]==='fields'&&(parts[1]==='new'||parts[2]==='edit'));
 const ref=useRef();useEffect(()=>{ref.current&&ref.current.scrollTo({top:0,behavior:'instant'})},[sub]);
 const nav=[['','home','SquaresFour'],['entries','entries','Images'],['analyze','analyze','Sparkle'],['fields','fields','Polygon'],['spaces','spaces','Stack'],['analytics','analytics','ChartDonut'],['tools','tools','Flask'],['notifications','notifications','Bell'],['settings','settings','Gear']];
 const cur=parts[0]||'';const nUnread=S.db.notifs.filter(n=>n.userId===VIEW.uid&&!n.read).length;
 let view;switch(cur){case'':view=html`<${Dashboard}/>`;break;case'entries':view=parts[1]?html`<${EntryDetail} id=${parts[1]} key=${parts[1]}/>`:html`<${Entries}/>`;break;
  case'analyze':view=parts[1]==='processing'?html`<${Processing} id=${parts[2]} key=${parts[2]}/>`:html`<${Analyze} key="az"/>`;break;
  case'fields':view=parts[1]==='new'?html`<${FieldCapture} key="fn"/>`:parts[2]==='edit'?html`<${FieldCapture} editId=${parts[1]} key=${'fe'+parts[1]}/>`:parts[1]?html`<${FieldDetail} id=${parts[1]} key=${parts[1]}/>`:html`<${Fields}/>`;break;
  case'spaces':view=parts[1]?html`<${SpaceView} id=${parts[1]} key=${parts[1]}/>`:html`<${SpacesList}/>`;break;case'analytics':view=html`<${FAnalytics}/>`;break;
  case'tools':view=html`<${Tools} tool=${parts[1]} key=${parts[1]||'t'}/>`;break;case'notifications':view=html`<${Notifs}/>`;break;case'settings':view=html`<${SettingsPage} role="farmer"/>`;break;default:view=html`<${Empty} icon="MapTrifold" title="Page not found" sub="That screen doesn't exist." action="Back to home" onAction=${()=>go(fp('/'))}/>`}
 const showTab=!wide&&!focusMode,showRail=wide&&!focusMode;const expanded=bp==='lg'||bp==='xl'||bp==='2xl';
 return html`<div class=${cx('farmer-root','fill')} style=${{'--tabbar-h':showTab?'88px':'0px'}}>
  ${showRail&&html`<nav class=${'rail'+(expanded?' expanded':'')} aria-label="Primary"><div class="rail-head"><${Logo}/><span class="rl">Herra</span></div>${nav.map(([k,lb,ic])=>html`<${Link} to=${fp(k?'/'+k:'/')} cls=${'rail-item'+(cur===k?' on':'')}><${Ic} n=${ic} s=22 w=${cur===k?'bold':'regular'}/><span class="rl">${t(lb)}</span>${lb==='notifications'&&nUnread>0&&html`<span class="cnt rl">${nUnread}</span>`}<//>`)}<div class="grow"></div><${Link} to=${fp('/analyze')} cls="btn primary block" style="padding:0 12px"><${Ic} n="Sparkle" w="fill" s=20/><span class="rl">${t('run').split(' ')[0]==='Run'?'New analysis':t('analyze')}</span><//></nav>`}
  <div class=${'scroll'+(showRail?(expanded?' with-rail-x':' with-rail'):'')} ref=${ref} style=${showRail?{left:expanded?'240px':'72px'}:null}>${VIEW.ro&&html`<div class="spectate"><div class="sbanner"><${Ic} n="Eye" w="fill" s=16/>Spectating ${getUser(VIEW.uid).name} · read-only<div class="grow"></div><button class="btn sm secondary" onClick=${()=>go('/admin/users')}>Exit</button></div></div>`}${view}</div>
  ${showTab&&html`<div class="tabbar" role="tablist">${[['','home','SquaresFour'],['entries','entries','Images']].map(([k,lb,ic])=>html`<${Link} to=${fp(k?'/'+k:'/')} cls=${'tab'+(cur===k?' on':'')}><${Ic} n=${ic} s=24 w=${cur===k?'fill':'regular'}/>${t(lb)}<//>`)}<${Link} to=${fp('/analyze')} cls="analyze-fab" aria-label="Analyze"><${Ic} n="Sparkle" w="fill" s=28/><//>${[['fields','fields','Polygon']].map(([k,lb,ic])=>html`<${Link} to=${fp('/'+k)} cls=${'tab'+(cur===k?' on':'')}><${Ic} n=${ic} s=24 w=${cur===k?'fill':'regular'}/>${t(lb)}<//>`)}<button class=${'tab'+(['spaces','analytics','tools','notifications','settings'].includes(cur)?' on':'')} onClick=${()=>openSheet(MoreSheet,{},{title:t('more')})}><${Ic} n="DotsThree" s=24 w="bold"/>${t('more')}</button></div>`}</div>`}
function MoreSheet({close}){const items=[['spaces','spaces','Stack'],['analytics','analytics','ChartDonut'],['tools','tools','Flask'],['notifications','notifications','Bell'],['settings','settings','Gear']];
 return html`<div class="col">${items.map(([k,lb,ic])=>html`<button class="rowitem hv" onClick=${()=>{close();go(fp('/'+k))}}><${Ic} n=${ic} w="duotone" s=28 c="var(--primary)"/><span class="title-sm grow">${t(lb)}</span><${Ic} n="CaretRight" s=16 c="var(--subtle)"/></button>`)}<button class="rowitem hv" onClick=${()=>{close();signOut()}}><${Ic} n="SignOut" w="duotone" s=28 c="var(--risk)"/><span class="title-sm grow c-risk">Sign out</span></button></div>`}
```

Auth shell:

```js
/* ---------- auth shell ---------- */
function AuthShell({title,sub,children,foot}){return html`<div class="fill" style="overflow-y:auto"><div class="dotpat" style="position:fixed"></div><div class="col" style="min-height:100%;max-width:440px;margin:0 auto;padding:78px 24px 32px;position:relative;justify-content:center"><div class="row g3" style="margin-bottom:28px"><${Logo} s=40/><span class="title-lg" style="font-weight:800">Herra AI</span></div><${BlurFade}><div class="display-md" style="margin-bottom:8px">${title}</div><div class="muted body-lg" style="margin-bottom:28px">${sub}</div><//>${children}<div class="mt8 tc muted body-sm">${foot}</div></div></div>`}
```

Admin shell and routes:

```js
/* ================= Admin console: shell ================= */
const rails=[['','Overview','SquaresFour'],['spaces','Spaces','Stack'],['entries','Entries','Images'],['analytics','Analytics','ChartDonut'],['models','Model Lab','Cpu'],['datasets','Datasets','Database'],['data-health','Data health','Pulse'],['crops','Crop catalog','Plant'],['advisory','Advisory','ListChecks'],['outcomes','Outcomes','Flag'],['users','Users','Users'],['audit','Audit log','ClockCounterClockwise']];
function toggleTheme(ev){const next=(S.settings.theme==='light'||(S.settings.theme==='system'&&!matchMedia('(prefers-color-scheme: dark)').matches))?'dark':'light';const r=ev&&ev.currentTarget?ev.currentTarget.getBoundingClientRect():null;
 const apply=()=>{document.documentElement.dataset.theme=next;setSet('theme',next)};if(!document.startViewTransition||reduced()){apply();return}
 if(r){document.documentElement.style.setProperty('--tx',(r.left+r.width/2)+'px');document.documentElement.style.setProperty('--ty',(r.top+r.height/2)+'px')}document.documentElement.classList.add('vt-theme');const vt=document.startViewTransition(apply);vt.finished.finally(()=>document.documentElement.classList.remove('vt-theme'))}
const ThemeBtn=()=>{const dark=document.documentElement.dataset.theme!=='light';return html`<button class="iconbtn bordered sm" aria-label="Toggle theme" onClick=${toggleTheme}><${Ic} n=${dark?'Moon':'SunDim'} w="fill" s=18/></button>`};
function AdminApp({sub='/'}){const s=useS();const parts=seg(sub);const bp=s.bp;const[col,setCol]=useState(false);const cur=parts[0]||'';const me_=me();
 useEffect(()=>{if(parts[0]==='spectate'&&parts[1])audit('spectate','user',parts[1])},[parts[0]==='spectate'&&parts[1]]);
 if(parts[0]==='spectate'&&parts[1]){const uid_=parts[1];return html`<${FarmerApp} base=${'/admin/spectate/'+uid_} sub=${'/'+parts.slice(2).join('/')} uid=${uid_} readonly/>`}
 const narrow=bp==='xs'||bp==='sm'||bp==='md',w=(col||narrow)?72:240;const pend=S.db.outcomes.filter(o=>o.status==='submitted').length;
 let view;switch(cur){case'':view=html`<${AdminOverview}/>`;break;case'spaces':view=parts[1]==='new'?html`<${SpaceCreate} key="new"/>`:parts[1]?html`<${SpaceHub} id=${parts[1]} tab=${parts[2]||'overview'} key=${parts[1]}/>`:html`<${SpacesAdmin}/>`;break;
  case'entries':view=parts[1]?html`<${AdminEntryDetail} id=${parts[1]} key=${parts[1]}/>`:html`<${AdminEntries}/>`;break;case'analytics':view=html`<${AdminAnalytics}/>`;break;case'models':view=parts[1]?html`<${ModelDetail} id=${parts[1]} key=${parts[1]}/>`:html`<${ModelLab}/>`;break;
  case'datasets':view=html`<${Datasets}/>`;break;case'crops':view=html`<${CropCatalog}/>`;break;case'advisory':view=html`<${Advisory}/>`;break;case'data-health':view=html`<${DataHealth}/>`;break;case'outcomes':view=html`<${OutcomeQueue}/>`;break;case'users':view=html`<${UsersAdmin}/>`;break;case'audit':view=html`<${AuditLog}/>`;break;
  case'settings':view=html`<${AdminPage} title="Settings" sub="Personalized for your admin account."><${SettingsBody} role="admin"/><//>`;break;default:view=html`<${AdminPage} title="Not found"><${Empty} icon="MapTrifold" title="Page not found" action="Overview" onAction=${()=>go('/admin')}/><//>`}
 const alerts=[{ic:'Pulse',tone:'heat',t:'SoilGrids probe breaker is half-open',to:'/admin/data-health'},{ic:'Flag',tone:'sky',t:pend+' outcomes await review',to:'/admin/outcomes'},{ic:'Cpu',tone:'growth',t:'Candidate hi-xgb-20261103 passed its gate',to:'/admin/models/hi-xgb-20261103-4c9e1a7f'}];
 return html`<div class="admin-main fill"><nav class="rail expanded" style=${{width:w+'px',paddingTop:'18px'}} aria-label="Admin"><div class="rail-head" style="padding-left:6px"><${Logo}/>${w>100&&html`<span>Herra</span>`}${w>100&&html`<span class="badge sky" style="margin-left:auto">Admin</span>`}</div>${rails.map(([k,l,ic])=>html`<${Link} to=${k?'/admin/'+k:'/admin'} cls=${'rail-item'+(cur===k?' on':'')} title=${l}><${Ic} n=${ic} s=22 w=${cur===k?'bold':'regular'}/>${w>100&&html`<span>${l}</span>`}${k==='outcomes'&&pend>0&&w>100&&html`<span class="cnt">${pend}</span>`}<//>`)}<div class="grow"></div><${Link} to="/admin/settings" cls=${'rail-item'+(cur==='settings'?' on':'')}><${Ic} n="Gear" s=22/>${w>100&&html`<span>Settings</span>`}<//><button class="rail-item" onClick=${()=>setCol(!col)} style="width:100%"><${Ic} n=${col?'CaretRight':'CaretLeft'} s=22/>${w>100&&html`<span>Collapse</span>`}</button></nav>
  <div class="abs" style=${{left:w+'px',right:0,top:0,bottom:0,transition:'left .38s var(--ease-em)'}}><div class="admin-main"><div class="admin-top"><div class="grow"></div><div style="width:190px"><${Sel} v=${S.aSpace} on=${v=>{S.aSpace=v;emit()}} opts=${[{k:'all',l:'All spaces'},...S.db.spaces.map(x=>({k:x.id,l:x.name}))]}/></div>
   <${Pop} btn=${(tg)=>html`<button class="iconbtn bordered sm" aria-label="Alerts" onClick=${tg}><${Ic} n="Bell" s=18/><span class="badge-n" style="top:-4px;right:-4px">${alerts.length}</span></button>`} cls="" align="right">${alerts.map(a=>html`<button onClick=${()=>go(a.to)}><${Ic} n=${a.ic} w="fill" s=18 c=${'var(--'+a.tone+')'}/><span style="white-space:normal;text-align:left;font-weight:550">${a.t}</span></button>`)}<//><${ThemeBtn}/>
   <${Pop} btn=${tg=>html`<button onClick=${tg} aria-label="Account"><${Avatar} u=${me_} sz="sm"/></button>`}><div class="mlabel label">${me_.name}</div><button onClick=${()=>go('/admin/settings')}><${Ic} n="Gear" s=18/>Settings</button><button onClick=${()=>go('/admin/audit')}><${Ic} n="ClockCounterClockwise" s=18/>Audit log</button><hr/><button class="danger" onClick=${signOut}><${Ic} n="SignOut" s=18/>Sign out</button><//></div>
   <div class="admin-body"><div class="admin-scroll" key=${sub} ref=${el=>{if(el)el.scrollTop=0}}>${view}</div></div></div></div></div>`}
function AdminPage({title,sub,right,crumbs=[],children,tabs}){return html`<div class="page-in wide" style="animation:pgin .4s var(--ease-em) both"><div class="row between wrap g4" style="margin-bottom:24px"><div style="min-width:0">${crumbs.length>0&&html`<div class="row g2 caption" style="margin-bottom:6px">${crumbs.map(([l,to],i)=>html`${i>0&&html`<${Ic} n="CaretRight" s=11 w="bold"/>`}<${Link} to=${to} cls="muted" style="font-weight:600">${l}<//>`)}</div>`}<div class="display-md" style="font-size:32px">${title}</div>${sub&&html`<div class="muted mt1">${sub}</div>`}</div><div class="row g2 wrap">${right}</div></div>${children}</div>`}
```

Forbidden state and the app root:

```js
const BPS=[['sm',480],['md',768],['lg',1024],['xl',1280],['2xl',1600]];
function Forbidden(){return html`<div class="fill center"><${Empty} icon="LockKey" title="Admin access required" sub="Your account is a farmer account. Sign in as an admin." action="Go to farmer app" onAction=${()=>go('/farmer')}/></div>`}
function AppRoot(){const s=useS();const ref=useRef();const[bpl,setBpl]=useState('');const st=s.settings;
 useEffect(()=>{const el=ref.current;if(!el)return;const f=()=>{const w=el.clientWidth;let cl=[],mx='xs';BPS.forEach(([k,v])=>{if(w>=v){cl.push('bp-'+k);mx=k}});setBpl(cl.join(' '));if(S.bp!==mx){S.bp=mx;emit()}};f();const ro=new ResizeObserver(f);ro.observe(el);return()=>ro.disconnect()},[s.session.role]);
 const p=s.route.path,a=s.session.authed,role=s.session.role;
 useEffect(()=>{const pub=['/sign-in','/sign-up','/forgot-password'].includes(p)||p.startsWith('/join');
  if(p==='/'||p===''){go(a?(role==='admin'?'/admin':(mySpaces(meId()).length?'/farmer':'/onboarding')):'/sign-in',{replace:true});return}
  if(!a&&!pub){go('/sign-in',{replace:true});return}if(a&&pub&&!p.startsWith('/join')){go(role==='admin'?'/admin':'/farmer',{replace:true});return}
  if(a&&role==='admin'&&p.startsWith('/farmer'))go('/admin',{replace:true})},[p,a,role]);
 let view=null;if(p==='/sign-in')view=html`<${SignIn}/>`;else if(p==='/sign-up')view=html`<${SignUp}/>`;else if(p==='/forgot-password')view=html`<${Forgot}/>`;else if(p.startsWith('/join'))view=html`<${JoinPage} code=${p.split('/')[2]||''} key=${p}/>`;else if(p==='/onboarding')view=html`<${Onboarding}/>`;
 else if(p.startsWith('/farmer')&&a&&role==='farmer')view=html`<${FarmerApp} sub=${p.slice(7)||'/'}/>`;else if(p.startsWith('/admin')&&a)view=role==='admin'?html`<${AdminApp} sub=${p.slice(6)||'/'}/>`:html`<${Forbidden}/>`;
 return html`<div ref=${ref} class=${cx('app',bpl,st.density==='compact'&&'compact',st.motion==='reduced'&&'reduce-motion')}>${view}<${Overlays}/><${Toasts}/></div>`}
```

### 16.2 Product root effects

These effects were part of the mockup's stage component. The product keeps them and drops the device frame. Place them above the app root.

```tsx
function useRootEffects() {
  const s = useS();
  useEffect(() => {
    const theme = s.settings.theme === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : s.settings.theme;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty(
      "--glow", "color-mix(in oklab, var(--primary) 14%, transparent)");
  }, [s.settings.theme]);
  useEffect(() => {
    const f = () => document.body.classList.toggle("mobile-real", innerWidth < 720);
    f();
    addEventListener("resize", f);
    return () => removeEventListener("resize", f);
  }, []);
}

export default function Root() {
  useRootEffects();
  return <AppRoot />;
}
```

### 16.3 State, connectivity, and persistence

1. Settings persist in `profiles.settings` (blueprint section 5). The session is the Supabase Auth cookie. The mockup's `localStorage` key `herra.v3` and its `device` entry are not carried over.
2. There is no offline queue and no connectivity chip (F-21, Deferred). A failed assessment shows Retry (section 15.4).
3. There is no keyboard shortcut layer (F-42, Deferred).
4. The mockup's `resetDemo` and demo menu are not carried over (section 0.1).

## 17. Screens

Product screens are not reproduced in this file. Each screen is a function in the mockup source. The table gives its line in the mockup and its status in the product: copied in section 16, transcribe from its line, replaced by a real source because it is mock data or engine (section 0.1), or excluded.

Lines 1239 to 1299 hold the runtime utilities. They are not screens.

| Mockup lines | Declarations | In the product |
|---|---|---|
| 1239 | `ICONS` (icon bundle) | Replaced by `@phosphor-icons/react` (section 11) |
| 1243 to 1254 | `html`, `clamp`, `hashStr`, `mulberry`, `RNG`, `pick`, `sleep`, `uid`, `cx`, `sum` | Utilities. `html` is the htm template tag, replaced by JSX. `RNG`, `mulberry`, and `pick` serve seed data only. |
| 1255 to 1257 | `T0`, `NOW`, `TZ` | Demo clock. Use real time and the profile time zone. |
| 1258 to 1272 | `fdate` to `fCoord` | Formatters. Move to `lib/units/format.ts` (R12). The Filipino locale branch in `fdate` is dropped. |
| 1273, 1274 | `dl`, `copy` | `copy` stays (copy message, copy code). `dl` served exports (Deferred). |
| 1277 to 1287 | `DEF_SETTINGS`, `S`, `subs`, `saveT`, `emit`, `useS`, `setSet` | `DEF_SETTINGS` and the UI state are copied in section 16. The store becomes React state or context. |
| 1290 to 1297 | `parseHash`, `go`, `back`, `goVT`, `seg`, `Link` | The Next.js App Router (section 0.1) |

| Mockup line | Declaration | Status |
|---:|---|---|
| 1300 | `I18N` | not ported: Filipino strings (section 20) |
| 1305 | `t` | copied in section 16 |
| 1306 | `I18N_EN` | copied in section 16 |
| 1310 | `Ic` | copied in section 16 |
| 1311 | `CROP_SVG` | copied in section 16 |
| 1328 | `FAM_COLOR` | copied in section 16 |
| 1329 | `CropIcon` | copied in section 16 |
| 1333 | `haptic` | copied in section 16 |
| 1334 | `toast` | copied in section 16 |
| 1335 | `Toasts` | copied in section 16 |
| 1336 | `openOv` | copied in section 16 |
| 1337 | `openSheet` | copied in section 16 |
| 1338 | `closeOv` | copied in section 16 |
| 1339 | `Overlays` | copied in section 16 |
| 1344 | `confirmDlg` | copied in section 16 |
| 1347 | `reduced` | copied in section 16 |
| 1348 | `useCount` | copied in section 16 |
| 1349 | `loadedKeys` | copied in section 16 |
| 1350 | `useLoad` | copied in section 16 |
| 1351 | `useInView` | copied in section 16 |
| 1352 | `useClickOut` | copied in section 16 |
| 1355 | `BlurFade` | copied in section 16 |
| 1356 | `TextAnimate` | copied in section 16 |
| 1357 | `seenRings` | copied in section 16 |
| 1358 | `Ring` | copied in section 16 |
| 1365 | `Delta` | copied in section 16 |
| 1366 | `Meter` | copied in section 16 |
| 1369 | `SegBar` | copied in section 16 |
| 1370 | `SegRing` | copied in section 16 |
| 1372 | `Badge` | copied in section 16 |
| 1373 | `Chip` | copied in section 16 |
| 1374 | `Dot` | copied in section 16 |
| 1375 | `Tip` | unused in the mockup: do not port |
| 1376 | `Btn` | copied in section 16 |
| 1379 | `Seg` | copied in section 16 |
| 1382 | `Tabs` | copied in section 16 |
| 1384 | `Switch` | copied in section 16 |
| 1385 | `Acc` | copied in section 16 |
| 1386 | `Pop` | copied in section 16 |
| 1388 | `Skel` | copied in section 16 |
| 1389 | `Empty` | copied in section 16 |
| 1390 | `Alert` | copied in section 16 |
| 1391 | `Avatar` | copied in section 16 |
| 1392 | `AvatarStack` | copied in section 16 |
| 1393 | `SecHead` | copied in section 16 |
| 1394 | `StatRow` | copied in section 16 |
| 1395 | `Table` | copied in section 16 |
| 1396 | `Paginate` | copied in section 16 |
| 1397 | `NumField` | copied in section 16 |
| 1398 | `Field` | copied in section 16 |
| 1399 | `Sel` | copied in section 16 |
| 1402 | `MOIST` | copied in section 16 |
| 1403 | `MoistureSlider` | copied in section 16 |
| 1414 | `QR` | copied in section 16 |
| 1419 | `Logo` | copied in section 16 |
| 1422 | `reliTier` | unused in the mockup: do not port |
| 1423 | `RELI` | copied in section 16 |
| 1424 | `RelBadge` | copied in section 16 |
| 1425 | `COMP_LBL` | unused in the mockup: do not port |
| 1426 | `RelSheet` | copied in section 16 |
| 1436 | `trap` | replaced by crop catalogue helper (section 0.1) |
| 1437 | `mk` | replaced by crop catalogue helper (section 0.1) |
| 1438 | `CROPS` | replaced by `lib/spec/crops.json` and `hi_config` (the shape is the UI contract) (section 0.1) |
| 1456 | `CROP_IDS` | replaced by crop roster (section 0.1) |
| 1458 | `WEIGHTS` | replaced by `hi_config` health weights (section 0.1) |
| 1459 | `VAR_META` | replaced by `feature_spec.json` labels (section 0.1) |
| 1460 | `DRAIN_L` | replaced by feature labels (section 0.1) |
| 1461 | `TEXTURES` | replaced by feature labels (section 0.1) |
| 1462 | `textureOf` | replaced by feature labels (section 0.1) |
| 1463 | `WX` | copied in section 16 |
| 1464 | `GROUP_META` | unused in the mockup: do not port |
| 1467 | `MLAT` | copied in section 16 |
| 1468 | `blob` | replaced by seed shapes (section 0.1) |
| 1469 | `quad` | replaced by seed shapes (section 0.1) |
| 1470 | `polyAreaHa` | copied in section 16 |
| 1471 | `centroidOf` | copied in section 16 |
| 1472 | `perimM` | copied in section 16 |
| 1473 | `distKm` | copied in section 16 |
| 1474 | `GAZ` | replaced by Photon (section 0.1) |
| 1478 | `placeAt` | replaced by Photon proxy (section 0.1) |
| 1481 | `sceneCache` | mockup-only: procedural imagery (section 0.1) |
| 1482 | `SCENE_TONE` | mockup-only: procedural imagery (section 0.1) |
| 1483 | `FAM_FIELD` | mockup-only: procedural imagery (section 0.1) |
| 1484 | `sceneURI` | mockup-only: procedural imagery (section 0.1) |
| 1501 | `genLayers` | replaced by `lib/env` (section 0.1) |
| 1508 | `weekFor` | replaced by Open-Meteo forecast and `lib/hi` readiness (section 0.1) |
| 1516 | `bandEval` | replaced by `lib/hi` (section 0.1) |
| 1519 | `seasonFit` | replaced by `lib/hi` (section 0.1) |
| 1520 | `suitability` | replaced by `lib/hi` (section 0.1) |
| 1521 | `calib` | replaced by `lib/hi` (section 0.1) |
| 1522 | `conditions` | replaced by forecast mapping (blueprint section 9.1) (section 0.1) |
| 1530 | `layerQuality` | replaced by environment profile provenance (section 0.1) |
| 1535 | `LAYER_W` | unused in the mockup: do not port |
| 1537 | `CLASS_KEYS` | replaced by `lib/hi` (`CLASS_L` is copied in section 16) (section 0.1) |
| 1538 | `classProbs` | replaced by `lib/hi` (section 0.1) |
| 1539 | `expScore` | replaced by `lib/hi` (section 0.1) |
| 1540 | `argClass` | replaced by `lib/hi` (section 0.1) |
| 1541 | `relTier` | replaced by `lib/hi` (section 0.1) |
| 1542 | `analyze` | replaced by `lib/hi` `assess()` (section 0.1) |
| 1564 | `MODEL_REF` | replaced by model registry (section 0.1) |
| 1565 | `decorate` | replaced by `lib/hi` response (section 0.1) |
| 1574 | `cap` | transcribe from this line |
| 1575 | `fmtVar` | transcribe from this line |
| 1576 | `fmtBand` | transcribe from this line |
| 1579 | `advise` | replaced by `advisory_rules` and `lib/codes.ts` (section 0.1) |
| 1599 | `FARMER_NAMES` | replaced by seed data (section 0.1) |
| 1600 | `SPACE_DEFS` | replaced by seed data (section 0.1) |
| 1607 | `FARMER_FIELDS` | replaced by seed data (section 0.1) |
| 1613 | `mkSpaces` | replaced by seed data (section 0.1) |
| 1614 | `initDB` | replaced by seed data (section 0.1) |
| 1640 | `subm` | replaced by seed data (section 0.1) |
| 1656 | `RULE_SEED` | replaced by seed data (section 0.1) |
| 1657 | `MODEL_SEED` | replaced by seed data (section 0.1) |
| 1667 | `DB` | replaced by Supabase (section 0.1) |
| 1668 | `getUser` | replaced by Supabase queries (section 0.1) |
| 1669 | `meId` | replaced by Supabase Auth (section 0.1) |
| 1670 | `me` | replaced by Supabase Auth (section 0.1) |
| 1671 | `mySpaces` | replaced by Supabase queries (section 0.1) |
| 1672 | `myFields` | replaced by Supabase queries (section 0.1) |
| 1673 | `myEntries` | replaced by Supabase queries (section 0.1) |
| 1674 | `latestByField` | replaced by Supabase queries (section 0.1) |
| 1675 | `entriesOfField` | replaced by Supabase queries (section 0.1) |
| 1676 | `topOf` | replaced by denormalised `top_crop_id` (section 0.1) |
| 1677 | `membersOf` | replaced by Supabase queries (section 0.1) |
| 1678 | `codeOf` | replaced by `access_codes` (section 0.1) |
| 1679 | `bandColor` | copied in section 16 |
| 1680 | `bandIcon` | copied in section 16 |
| 1681 | `bandTone` | copied in section 16 |
| 1682 | `entrySummary` | transcribe from this line |
| 1684 | `audit` | replaced by `audit_log` (server) (section 0.1) |
| 1685 | `pushNotif` | replaced by `notifications` (server) (section 0.1) |
| 1686 | `resetDemo` | excluded: demo chrome |
| 1690 | `h2` | mockup-only: procedural imagery (section 0.1) |
| 1691 | `vn` | mockup-only: procedural imagery (section 0.1) |
| 1692 | `fbm` | mockup-only: procedural imagery (section 0.1) |
| 1693 | `COS` | mockup-only: procedural imagery (section 0.1) |
| 1694 | `procColor` | mockup-only: procedural imagery (section 0.1) |
| 1707 | `grain` | mockup-only: procedural imagery (section 0.1) |
| 1708 | `paintProc` | mockup-only: procedural imagery (section 0.1) |
| 1710 | `mercLat` | mockup-only: procedural imagery (section 0.1) |
| 1711 | `ProcLayer` | mockup-only: procedural imagery (section 0.1) |
| 1712 | `makeProc` | mockup-only: procedural imagery (section 0.1) |
| 1715 | `polyThumb` | copied in section 16 |
| 1716 | `snapCache` | mockup-only: procedural imagery (section 0.1) |
| 1717 | `snapshot` | mockup-only: procedural imagery (section 0.1) |
| 1724 | `snapStyle` | mockup-only: procedural imagery (section 0.1) |
| 1727 | `pip` | copied in section 16 |
| 1728 | `segInt` | copied in section 16 |
| 1729 | `selfX` | copied in section 16 |
| 1730 | `validatePoly` | copied in section 16 |
| 1739 | `TILES` | copied in section 16 |
| 1740 | `PNG0` | copied in section 16 |
| 1741 | `mapColors` | copied in section 16 |
| 1742 | `pinHTML` | copied in section 16 |
| 1744 | `MapView` | copied in section 16 |
| 1797 | `VIEW` | copied in section 16 |
| 1798 | `fp` | copied in section 16 |
| 1799 | `entryImg` | copied in section 16 |
| 1800 | `curSpace` | copied in section 16 |
| 1801 | `spaceFields` | copied in section 16 |
| 1802 | `roGuard` | copied in section 16 |
| 1803 | `wxIcon` | copied in section 16 |
| 1804 | `bpWide` | copied in section 16 |
| 1806 | `Page` | copied in section 16 |
| 1814 | `SpaceChip` | copied in section 16 |
| 1816 | `SpaceSwitch` | copied in section 16 |
| 1820 | `FarmerApp` | copied in section 16 |
| 1834 | `MoreSheet` | copied in section 16 |
| 1838 | `greet` | transcribe from this line |
| 1839 | `latestForDash` | transcribe from this line |
| 1840 | `Dashboard` | transcribe from this line |
| 1861 | `EntryCard` | transcribe from this line |
| 1874 | `Entries` | transcribe from this line |
| 1886 | `EntryFilters` | transcribe from this line |
| 1890 | `ScrollProg` | transcribe from this line |
| 1891 | `EntryDetail` | transcribe from this line |
| 1906 | `DetailSkel` | transcribe from this line |
| 1907 | `MiniWeek` | transcribe from this line |
| 1908 | `FLAG_LBL` | copied in section 16 |
| 1909 | `SUP_LBL` | copied in section 16 |
| 1910 | `PROV_LBL` | copied in section 16 |
| 1911 | `PROV_TONE` | copied in section 16 |
| 1912 | `TrustPanel` | transcribe from this line |
| 1916 | `ResultBody` | transcribe from this line |
| 1930 | `ReasonList` | transcribe from this line |
| 1934 | `createEntry` | replaced by the assessment server action (blueprint section 9.2) (section 0.1) |
| 1937 | `driveEntry` | replaced by the assessment server action (section 0.1) |
| 1943 | `CropPicker` | transcribe from this line |
| 1944 | `Analyze` | transcribe from this line |
| 1973 | `LAYERS` | copied in section 16 |
| 1974 | `Processing` | transcribe from this line |
| 1991 | `FieldCard` | transcribe from this line |
| 1994 | `Fields` | transcribe from this line |
| 1997 | `FieldDetail` | transcribe from this line |
| 2008 | `fmnum` | transcribe from this line |
| 2011 | `LayerPreview` | transcribe from this line |
| 2016 | `FieldCapture` | transcribe from this line |
| 2038 | `SpacesList` | transcribe from this line |
| 2041 | `SpaceView` | transcribe from this line |
| 2049 | `FAnalytics` | transcribe from this line |
| 2052 | `AnalyticsBody` | transcribe from this line |
| 2062 | `dl_csv` | unused in the mockup: do not port |
| 2065 | `Tools` | transcribe from this line |
| 2068 | `ToolPage` | transcribe from this line |
| 2069 | `EntryPick` | transcribe from this line |
| 2070 | `Compare` | transcribe from this line |
| 2076 | `Planting` | transcribe from this line |
| 2083 | `Outcomes` | transcribe from this line |
| 2089 | `NK` | copied in section 16 |
| 2090 | `Notifs` | transcribe from this line |
| 2095 | `signOut` | replaced by Supabase Auth (section 0.1) |
| 2096 | `signIn` | replaced by Supabase Auth (section 0.1) |
| 2097 | `validEmail` | transcribe from this line |
| 2100 | `CROCK` | transcribe from this line |
| 2101 | `normCode` | transcribe from this line |
| 2102 | `joinAttempts` | replaced by `rate_limits` (section 0.1) |
| 2103 | `joinSpace` | replaced by `join_space` function (section 0.1) |
| 2108 | `CodeInput` | transcribe from this line |
| 2118 | `WelcomeSheet` | transcribe from this line |
| 2119 | `JoinSheet` | transcribe from this line |
| 2122 | `AuthShell` | copied in section 16 |
| 2123 | `SignIn` | transcribe from this line |
| 2127 | `SignUp` | transcribe from this line |
| 2130 | `Forgot` | transcribe from this line |
| 2132 | `JoinPage` | transcribe from this line |
| 2135 | `Onboarding` | transcribe from this line |
| 2145 | `SetRow` | transcribe from this line |
| 2146 | `SettingsBody` | transcribe from this line |
| 2158 | `SettingsPage` | transcribe from this line |
| 2166 | `ALPH` | replaced by server-side code generation (section 0.1) |
| 2167 | `genCode` | replaced by server-side code generation (section 0.1) |
| 2168 | `rails` | copied in section 16 |
| 2170 | `toggleTheme` | copied in section 16 |
| 2173 | `ThemeBtn` | copied in section 16 |
| 2174 | `AdminApp` | copied in section 16 |
| 2188 | `AdminPage` | copied in section 16 |
| 2189 | `spaceEntries` | transcribe from this line |
| 2190 | `spaceStats` | transcribe from this line |
| 2193 | `AdminOverview` | transcribe from this line |
| 2204 | `feedN` | replaced by recent activity refreshed on load (section 0.1) |
| 2207 | `SpacesAdmin` | transcribe from this line |
| 2211 | `SpaceCreate` | transcribe from this line |
| 2220 | `CodeLimits` | transcribe from this line |
| 2223 | `SpaceHub` | transcribe from this line |
| 2225 | `HubOverview` | transcribe from this line |
| 2227 | `HubMembers` | transcribe from this line |
| 2230 | `HubCodes` | transcribe from this line |
| 2236 | `HubFields` | transcribe from this line |
| 2237 | `HubEntries` | transcribe from this line |
| 2238 | `HubAnnounce` | transcribe from this line |
| 2241 | `HubSettings` | transcribe from this line |
| 2245 | `EntryPeek` | transcribe from this line |
| 2251 | `FieldPeek` | transcribe from this line |
| 2253 | `AdminEntryDetail` | transcribe from this line |
| 2254 | `AdminEntries` | transcribe from this line |
| 2258 | `AdminAnalytics` | transcribe from this line |
| 2263 | `STAT_TONE` | copied in section 16 |
| 2264 | `MET_ROWS` | transcribe from this line |
| 2265 | `cmGen` | replaced by stored model report (section 0.1) |
| 2266 | `cmMetrics` | replaced by stored model report (section 0.1) |
| 2267 | `metricVal` | replaced by stored model report (section 0.1) |
| 2268 | `fmtMv` | transcribe from this line |
| 2269 | `gateOf` | replaced by the gate (blueprint section 14) (section 0.1) |
| 2275 | `promoteModel` | replaced by `hi_promote_model` (section 0.1) |
| 2276 | `rollbackModel` | replaced by `hi_rollback` (section 0.1) |
| 2277 | `confTable` | transcribe from this line |
| 2278 | `ModelLab` | transcribe from this line |
| 2279 | `PromoteSheet` | transcribe from this line |
| 2281 | `ModelDetail` | transcribe from this line |
| 2302 | `DatasetSheet` | transcribe from this line |
| 2310 | `Datasets` | transcribe from this line |
| 2313 | `CropCatalog` | transcribe from this line |
| 2315 | `CropEditor` | transcribe from this line |
| 2329 | `Advisory` | transcribe from this line |
| 2335 | `DataHealth` | transcribe from this line |
| 2349 | `OutcomeQueue` | transcribe from this line |
| 2355 | `UsersAdmin` | transcribe from this line |
| 2360 | `AuditLog` | transcribe from this line |
| 2371 | `BPS` | copied in section 16 |
| 2372 | `isMobileReal` | excluded: demo chrome |
| 2373 | `demo` | excluded: demo chrome |
| 2374 | `Forbidden` | copied in section 16 |
| 2375 | `AppRoot` | copied in section 16 |
| 2386 | `DEV` | excluded: demo chrome |
| 2387 | `Clock` | excluded: demo chrome |
| 2388 | `StatusBar` | excluded: demo chrome |
| 2389 | `StageBar` | excluded: demo chrome |
| 2397 | `effDevice` | excluded: demo chrome |
| 2398 | `Stage` | excluded: demo chrome |
| 2407 | `StageFab` | excluded: demo chrome |

## 18. Transcription rules

Convert the mockup's htm templates to JSX without changing what they render.

| Mockup (htm) | React (JSX) |
|---|---|
| `class="x"` | `className="x"` |
| `class=${cx(...)}` | `className={cx(...)}` |
| `onClick=${fn}` | `onClick={fn}` |
| `style=${{a:1}}` | `style={{ a: 1 }}` |
| `style="margin-top:8px"` | `style={{ marginTop: "8px" }}`. Keep units as strings. |
| `<${Comp} prop=${v}/>` | `<Comp prop={v} />` |
| `${children}` | `{children}` |
| `${cond&&html\`...\`}` | `{cond && (...)}` |
| `key=${x.id}` | `key={x.id}` |

Rules:

1. Keep element order, nesting, and every class name.
2. Keep every inline style value as written. Do not move it into a class.
3. Keep every string, including punctuation and the `·` and `—` characters, but read it through an i18n key (R6).
4. Keep the `data-tip`, `aria-label`, and `role` attributes.
5. Replace only the plumbing: `useS()` becomes React state or context, `emit()` becomes the state update, `go()` becomes the router, and mock data accessors become server data.
6. Keep the delays in section 9.5.
7. Do not add UI for Deferred features (R9).

## 19. Verification

Proportionate to the blueprint (section 18): no visual-regression baselines, Lighthouse CI, or automated accessibility suites are built. Check by hand.

A screen is done when it matches the mockup in both themes at phone and desktop widths, for the states listed below. Run the mockup and the build side by side with the same data. Wait for fonts before comparing.

Sizes. Compare the app root, `.app`, at these sizes:

| Presentation | `.app` size | Mockup route to the size |
|---|---|---|
| Phone | 390 × 844 | Viewport 390 × 844 (the mockup renders full bleed) |
| Desktop | 1402 × 772 | Viewport 1402 × 772 |

States to check for each screen: default, empty, loading (skeleton), error, pressed, keyboard-focused, selected, disabled, light theme, dark theme, and each breakpoint the screen supports. For results, force each of the four statuses (`ok`, `degraded`, `abstained`, `failed`) with a stub response. Also check the keyboard vertex list on the draw screen (section 7.7). Confirm the three fonts load with `document.fonts.check('16px Urbanist')`, `'16px Figtree'`, and `'16px "JetBrains Mono"'`.

Optional capture helper, with Playwright for Python:

```python
from playwright.sync_api import sync_playwright

def capture(url, out, w, h, theme):
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": w, "height": h}, reduced_motion="reduce")
        pg.add_init_script(
            'localStorage.setItem("herra.v3", JSON.stringify({"settings": {"theme": "%s"}}))' % theme)
        pg.goto(url)
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(1200)
        pg.locator(".app").first.screenshot(path=out)
        b.close()
```

The storage key applies to the mockup only. The product stores settings in `profiles.settings`.

Principle checks. For each screen, confirm the principles in section 2: no cards outside the object and overlay rule, no shadows at rest, no line or area charts, two to four major surfaces, and taps over typing for farmer inputs. Confirm that no Deferred feature (section 0.2) has crept in.

## 20. Edit log and removed mockup chrome

Every change to the mockup source is listed here. The line numbers are the mockup's.

| Mockup line | Kind | Change |
|---|---|---|
| 689, 699 | CSS | removed `--stage:#E4E1D6;` and `--stage:#050605;` |
| 710 | CSS | `background:var(--stage)` → `background:var(--background)` |
| 720–721, 763–783, 785–794, 805, 1170, 1178, 1180, 1194, 1198 | CSS | removed rules (see the paragraph below) |
| 783, 784 | CSS | the `.haptic .screen` rule is removed, and the `hap` keyframes are not shipped (R7) |
| 1277–1279 | JS | removed `density`, `accent`, `lang`, `notif.entry`, `notif.outcome`, `notif.push`, `quiet`, `quietFrom`, `quietTo`, `offlineDrafts`, `photoQ`, `srcPref` |
| 1280–1281 | JS | removed `device`, `online`, `ui.drafts`, `ui.syncing` |
| 1282 | JS | the `localStorage` load line is not carried over (section 16.3) |
| 1300–1304 | JS | `I18N.fil` removed (English only) |
| 1305 | JS | the `lang` branch removed |
| 1333 | JS | `querySelector('.phone')` and the `haptic` class toggle removed; vibration kept |
| 1339–1343 | JS | the `cmd` overlay branch removed |
| 1375, 1422, 1425, 1464, 1535, 2062 | JS | unused declarations, not copied |
| 1690–1724 | JS | procedural imagery removed, except `polyThumb` (line 1715) |
| 1744+ | JS | `MapView`: the `makeProc` layer lines removed, and the attribution is the provider credit only |
| 1799 | JS | `entryImg` reads `e.photo.url` (a signed URL); the scene fallback is removed |
| 2374 | JS | the copy no longer mentions the mockup bar |
| 2375–2384 | JS | `[s.device,s.session.role]` → `[s.session.role]`; the offline and syncing chips removed |
| 2372–2412 | JS | stage components and `render` not copied |

Removed CSS lines 720–721, 763–783, 785–794, 805, 1170, 1178, 1180, 1194, 1198. These are the stage, device-frame, status-bar, browser, and stage-button rules (763–783, 785–794, and 1198); the phone-only top-bar, tablet, and screen-wrapper rules (805, 1178, 1180); the demo-only `.demo-row` (1194) and the stage label rule (1170); and the mockup's reduced-motion collapse (720–721), which section 9.4 replaces. Line 784 holds the `hap` keyframes, which are not shipped. Excluded JavaScript: `isMobileReal`, `demo`, and the stage components (`DEV`, `Clock`, `StatusBar`, `StageBar`, `effDevice`, `Stage`, `StageFab`, and the `render` call at the end). Their theme and mobile-real effects are rebuilt in section 16.2.

## 21. Open decisions

1. Whether to keep the principles' ÷4 reduced-motion rule (section 9.4) or the mockup's 0.01ms collapse. The build follows the principles. Confirm before release.
2. Whether the contrast corrections (section 6.5) should go into the mockup itself, so the mockup and the product stay identical.
3. Whether the Magic UI ring and number ticker should replace the mockup's versions once verified to match (section 3).
4. The blueprint asks for a `reference` badge beside the disclaimer (blueprint section 11.3). The mockup draws only the `Alert`. Default if not decided: a `.badge.outline` labeled "Reference" in the result header's tag row.
5. The blueprint requires "© OpenStreetMap contributors" wherever place names appear (blueprint section 8). The mockup does not draw it. Default: one `caption` line under the place chip and in the field detail header.
6. The blueprint requires the keyboard vertex list (section 7.7). The mockup does not draw it. The spec in section 7.7 uses existing tokens only. Confirm the layout.
7. The entry detail map toggle shows a procedural preview in the mockup. The product has no procedural imagery. Default: a read-only `MapView` at the detail size.
8. The early principles' success pulse on an outcome is dropped, because outcomes are feedback (blueprint section 12). Confirm.
9. The mockup's admin alert bell and overview numbers are examples. Confirm which real signals feed the bell (data health, outcomes awaiting review, a candidate that passed its gate).

## Appendix A. Map third-party CSS (verbatim)

This is the mockup's inlined Leaflet 1.9.4 and Geoman CSS, copied exactly. Load it before the herra stylesheet, and do not load the package CSS files in its place.

```css
/* required styles */

.leaflet-pane,
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow,
.leaflet-tile-container,
.leaflet-pane > svg,
.leaflet-pane > canvas,
.leaflet-zoom-box,
.leaflet-image-layer,
.leaflet-layer {
	position: absolute;
	left: 0;
	top: 0;
	}
.leaflet-container {
	overflow: hidden;
	}
.leaflet-tile,
.leaflet-marker-icon,
.leaflet-marker-shadow {
	-webkit-user-select: none;
	   -moz-user-select: none;
	        user-select: none;
	  -webkit-user-drag: none;
	}
/* Prevents IE11 from highlighting tiles in blue */
.leaflet-tile::selection {
	background: transparent;
}
/* Safari renders non-retina tile on retina better with this, but Chrome is worse */
.leaflet-safari .leaflet-tile {
	image-rendering: -webkit-optimize-contrast;
	}
/* hack that prevents hw layers "stretching" when loading new tiles */
.leaflet-safari .leaflet-tile-container {
	width: 1600px;
	height: 1600px;
	-webkit-transform-origin: 0 0;
	}
.leaflet-marker-icon,
.leaflet-marker-shadow {
	display: block;
	}
/* .leaflet-container svg: reset svg max-width decleration shipped in Joomla! (joomla.org) 3.x */
/* .leaflet-container img: map is broken in FF if you have max-width: 100% on tiles */
.leaflet-container .leaflet-overlay-pane svg {
	max-width: none !important;
	max-height: none !important;
	}
.leaflet-container .leaflet-marker-pane img,
.leaflet-container .leaflet-shadow-pane img,
.leaflet-container .leaflet-tile-pane img,
.leaflet-container img.leaflet-image-layer,
.leaflet-container .leaflet-tile {
	max-width: none !important;
	max-height: none !important;
	width: auto;
	padding: 0;
	}

.leaflet-container img.leaflet-tile {
	/* See: https://bugs.chromium.org/p/chromium/issues/detail?id=600120 */
	mix-blend-mode: plus-lighter;
}

.leaflet-container.leaflet-touch-zoom {
	-ms-touch-action: pan-x pan-y;
	touch-action: pan-x pan-y;
	}
.leaflet-container.leaflet-touch-drag {
	-ms-touch-action: pinch-zoom;
	/* Fallback for FF which doesn't support pinch-zoom */
	touch-action: none;
	touch-action: pinch-zoom;
}
.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom {
	-ms-touch-action: none;
	touch-action: none;
}
.leaflet-container {
	-webkit-tap-highlight-color: transparent;
}
.leaflet-container a {
	-webkit-tap-highlight-color: rgba(51, 181, 229, 0.4);
}
.leaflet-tile {
	filter: inherit;
	visibility: hidden;
	}
.leaflet-tile-loaded {
	visibility: inherit;
	}
.leaflet-zoom-box {
	width: 0;
	height: 0;
	-moz-box-sizing: border-box;
	     box-sizing: border-box;
	z-index: 800;
	}
/* workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=888319 */
.leaflet-overlay-pane svg {
	-moz-user-select: none;
	}

.leaflet-pane         { z-index: 400; }

.leaflet-tile-pane    { z-index: 200; }
.leaflet-overlay-pane { z-index: 400; }
.leaflet-shadow-pane  { z-index: 500; }
.leaflet-marker-pane  { z-index: 600; }
.leaflet-tooltip-pane   { z-index: 650; }
.leaflet-popup-pane   { z-index: 700; }

.leaflet-map-pane canvas { z-index: 100; }
.leaflet-map-pane svg    { z-index: 200; }

.leaflet-vml-shape {
	width: 1px;
	height: 1px;
	}
.lvml {
	behavior: none;
	display: inline-block;
	position: absolute;
	}


/* control positioning */

.leaflet-control {
	position: relative;
	z-index: 800;
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */
	pointer-events: auto;
	}
.leaflet-top,
.leaflet-bottom {
	position: absolute;
	z-index: 1000;
	pointer-events: none;
	}
.leaflet-top {
	top: 0;
	}
.leaflet-right {
	right: 0;
	}
.leaflet-bottom {
	bottom: 0;
	}
.leaflet-left {
	left: 0;
	}
.leaflet-control {
	float: left;
	clear: both;
	}
.leaflet-right .leaflet-control {
	float: right;
	}
.leaflet-top .leaflet-control {
	margin-top: 10px;
	}
.leaflet-bottom .leaflet-control {
	margin-bottom: 10px;
	}
.leaflet-left .leaflet-control {
	margin-left: 10px;
	}
.leaflet-right .leaflet-control {
	margin-right: 10px;
	}


/* zoom and fade animations */

.leaflet-fade-anim .leaflet-popup {
	opacity: 0;
	-webkit-transition: opacity 0.2s linear;
	   -moz-transition: opacity 0.2s linear;
	        transition: opacity 0.2s linear;
	}
.leaflet-fade-anim .leaflet-map-pane .leaflet-popup {
	opacity: 1;
	}
.leaflet-zoom-animated {
	-webkit-transform-origin: 0 0;
	    -ms-transform-origin: 0 0;
	        transform-origin: 0 0;
	}
svg.leaflet-zoom-animated {
	will-change: transform;
}

.leaflet-zoom-anim .leaflet-zoom-animated {
	-webkit-transition: -webkit-transform 0.25s cubic-bezier(0,0,0.25,1);
	   -moz-transition:    -moz-transform 0.25s cubic-bezier(0,0,0.25,1);
	        transition:         transform 0.25s cubic-bezier(0,0,0.25,1);
	}
.leaflet-zoom-anim .leaflet-tile,
.leaflet-pan-anim .leaflet-tile {
	-webkit-transition: none;
	   -moz-transition: none;
	        transition: none;
	}

.leaflet-zoom-anim .leaflet-zoom-hide {
	visibility: hidden;
	}


/* cursors */

.leaflet-interactive {
	cursor: pointer;
	}
.leaflet-grab {
	cursor: -webkit-grab;
	cursor:    -moz-grab;
	cursor:         grab;
	}
.leaflet-crosshair,
.leaflet-crosshair .leaflet-interactive {
	cursor: crosshair;
	}
.leaflet-popup-pane,
.leaflet-control {
	cursor: auto;
	}
.leaflet-dragging .leaflet-grab,
.leaflet-dragging .leaflet-grab .leaflet-interactive,
.leaflet-dragging .leaflet-marker-draggable {
	cursor: move;
	cursor: -webkit-grabbing;
	cursor:    -moz-grabbing;
	cursor:         grabbing;
	}

/* marker & overlays interactivity */
.leaflet-marker-icon,
.leaflet-marker-shadow,
.leaflet-image-layer,
.leaflet-pane > svg path,
.leaflet-tile-container {
	pointer-events: none;
	}

.leaflet-marker-icon.leaflet-interactive,
.leaflet-image-layer.leaflet-interactive,
.leaflet-pane > svg path.leaflet-interactive,
svg.leaflet-image-layer.leaflet-interactive path {
	pointer-events: visiblePainted; /* IE 9-10 doesn't have auto */
	pointer-events: auto;
	}

/* visual tweaks */

.leaflet-container {
	background: #ddd;
	outline-offset: 1px;
	}
.leaflet-container a {
	color: #0078A8;
	}
.leaflet-zoom-box {
	border: 2px dotted #38f;
	background: rgba(255,255,255,0.5);
	}


/* general typography */
.leaflet-container {
	font-family: "Helvetica Neue", Arial, Helvetica, sans-serif;
	font-size: 12px;
	font-size: 0.75rem;
	line-height: 1.5;
	}


/* general toolbar styles */

.leaflet-bar {
	box-shadow: 0 1px 5px rgba(0,0,0,0.65);
	border-radius: 4px;
	}
.leaflet-bar a {
	background-color: #fff;
	border-bottom: 1px solid #ccc;
	width: 26px;
	height: 26px;
	line-height: 26px;
	display: block;
	text-align: center;
	text-decoration: none;
	color: black;
	}
.leaflet-bar a,
.leaflet-control-layers-toggle {
	background-position: 50% 50%;
	background-repeat: no-repeat;
	display: block;
	}
.leaflet-bar a:hover,
.leaflet-bar a:focus {
	background-color: #f4f4f4;
	}
.leaflet-bar a:first-child {
	border-top-left-radius: 4px;
	border-top-right-radius: 4px;
	}
.leaflet-bar a:last-child {
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;
	border-bottom: none;
	}
.leaflet-bar a.leaflet-disabled {
	cursor: default;
	background-color: #f4f4f4;
	color: #bbb;
	}

.leaflet-touch .leaflet-bar a {
	width: 30px;
	height: 30px;
	line-height: 30px;
	}
.leaflet-touch .leaflet-bar a:first-child {
	border-top-left-radius: 2px;
	border-top-right-radius: 2px;
	}
.leaflet-touch .leaflet-bar a:last-child {
	border-bottom-left-radius: 2px;
	border-bottom-right-radius: 2px;
	}

/* zoom control */

.leaflet-control-zoom-in,
.leaflet-control-zoom-out {
	font: bold 18px 'Lucida Console', Monaco, monospace;
	text-indent: 1px;
	}

.leaflet-touch .leaflet-control-zoom-in, .leaflet-touch .leaflet-control-zoom-out  {
	font-size: 22px;
	}


/* layers control */

.leaflet-control-layers {
	box-shadow: 0 1px 5px rgba(0,0,0,0.4);
	background: #fff;
	border-radius: 5px;
	}
.leaflet-control-layers-toggle {
	background-image: none;
	width: 36px;
	height: 36px;
	}
.leaflet-retina .leaflet-control-layers-toggle {
	background-image: none;
	background-size: 26px 26px;
	}
.leaflet-touch .leaflet-control-layers-toggle {
	width: 44px;
	height: 44px;
	}
.leaflet-control-layers .leaflet-control-layers-list,
.leaflet-control-layers-expanded .leaflet-control-layers-toggle {
	display: none;
	}
.leaflet-control-layers-expanded .leaflet-control-layers-list {
	display: block;
	position: relative;
	}
.leaflet-control-layers-expanded {
	padding: 6px 10px 6px 6px;
	color: #333;
	background: #fff;
	}
.leaflet-control-layers-scrollbar {
	overflow-y: scroll;
	overflow-x: hidden;
	padding-right: 5px;
	}
.leaflet-control-layers-selector {
	margin-top: 2px;
	position: relative;
	top: 1px;
	}
.leaflet-control-layers label {
	display: block;
	font-size: 13px;
	font-size: 1.08333em;
	}
.leaflet-control-layers-separator {
	height: 0;
	border-top: 1px solid #ddd;
	margin: 5px -10px 5px -6px;
	}

/* Default icon URLs */
.leaflet-default-icon-path { /* used only in path-guessing heuristic, see L.Icon.Default */
	background-image: none;
	}


/* attribution and scale controls */

.leaflet-container .leaflet-control-attribution {
	background: #fff;
	background: rgba(255, 255, 255, 0.8);
	margin: 0;
	}
.leaflet-control-attribution,
.leaflet-control-scale-line {
	padding: 0 5px;
	color: #333;
	line-height: 1.4;
	}
.leaflet-control-attribution a {
	text-decoration: none;
	}
.leaflet-control-attribution a:hover,
.leaflet-control-attribution a:focus {
	text-decoration: underline;
	}
.leaflet-attribution-flag {
	display: inline !important;
	vertical-align: baseline !important;
	width: 1em;
	height: 0.6669em;
	}
.leaflet-left .leaflet-control-scale {
	margin-left: 5px;
	}
.leaflet-bottom .leaflet-control-scale {
	margin-bottom: 5px;
	}
.leaflet-control-scale-line {
	border: 2px solid #777;
	border-top: none;
	line-height: 1.1;
	padding: 2px 5px 1px;
	white-space: nowrap;
	-moz-box-sizing: border-box;
	     box-sizing: border-box;
	background: rgba(255, 255, 255, 0.8);
	text-shadow: 1px 1px #fff;
	}
.leaflet-control-scale-line:not(:first-child) {
	border-top: 2px solid #777;
	border-bottom: none;
	margin-top: -2px;
	}
.leaflet-control-scale-line:not(:first-child):not(:last-child) {
	border-bottom: 2px solid #777;
	}

.leaflet-touch .leaflet-control-attribution,
.leaflet-touch .leaflet-control-layers,
.leaflet-touch .leaflet-bar {
	box-shadow: none;
	}
.leaflet-touch .leaflet-control-layers,
.leaflet-touch .leaflet-bar {
	border: 2px solid rgba(0,0,0,0.2);
	background-clip: padding-box;
	}


/* popup */

.leaflet-popup {
	position: absolute;
	text-align: center;
	margin-bottom: 20px;
	}
.leaflet-popup-content-wrapper {
	padding: 1px;
	text-align: left;
	border-radius: 12px;
	}
.leaflet-popup-content {
	margin: 13px 24px 13px 20px;
	line-height: 1.3;
	font-size: 13px;
	font-size: 1.08333em;
	min-height: 1px;
	}
.leaflet-popup-content p {
	margin: 17px 0;
	margin: 1.3em 0;
	}
.leaflet-popup-tip-container {
	width: 40px;
	height: 20px;
	position: absolute;
	left: 50%;
	margin-top: -1px;
	margin-left: -20px;
	overflow: hidden;
	pointer-events: none;
	}
.leaflet-popup-tip {
	width: 17px;
	height: 17px;
	padding: 1px;

	margin: -10px auto 0;
	pointer-events: auto;

	-webkit-transform: rotate(45deg);
	   -moz-transform: rotate(45deg);
	    -ms-transform: rotate(45deg);
	        transform: rotate(45deg);
	}
.leaflet-popup-content-wrapper,
.leaflet-popup-tip {
	background: white;
	color: #333;
	box-shadow: 0 3px 14px rgba(0,0,0,0.4);
	}
.leaflet-container a.leaflet-popup-close-button {
	position: absolute;
	top: 0;
	right: 0;
	border: none;
	text-align: center;
	width: 24px;
	height: 24px;
	font: 16px/24px Tahoma, Verdana, sans-serif;
	color: #757575;
	text-decoration: none;
	background: transparent;
	}
.leaflet-container a.leaflet-popup-close-button:hover,
.leaflet-container a.leaflet-popup-close-button:focus {
	color: #585858;
	}
.leaflet-popup-scrolled {
	overflow: auto;
	}

.leaflet-oldie .leaflet-popup-content-wrapper {
	-ms-zoom: 1;
	}
.leaflet-oldie .leaflet-popup-tip {
	width: 24px;
	margin: 0 auto;

	-ms-filter: "progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678)";
	filter: progid:DXImageTransform.Microsoft.Matrix(M11=0.70710678, M12=0.70710678, M21=-0.70710678, M22=0.70710678);
	}

.leaflet-oldie .leaflet-control-zoom,
.leaflet-oldie .leaflet-control-layers,
.leaflet-oldie .leaflet-popup-content-wrapper,
.leaflet-oldie .leaflet-popup-tip {
	border: 1px solid #999;
	}


/* div icon */

.leaflet-div-icon {
	background: #fff;
	border: 1px solid #666;
	}


/* Tooltip */
/* Base styles for the element that has a tooltip */
.leaflet-tooltip {
	position: absolute;
	padding: 6px;
	background-color: #fff;
	border: 1px solid #fff;
	border-radius: 3px;
	color: #222;
	white-space: nowrap;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
	pointer-events: none;
	box-shadow: 0 1px 3px rgba(0,0,0,0.4);
	}
.leaflet-tooltip.leaflet-interactive {
	cursor: pointer;
	pointer-events: auto;
	}
.leaflet-tooltip-top:before,
.leaflet-tooltip-bottom:before,
.leaflet-tooltip-left:before,
.leaflet-tooltip-right:before {
	position: absolute;
	pointer-events: none;
	border: 6px solid transparent;
	background: transparent;
	content: "";
	}

/* Directions */

.leaflet-tooltip-bottom {
	margin-top: 6px;
}
.leaflet-tooltip-top {
	margin-top: -6px;
}
.leaflet-tooltip-bottom:before,
.leaflet-tooltip-top:before {
	left: 50%;
	margin-left: -6px;
	}
.leaflet-tooltip-top:before {
	bottom: 0;
	margin-bottom: -12px;
	border-top-color: #fff;
	}
.leaflet-tooltip-bottom:before {
	top: 0;
	margin-top: -12px;
	margin-left: -6px;
	border-bottom-color: #fff;
	}
.leaflet-tooltip-left {
	margin-left: -6px;
}
.leaflet-tooltip-right {
	margin-left: 6px;
}
.leaflet-tooltip-left:before,
.leaflet-tooltip-right:before {
	top: 50%;
	margin-top: -6px;
	}
.leaflet-tooltip-left:before {
	right: 0;
	margin-right: -12px;
	border-left-color: #fff;
	}
.leaflet-tooltip-right:before {
	left: 0;
	margin-left: -12px;
	border-right-color: #fff;
	}

/* Printing */

@media print {
	/* Prevent printers from removing background-images of controls. */
	.leaflet-control {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		}
	}

.marker-icon{background-color:#fff;border:1px solid #3388ff;border-radius:50%;margin:-8px 0 0 -8px!important;width:14px!important;height:14px!important;outline:0;transition:opacity ease .3s}.marker-icon-middle{opacity:.7;margin:-6px 0 0 -6px!important;width:10px!important;height:10px!important}.leaflet-pm-draggable{cursor:move!important}.cursor-marker{cursor:crosshair;pointer-events:none;opacity:0}.cursor-marker.visible{opacity:1!important}.geoman-draw-cursor{cursor:crosshair}.rect-style-marker,.rect-start-marker{opacity:0}.rect-style-marker.visible,.rect-start-marker.visible{opacity:1!important}.vertexmarker-disabled{opacity:.7}.pm-text-marker{width:0;height:0}.pm-textarea{background-color:#fff;color:#000;resize:none;border:none;outline:0;cursor:pointer;border-radius:3px;padding-left:7px;padding-bottom:0;padding-top:4px}.leaflet-pm-draggable .pm-textarea{cursor:move}.pm-textarea:focus,.pm-textarea:focus-within,.pm-textarea:focus-visible,.pm-textarea:active{border:2px solid #000;outline:0}.pm-textarea.pm-disabled{border:none;user-select:none}.pm-textarea.pm-hasfocus{cursor:auto}.leaflet-pm-toolbar .leaflet-buttons-control-button{padding:5px;box-sizing:border-box;position:relative;z-index:3}.leaflet-pm-toolbar .leaflet-pm-actions-container a.leaflet-pm-action:first-child:not(.pos-right),.leaflet-pm-toolbar .leaflet-pm-actions-container a.leaflet-pm-action:last-child.pos-right{border-radius:0}.leaflet-pm-toolbar .button-container a.leaflet-buttons-control-button{border-radius:0}.leaflet-pm-toolbar .button-container:last-child a.leaflet-buttons-control-button{border-radius:0 0 2px 2px}.leaflet-pm-toolbar .button-container:first-child a.leaflet-buttons-control-button{border-radius:2px 2px 0 0}.leaflet-pm-toolbar .button-container:last-child a.leaflet-buttons-control-button{border-bottom:none}.leaflet-pm-toolbar .control-fa-icon{font-size:19px;line-height:24px}.leaflet-pm-toolbar .control-icon{width:100%;height:100%;box-sizing:border-box;background-size:contain;background-repeat:no-repeat;background-position:center center}.leaflet-pm-toolbar .leaflet-pm-icon-marker{background-image:none - http://www.bohemiancoding.com/sketch -->%0A    <title>Atoms/Icons/Tools/Marker</title>%0A    <desc>Created with Sketch.</desc>%0A    <defs>%0A        <path d="M15.5,24.8782959 C15.2909201,24.8772219 15.1744857,24.8467817 14.6590866,24.2354163 C10.2196955,19.4118054 8,15.5014392 8,12.5043177 C8,8.35979746 11.3578644,5 15.5,5 C19.6421356,5 23,8.35979746 23,12.5043177 C23,17 18.2878217,21.9268378 16.3336601,24.2440186 C15.8224622,24.8501802 15.7090799,24.8793699 15.5,24.8782959 Z M15.5,15.5326948 C17.275201,15.5326948 18.7142857,14.1180004 18.7142857,12.3728864 C18.7142857,10.6277723 17.275201,9.21307792 15.5,9.21307792 C13.724799,9.21307792 12.2857143,10.6277723 12.2857143,12.3728864 C12.2857143,14.1180004 13.724799,15.5326948 15.5,15.5326948 Z" id="path-1"></path>%0A    </defs>%0A    <g id="Symbols" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">%0A        <g id="Atoms/Icons/Tools/Marker" transform="translate(-3.000000, -3.000000)">%0A            <mask id="mask-2" fill="white">%0A                <use xlink:href="%23path-1"></use>%0A            </mask>%0A            <use id="Mask" fill="%235B5B5B" fill-rule="nonzero" xlink:href="%23path-1"></use>%0A        </g>%0A    </g>%0A</svg>')}.leaflet-pm-toolbar .leaflet-pm-icon-polygon{background-image:none">%0A    <mask id="polygon-b" fill="%23fff">%0A      <use xlink:href="%23polygon-a"/>%0A    </mask>%0A    <use fill="%235B5B5B" fill-rule="nonzero" xlink:href="%23polygon-a"/>%0A    <g fill="%235B5B5B" mask="none">%0A      <rect width="30" height="30"/>%0A    </g>%0A  </g>%0A</svg>%0A')}.leaflet-pm-toolbar .leaflet-pm-icon-polyline{background-image:none">%0A    <mask id="line-b" fill="%23fff">%0A      <use xlink:href="%23line-a"/>%0A    </mask>%0A    <use fill="%235B5B5B" fill-rule="nonzero" xlink:href="%23line-a"/>%0A    <g fill="%235B5B5B" mask="none">%0A      <rect width="30" height="30"/>%0A    </g>%0A  </g>%0A</svg>%0A')}.leaflet-pm-toolbar .leaflet-pm-icon-circle{background-image:none - http://www.bohemiancoding.com/sketch -->%0A    <title>Atoms/Icons/Tools/Circle</title>%0A    <desc>Created with Sketch.</desc>%0A    <defs>%0A        <path d="M18.2897751,6.78602275 C18.8924131,6.29464981 19.661797,6 20.5,6 C22.4329966,6 24,7.56700338 24,9.5 C24,10.338203 23.7053502,11.1075869 23.2139772,11.7102249 C23.719599,12.8712053 24,14.1528571 24,15.5 C24,20.7467051 19.7467051,25 14.5,25 C9.25329488,25 5,20.7467051 5,15.5 C5,10.2532949 9.25329488,6 14.5,6 C15.8471429,6 17.1287947,6.28040098 18.2897751,6.78602275 Z M17.1504228,8.4817586 C16.3263581,8.17039236 15.4330777,8 14.5,8 C10.3578644,8 7,11.3578644 7,15.5 C7,19.6421356 10.3578644,23 14.5,23 C18.6421356,23 22,19.6421356 22,15.5 C22,14.5669223 21.8296076,13.6736419 21.5182414,12.8495772 C21.1960383,12.9473968 20.8541622,13 20.5,13 C18.5670034,13 17,11.4329966 17,9.5 C17,9.14583778 17.0526032,8.80396169 17.1504228,8.4817586 Z M14.5,17 C13.6715729,17 13,16.3284271 13,15.5 C13,14.6715729 13.6715729,14 14.5,14 C15.3284271,14 16,14.6715729 16,15.5 C16,16.3284271 15.3284271,17 14.5,17 Z M20.5,11 C21.3284271,11 22,10.3284271 22,9.5 C22,8.67157288 21.3284271,8 20.5,8 C19.6715729,8 19,8.67157288 19,9.5 C19,10.3284271 19.6715729,11 20.5,11 Z" id="path-1"></path>%0A    </defs>%0A    <g id="Symbols" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">%0A        <g id="Atoms/Icons/Tools/Circle" transform="translate(-3.000000, -3.000000)">%0A            <mask id="mask-2" fill="white">%0A                <use xlink:href="%23path-1"></use>%0A            </mask>%0A            <use id="Mask" fill="%235B5B5B" fill-rule="nonzero" xlink:href="%23path-1"></use>%0A            <g id="Atoms/Color/Grey" mask="none" fill="%235B5B5B">%0A                <rect id="Rectangle" x="0" y="0" width="30" height="30"></rect>%0A            </g>%0A        </g>%0A    </g>%0A</svg>')}.leaflet-pm-toolbar .leaflet-pm-icon-circle-marker{background-image:none}.leaflet-pm-toolbar .leaflet-pm-icon-rectangle{background-image:none">%0A    <mask id="rectangle-b" fill="%23fff">%0A      <use xlink:href="%23rectangle-a"/>%0A    </mask>%0A    <use fill="%235B5B5B" fill-rule="nonzero" xlink:href="%23rectangle-a"/>%0A    <g fill="%235B5B5B" mask="none">%0A      <rect width="30" height="30"/>%0A    </g>%0A  </g>%0A</svg>%0A')}.leaflet-pm-toolbar .leaflet-pm-icon-delete{background-image:none - http://www.bohemiancoding.com/sketch -->%0A    <title>Atoms/Icons/Tools/Eraser</title>%0A    <desc>Created with Sketch.</desc>%0A    <defs>%0A        <path d="M17.7874219,18.4812552 L11.6480079,13.3498184 L6.40466009,19.3816001 L10.5539156,22.9884929 L13.86934,22.9884929 L17.7874219,18.4812552 Z M16.5074252,22.9884929 L26.0000002,22.9884929 L26.0000002,24.9884929 L10.0000002,24.9884929 L9.80708313,24.9884929 L5.09254204,20.8910192 C4.25891285,20.1663564 4.17057814,18.9031112 4.89524093,18.069482 L16.0482444,5.23941916 C16.7729072,4.40578998 18.0361525,4.31745526 18.8697816,5.04211806 L24.9074583,10.2905903 C25.7410875,11.0152531 25.8294222,12.2784983 25.1047594,13.1121275 L16.5074252,22.9884929 Z" id="path-1"></path>%0A    </defs>%0A    <g id="Symbols" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">%0A        <g id="Atoms/Icons/Tools/Eraser" transform="translate(-3.000000, -3.000000)">%0A            <mask id="mask-2" fill="white">%0A                <use xlink:href="%23path-1"></use>%0A            </mask>%0A            <use id="Combined-Shape" fill="%235B5B5B" fill-rule="nonzero" xlink:href="%23path-1"></use>%0A        </g>%0A    </g>%0A</svg>')}.leaflet-pm-toolbar .leaflet-pm-icon-edit{background-image:none">%0A    <mask id="edit_anchor-b" fill="%23fff">%0A      <use xlink:href="%23edit_anchor-a"/>%0A    </mask>%0A    <use fill="%235B5B5B" fill-rule="nonzero" xlink:href="%23edit_anchor-a"/>%0A    <g fill="%235B5B5B" mask="none">%0A      <rect width="30" height="30"/>%0A    </g>%0A  </g>%0A</svg>%0A')}.leaflet-pm-toolbar .leaflet-pm-icon-drag{background-image:none">%0A    <mask id="move-b" fill="%23fff">%0A      <use xlink:href="%23move-a"/>%0A    </mask>%0A    <use fill="%23D8D8D8" xlink:href="%23move-a"/>%0A    <g fill="%235B5B5B" mask="none">%0A      <rect width="30" height="30"/>%0A    </g>%0A  </g>%0A</svg>%0A')}.leaflet-pm-toolbar .leaflet-pm-icon-cut{background-image:none - http://www.bohemiancoding.com/sketch -->%0A    <title>Atoms/Icons/Tools/Scissors</title>%0A    <desc>Created with Sketch.</desc>%0A    <defs>%0A        <path d="M12.9691574,13.4939435 L21.0317032,5.54167013 L23.4649499,5.67722957 L17.0470713,14.5106816 L27.5660336,17.1333535 L25.7891944,18.8012588 L14.5854951,17.8987506 L13.6487955,19.188007 C13.794639,19.2650958 13.9367985,19.3534417 14.0741377,19.4532245 C15.6379648,20.5894114 15.9846357,22.7782052 14.8484488,24.3420324 C13.7122619,25.9058595 11.5234681,26.2525304 9.95964096,25.1163435 C8.39581384,23.9801565 8.04914296,21.7913627 9.18532986,20.2275356 C9.74587276,19.4560145 10.5626188,18.9807475 11.4341218,18.8336407 L12.6805656,17.1180579 L12.5239724,16.3747216 L11.9506932,15.3012391 L9.89310646,14.7882251 C9.13093796,15.2357261 8.19977854,15.3966447 7.27445355,15.1659352 C5.39887519,14.698301 4.25751094,12.7987519 4.72514515,10.9231736 C5.19277935,9.04759519 7.09232846,7.90623094 8.96790682,8.37386515 C10.8434852,8.84149935 11.9848494,10.7410485 11.5172152,12.6166268 C11.4761464,12.7813449 11.4240335,12.9404001 11.3618627,13.0931999 L12.9691574,13.4939435 Z M7.75829735,13.2253438 C8.56211664,13.4257584 9.37620912,12.9366023 9.57662378,12.132783 C9.77703844,11.3289637 9.28788233,10.5148713 8.48406303,10.3144566 C7.68024373,10.1140419 6.86615126,10.603198 6.6657366,11.4070173 C6.46532194,12.2108366 6.95447805,13.0249291 7.75829735,13.2253438 Z M10.8033639,21.4031061 C10.3164266,22.0733177 10.4649998,23.0113722 11.1352115,23.4983095 C11.8054231,23.9852467 12.7434776,23.8366735 13.2304148,23.1664619 C13.7173521,22.4962502 13.5687788,21.5581957 12.8985672,21.0712585 C12.2283556,20.5843212 11.2903011,20.7328945 10.8033639,21.4031061 Z" id="path-1"></path>%0A    </defs>%0A    <g id="Symbols" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">%0A        <g id="Atoms/Icons/Tools/Scissors" transform="translate(-3.000000, -3.000000)">%0A            <mask id="mask-2" fill="white">%0A                <use xlink:href="%23path-1"></use>%0A            </mask>%0A            <use id="Mask" fill="%235B5B5B" fill-rule="nonzero" transform="translate(16.093194, 15.663351) rotate(-32.000000) translate(-16.093194, -15.663351) " xlink:href="%23path-1"></use>%0A        </g>%0A    </g>%0A</svg>')}.leaflet-pm-toolbar .leaflet-pm-icon-snapping{background-image:none - https://sketch.com -->%0A    <title>Atoms/Icons/Tools/Magnet</title>%0A    <desc>Created with Sketch.</desc>%0A    <defs>%0A        <path d="M21.9994759,10.9428183 L21.9999985,16.3710417 C22,16.6872007 22,17.0058278 22,17.3269411 C22,21.5646545 18.6421356,25 14.5,25 C10.3578644,25 7,21.5646545 7,17.3269411 L7.00087508,10.9907507 L11.0022808,10.9984125 C11.0017033,11.6980114 11.001247,12.4168248 11.0008992,13.1554887 L11,17.3269411 C11,19.3756809 12.5876841,21 14.5,21 C16.4123159,21 18,19.3756809 18,17.3269411 C18,15.0702032 17.9995696,12.9619668 17.998539,10.9910032 L21.9994759,10.9428183 Z M10,7 C10.5522847,7 11,7.44771525 11,8 L11,10 L7,10 L7,8 C7,7.44771525 7.44771525,7 8,7 L10,7 Z M21,7 C21.5522847,7 22,7.44771525 22,8 L22,10 L18,10 L18,8 C18,7.44771525 18.4477153,7 19,7 L21,7 Z" id="path-1"></path>%0A    </defs>%0A    <g id="Symbols" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">%0A        <g id="Atoms/Icons/Tools/Magnet" transform="translate(-3.000000, -3.000000)">%0A            <mask id="mask-2" fill="white">%0A                <use xlink:href="%23path-1"></use>%0A            </mask>%0A            <use id="Mask" fill="%235B5B5B" fill-rule="nonzero" transform="translate(14.500000, 16.000000) rotate(45.000000) translate(-14.500000, -16.000000) " xlink:href="%23path-1"></use>%0A        </g>%0A    </g>%0A</svg>')}.leaflet-pm-toolbar .leaflet-pm-icon-rotate{background-image:none">%0A        <mask id="rotate-b" fill="%23fff">%0A            <use xlink:href="%23rotate"/>%0A        </mask>%0A        <use fill="%235B5B5B" fill-rule="nonzero" xlink:href="%23rotate"/>%0A        <g fill="%235B5B5B" mask="none">%0A            <rect width="30" height="30"/>%0A        </g>%0A    </g>%0A</svg>%0A')}.leaflet-pm-toolbar .leaflet-pm-icon-text{background-image:none}.leaflet-buttons-control-button:hover,.leaflet-buttons-control-button:focus{cursor:pointer;background-color:#f4f4f4}.active>.leaflet-buttons-control-button{box-shadow:inset 0 -1px 5px 2px #514d4d4f}.leaflet-buttons-control-text-hide{display:none}.button-container{position:relative}.button-container .leaflet-pm-actions-container{z-index:2;position:absolute;top:0;left:100%;display:none;white-space:nowrap;direction:ltr}.leaflet-right .leaflet-pm-toolbar .button-container .leaflet-pm-actions-container{right:100%;left:auto}.button-container.active .leaflet-pm-actions-container{display:block}.button-container .leaflet-pm-actions-container:not(.pos-right) a.leaflet-pm-action:last-child{border-radius:0 3px 3px 0;border-right:0}.button-container .leaflet-pm-actions-container.pos-right a.leaflet-pm-action:first-child{border-radius:3px 0 0 3px}.button-container .leaflet-pm-actions-container.pos-right a.leaflet-pm-action:last-child{border-right:0}.button-container .leaflet-pm-actions-container .leaflet-pm-action{padding:0 10px;background-color:#666;color:#fff;display:inline-block;width:auto;border-right:1px solid #eee;user-select:none;border-bottom:none;height:29px;line-height:29px;vertical-align:middle}.leaflet-pm-toolbar .button-container:first-child.pos-right.active a.leaflet-buttons-control-button{border-top-left-radius:0}.leaflet-pm-toolbar .button-container:first-child.active:not(.pos-right) a.leaflet-buttons-control-button{border-top-right-radius:0}.button-container .leaflet-pm-actions-container .leaflet-pm-action:hover,.button-container .leaflet-pm-actions-container .leaflet-pm-action:focus{cursor:pointer;background-color:#777}.leaflet-pm-toolbar.activeChild{z-index:801}.leaflet-buttons-control-button.pm-disabled{background-color:#f4f4f4}.leaflet-buttons-control-button.pm-disabled>.control-icon{filter:opacity(.6)}
/*# sourceMappingURL=leaflet-geoman.css.map */
```
