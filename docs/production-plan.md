# Production readiness plan

Status audit date: 2026-06-12. Items are ordered by tier; each has enough context to be picked up
cold. File paths refer to the current layout (`src/lib/pool/**`, `src/routes/**`).

Legend: **Why** (what's wrong today) · **Do** (implementation guidance) · **Done when** (acceptance).

---

## P0 — Blockers: wrong or unsafe to ship

### 1. Replace placeholder dosing chemistry — ✅ done 2026-06-12 (see docs/dosing-basis.md)

- **Why:** `src/lib/pool/fixPlan.ts` dose factors were tuned to reproduce the design mockup's
  example numbers, not chemistry (`Cal-Hypo 12.7 g per ppm·m³` is ~8× reality). The app currently
  gives confidently wrong, potentially harmful advice.
- **Do:**
  - Real formulas, keeping `computeFixPlan()`'s shapes intact (it is the seam for the resolution
    pipeline): 1 ppm FC = 1 g/m³ available chlorine → product grams = `ppm × m³ / strength`
    (Cal-Hypo 0.65, Dichlor 0.56; liquid 12.5% in mL = `ppm × m³ / 0.125`).
    TA: ~17.6 g NaHCO₃ per m³ per 10 ppm. CH: ~14.7 g CaCl₂·2H₂O per m³ per 10 ppm.
    CYA: ~10 g per m³ per 10 ppm. pH: acid demand depends on TA — use a standard approximation
    table (dose per 0.1 pH per 10 m³ scaled by TA/100) and document the source.
  - Add a visible disclaimer on `/results` ("verify doses against product labels") and a
    first-use acknowledgement.
  - Unit-test every factor (see item 15).
- **Done when:** doses match a published pool-calculator reference within ±10% across the demo
  scenarios, and the disclaimer ships.

### 2. Fix the imperial gallon — ✅ done 2026-06-12

- **Why:** `volumeToCubicMetres()` (`src/lib/pool/fixPlan.ts`) multiplies all `'gallons'` by
  3.785 L (US). The UK/Imperial preset therefore under-doses by ~17% (imperial gallon = 4.546 L).
- **Do:** split the unit: `VOLUME_UNITS = ['litres', 'US gal', 'imp gal', 'm³']` in
  `src/lib/pool/units.ts`; migration to update stored `'gallons'` profiles
  (`UPDATE profile SET volume_unit = 'US gal' WHERE volume_unit = 'gallons'` — hand-add the
  statement to the generated migration); presets in `UnitsSettings.svelte` map US → `US gal`,
  UK → `imp gal`; conversion table in `volumeToCubicMetres`.
- **Done when:** UK preset + 10,000 imp gal computes 45.46 m³ in the fix-plan math rows.

### 3. App identity

- **Why:** bundle id is `com.example.app`, display name "pool-helper", scaffold icon, no
  branded launch screen, version 1.0/1 unmanaged.
- **Do:** pick a reverse-DNS id (e.g. `com.fumo.poolhandler`) in `capacitor.config.ts` **and**
  Xcode project settings (changing appId requires `npx cap sync` + checking
  `ios/App/App.xcodeproj`); display name "Pool Handler" in `Info.plist`/config; app icon set in
  `ios/App/App/Assets.xcassets` (1024px master — **needs artwork from Maxime**); launch screen
  storyboard background to the brand gradient (`#1f86c4 → #0b5a92`); set MARKETING_VERSION and
  build-number bump discipline (e.g. `agvtool` or manual rule in this doc).
- **Done when:** simulator shows branded name/icon; `xcrun simctl listapps` shows the new id.
  Note: changing the bundle id orphans the old install's data — fine pre-release.

### 4. Production Capacitor config (kill the dev-server URL) — ✅ done 2026-06-12

- **Why:** `capacitor.config.ts` hardcodes `server.url: http://192.168.1.15:5001` (live reload).
  A production build must serve the bundled static `build/` output.
- **Do:** make it conditional:
  `...(process.env.CAP_LIVE_RELOAD ? { server: { url: process.env.CAP_LIVE_RELOAD } } : {})`,
  add `"cap-dev"` script that sets the env var, document in README. Production flow:
  `pnpm build && npx cap sync ios` with no env var.
- **Done when:** an installed build works in airplane mode with the dev server stopped.

### 5. Strip scaffold/dev cruft from the shipped bundle — ✅ done 2026-06-12

- **Why:** `/demo/*` routes, `src/stories/**` (Storybook), `src/lib/vitest-examples/**`, and the
  Developer seed group in `/more` are all prerendered into the production app.
- **Do:** delete `src/routes/demo`, `src/stories` (+ `.storybook` if Storybook isn't wanted),
  `src/lib/vitest-examples`; wrap the Developer group in `src/routes/more/+page.svelte` with
  `{#if import.meta.env.DEV}` (vite statically removes it from prod builds; keep seeds available
  in dev). `design-reference/` is not under `src` and never bundles — keep for reference.
- **Done when:** `build/` contains no demo/story assets; `/more` in a production build has no
  Developer group; dev server still shows it.

### 6. Database failure UX — ✅ done 2026-06-12

- **Why:** if SQLite init or a migration throws, `app.load()`'s floating promise in
  `src/routes/+layout.svelte` swallows the app into a silent skeleton.
- **Do:** add `resetDatabaseInitialization()` to `src/lib/pool/db/connection.ts` (clears the
  single-flight promise); layout catches `app.load()` rejection into a `loadError` state and
  renders a minimal error screen (brand gradient, message, "Try again" → reset + reload).
  Log the underlying error to console (and later to crash reporting, item 22).
- **Done when:** temporarily renaming the wasm asset (web) produces the error screen with a
  working retry instead of a dead app.

---

## P1 — Product gaps: looks done, isn't wired

### 7. Diagnose wizard persists nothing

- **Why:** symptoms/answers/causes are page state; "Start a fix plan →" navigates to the
  timeline without creating anything. This is the input surface for the resolution pipeline.
- **Do (coordinate with pipeline work):** new `diagnoses` table (id, startedAt, symptoms JSON,
  answers JSON) written at step 4; "Start a fix plan" inserts an `issues` row (title from top
  cause, statusKey, subtitle, expectedDays) + initial `issue_events` plan steps, then navigates
  to `/care/timeline?issue=<new id>`. The static causes list remains placeholder until the
  pipeline supplies real ranking.
- **Done when:** completing the wizard creates a visible issue in `/care` that survives restart.

### 8. Fix-plan completion writes to the journal — ✅ done 2026-06-12

- **Why:** done-checkboxes and "Mark all done" on `/results` are ephemeral.
- **Do:** on marking an action done (and for each pending action on "Mark all done"), call
  `insertAction({ performedAt: new Date(), title: \`${action.title} · ${action.doseText}\` })`
(`src/lib/pool/db/actionsRepository.ts`); navigate home afterwards as today. Consider a
`sourceTestId`column on`actions` later for traceability.
- **Done when:** completing the plan produces journal entries on `/log`.

### 9. Real reminders (local notifications)

- **Why:** `reminderDays` is stored (`profile.reminder_days`) but nothing fires.
- **Do:** add `@capacitor/local-notifications` (official plugin, SPM-ready; `cap sync` then
  verify `CapApp-SPM/Package.swift`); permission request from `/more/reminders` on first enable;
  schedule logic in a new `src/lib/pool/reminders.ts`: cancel-and-reschedule a single repeating
  notification at `latestTest.testedAt + reminderDays` (re-run after every test insert and
  cadence change). Web: no-op guard.
- **Done when:** simulator delivers a notification (set cadence to 1 day, fake the clock or use
  `schedule({ at })` with a near date for testing).

### 10. Onboarding "Calculate it" volume mode — ✅ done 2026-06-12

- **Why:** the segmented toggle on `/onboarding/size` (and the same logic reused on
  `/more/profile`) has no calculator behind it.
- **Do:** when mode = calculate, show length/width/avg-depth inputs (units follow
  `volumeUnit` family: m for metric, ft otherwise) and compute litres with shape multipliers
  from `app.shape`: rectangle 1.0, oval/kidney/freeform 0.89, round π/4, L-shape 0.85 (document
  constants in `src/lib/pool/chemistry.ts` or a new `volumeCalculator.ts`); write the result
  into `app.volume` (formatted) and flip back to "I know my volume".
- **Done when:** 10 m × 5 m × 1.5 m rectangle yields 75,000 L in the volume field.

### 11. Temperature capture — ✅ done 2026-06-12

- **Why:** `tests.temperature` exists but no UI writes it (gauge fills only from seeds).
- **Do:** optional sixth row on `/log/entry` ("Water temp", °C/°F select honouring
  `app.temperatureUnit` as default, stored canonical °C — extend the save handler conversion).
- **Done when:** a manual test shows a temperature gauge value on Home.

### 12. Time-scaled trend charts — ✅ done 2026-06-12

- **Why:** `HChart.svelte` spaces points by array index — a 20-day gap renders like a 3-day gap.
- **Do:** add optional `timestamps: number[]` prop; x positions become
  `(t - first) / (last - first)`; `buildTrends()` already returns `dates`. Axis labels in
  `/trends/[param]` already use real dates.
- **Done when:** the problem-pool seed (uneven cadence) shows visibly uneven point spacing.

### 13. i18n decision (recommend: actually use paraglide)

- **Why:** paraglide (en/fr) is scaffolded but every string is hardcoded; all date/number
  formatting is `'en-US'`.
- **Do:** either remove paraglide (delete `project.inlang`, runtime imports, hooks) **or**
  migrate UI strings to `messages/{en,fr}.json` and replace hardcoded `'en-US'` in
  `src/lib/pool/format.ts` + repositories with the active locale. Recommend migrating: the
  French market is plausibly the target (°fH default…). Budget: it touches every screen — do it
  before copy multiplies further.
- **Done when:** language switch renders French on all screens, or paraglide is fully removed.

### 14. Data export

- **Why:** users have no way to back up or move their data.
- **Do:** `/more` row "Export data" → native: `databaseConnection.exportToJson('full')` + share
  sheet via `@capacitor/share`; web: download a Blob. Import is out of scope for v1.
- **Done when:** the share sheet offers a JSON containing profile, tests, actions, issues.

---

## P2 — Quality engineering

### 15. Unit tests for the pure modules

- **Why:** zero committed tests; the math is exactly the code that must not regress.
- **Do (vitest node project already configured):** `src/lib/pool/*.spec.ts` covering:
  `units.ts` (°fH/°dH/ppm round-trips, °F), `chemistry.ts` (status boundaries, scale fractions,
  testValue normalization incl. mixed units), `fixPlan.ts` (each dose factor, gallon variants,
  in-range vs action classification), `trends.ts` (direction thresholds), `format.ts`
  (dayLabel/relativeAge edge cases), `db/migrations.ts` (runner against a mocked
  `SQLiteDBConnection`: ordering, idempotency, rollback on failure).
- **Done when:** `pnpm test:unit -- --run` green with meaningful coverage of those files.

### 16. Committed e2e suite

- **Why:** all Playwright verification so far was ad-hoc and deleted.
- **Do:** `e2e/` specs using the patterns already proven in-session: onboarding completion +
  persistence; log flow (tester → entry with per-row units → journal + detail); fix-plan product
  switching; `/more` settings round-trips; empty states; legacy localStorage import. Run against
  `vite dev` (jeep-sqlite path; assert `/assets/sql-wasm.wasm` 200 first). Wire into
  `playwright.config.ts` webServer.
- **Done when:** `pnpm test:e2e` passes headless from a clean checkout.

### 17. CI

- **Do:** GitHub Actions: pnpm cache → `pnpm install` → `pnpm check` → `pnpm lint` →
  unit tests → `pnpm build` → e2e. Later: macOS job for `xcodebuild -scheme App` smoke build.
- **Done when:** PRs get a green/red check.

---

## P3 — iOS polish & App Store admin

### 18. Lock to portrait

- **Do:** `Info.plist` `UISupportedInterfaceOrientations` → portrait only (layouts are
  portrait-only; landscape currently renders broken).

### 19. Status bar & splash

- **Do:** `@capacitor/status-bar`: set light-content over the gradient header, sync with
  `theme.dark`; `@capacitor/splash-screen` configured with the brand gradient so launch →
  webview handoff is seamless.

### 20. Accessibility pass

- **Do:** VoiceOver labels on icon-only buttons (mostly present — audit gauges/charts with
  `aria-label` summaries); contrast check the translucent white pills on gradient; consider a
  type scale that honours iOS Dynamic Type (all sizes are fixed px today — minimum: test at
  larger accessibility sizes and fix overflow).

### 21. App Store package

- **Do:** `PrivacyInfo.xcprivacy` (declare UserDefaults/file-timestamp API usage per plugin
  guidance); privacy policy URL (data never leaves device — say so); encryption export
  compliance: the SQLite plugin embeds SQLCipher even with `'no-encryption'` — research the
  correct `ITSAppUsesNonExemptEncryption` answer before submission; screenshots; TestFlight
  internal testing round.

### 22. Crash/error reporting decision

- **Do:** decide Sentry (`@sentry/capacitor`) vs nothing for v1. If added: wire to the item-6
  error path and `window.onerror`; respect privacy policy. If skipped: record the decision here.

---

## Deferred by explicit decision (revisit post-v1)

- Multi-pool support (pools table + poolId FKs everywhere) — coming-soon sheet shipped.
- Custom testers — coming-soon sheet shipped.
- Resolution pipeline (fix plan logic, diagnosis ranking, issue content) — owned by Maxime,
  arriving as a separate workstream; seams: `computeFixPlan()`, wizard step 4, `issues`/
  `issue_events`/`actions` tables.

## Suggested sequencing

1. P0 #2–#6 (mechanical, one pass) → 2. P0 #1 alongside pipeline kickoff → 3. P1 #8, #11, #12,
   #10 (small, independent) → 4. P1 #9, #14, #13 (plugin/i18n work) → 5. P2 tests + CI → 6. P3 store admin. P1 #7 lands with the pipeline.
