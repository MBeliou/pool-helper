# i18n plan — decision & approach

Status: 2026-06-18. Resolves production-plan #13. Conclusion of a repo audit + paraglide/alternatives
research + adversarial review.

## Verdict: keep Paraglide, reconfigure for Capacitor, do infra now, defer mass translation

Paraglide is the right library; the **scaffold default config is wrong for a server-less `file://`
app**, and the catalog is empty. The ~800-string extraction debt is library-independent, so switching
libraries buys nothing. svelte-i18n / typesafe-i18n / sveltekit-i18n are heavier, less type-safe, or
less maintained for this stack.

## Ground truth (what's actually there today)

Paraglide is scaffolded but **functionally inert**:

- `project.inlang` + compiled `src/lib/paraglide/` exist, locales `en` + `fr`.
- Catalog = **1 placeholder message** (`hello_world`); **0** `m.*()` call sites anywhere. Real-copy
  coverage **0%**.
- Active strategy is the untouched default `["cookie","globalVariable","baseLocale"]`
  (`runtime.js:35`). `preferredLanguage`, `localStorage`, `url` are tree-shaken **off**.
- On device (no SSR, `capacitor://localhost`, cold start each launch): the iOS device language is
  **never read** (a French iPhone gets English), and any locale choice is **in-memory only → lost on
  relaunch**. Locale is effectively frozen to `en` (`build/index.html` → `lang="en"`).
- A phantom `build/fr/` prerender tree (duplicated English) ships from the hidden `localizeHref`
  block in `+layout.svelte`.
- ~717 hardcoded markup strings + ~100 user-facing logic strings (heaviest: `results` 72,
  `care/diagnose/[step]` 58, `log/entry` 54, `log` 43, `onboarding/premium` 37, `trends/[param]` 35…).
- 9 hardcoded `'en-US'` formatter sites; `format.ts` `dayLabel`/`relativeAge` return literal English
  words ("Today"/"Yesterday"/"days"/"weeks").

## Phase 0 — infra (SMALL, ~1 day, do this cycle; it _removes_ shipped weight)

Use **Design B (reactive rune)** end-to-end — do not half-adopt paraglide's built-in strategies, or
persistence silently breaks (see "Pitfalls"):

1. Drive locale from a Svelte `$state` rune wired via `overwriteGetLocale`/`overwriteSetLocale`.
   Compiled `m.*()` read `getLocale()` at render, so reading the rune makes every message re-render
   reactively — **instant switch, no reload**. (A `setLocale()` reload would re-run `+layout.svelte`
   `onMount` → `app.load()` → re-init jeep-sqlite + re-run migrations. Never trigger it.)
2. **You own persistence + seeding** (the overwrite bypasses both):
   - **Persist via `@capacitor/preferences`, not `localStorage`.** WKWebView `localStorage` is
     script-writable storage iOS can evict (Capacitor's storage guide says exactly this) — a saved
     language must survive that. `@capacitor/preferences` is backed by native `UserDefaults`
     (and falls back to localStorage on web). The custom setter writes the rune **and**
     `Preferences.set({ key: 'locale', value: next })`. Adds the plugin → **needs `cap sync`**.
     (Alternative considered: store locale in the existing SQLite profile — durable too, but only
     readable after DB init, which is too late for first paint. Preferences is available earlier and
     survives a DB reset, so prefer it for locale.)
   - **First paint is synchronous; Preferences is async** — so seed the rune synchronously from
     `navigator.languages` (`fr*` → `fr`, else `en`) for an instant, flash-free first render, then
     `await Preferences.get({ key: 'locale' })` and apply the saved override if it differs (one cheap
     re-render, only for users who picked a non-device language). `navigator.languages` works in
     WKWebView with no plugin; `@capacitor/device` is optional later hardening if the WebView mirrors
     the app's resource list rather than OS preference.
3. Set `strategy: ['preferredLanguage','baseLocale']` in `vite.config.ts` as paraglide's internal
   fallback (mostly inert once the rune drives reads and Preferences holds the durable choice). Drop
   `cookie` (needs a server), `globalVariable` (testing-only), `url` (no server to route).
4. Strip dead routing scaffold: delete `src/hooks.ts` (`reroute`); gut `src/hooks.server.ts`
   (`paraglideMiddleware` only runs at prerender); **physically replace** `%paraglide.lang%`/
   `%paraglide.dir%` in `app.html` with `lang="en" dir="ltr"` (gutting the middleware without
   replacing the tokens ships them verbatim); remove the `localizeHref` block + import from
   `+layout.svelte` (kills `build/fr/`). Set `document.documentElement.lang` client-side after
   resolve (functional for screen readers, not cosmetic).
5. Language switcher: in onboarding **and** `/more` (a mis-detected user must find it). Options
   self-labelled in their own language ("English" / "Français"), never translated; icon-only control
   needs an `aria-label`.
6. Replace `hello_world` with real `messages/{en,fr}.json` and prove one `m.*()` renders end-to-end.

## Phase 1 — locale-correct formatting (SMALL→MEDIUM, ~1 day, do now)

Replace the 9 hardcoded `'en-US'` sites with a shared `getLocale()`-aware module (cached `Intl`
instances) so French renders `18 juin`, 24h `08:30`, and `12 500` instead of US formats:
`format.ts:7,14,19`; `fixPlan.ts:107`; `VolumeCalculator.svelte:53,59`; `profileRepository.ts:32`;
`care/timeline/+page.svelte:38`; `more/profile/+page.svelte:62`; `onboarding/size/+page.svelte:28`.

- `dayLabel`/`relativeAge` (`format.ts:36-50`) are **messages, not formatters** — move to ICU plural
  keys. Drop the `formatTimeCompact` `.toLowerCase().replace(' ','')` hack (fr wants 24h `08:30`).
- **Store volume as a number, format at render.** The DB column is already a clean integer
  (`profileRepository` converts at the boundary); only `app.volume` (in-memory) and the formatters
  carry the comma. Holding the number in state and formatting on render removes the string↔int
  round-trip entirely. **No corruption today:** every parser is `replace(/[^0-9]/g, '')` and volumes
  are integers, so a French thousands space (U+202F) is stripped exactly like a comma — an earlier
  draft (and its own critique) overstated this as a data bug. The locale-aware-_parse_ concern is
  real only for a future **decimal** input (e.g. typing `1,5`); use a shared locale-aware parse
  helper there and test by parse round-trip (on-device JSC `Intl` differs from CI Node ICU).
- en + fr are both LTR — no RTL work now. Update `format.spec.ts` (pins `en-US`).

## Phase 2–3 — extraction + fr catalog (LARGE, DEFER until France is a committed bet)

Extract screen-by-screen by node count (highest leverage first), flat prefixed keys
(`results_*`…), en/fr key-parity enforced in CI. Data/logic copy (`chemistry.ts`, `fixPlan.ts`,
`dosing.ts` — triage the scientific "basis" strings; `demoData.ts` last/never). **French lands
incrementally**: missing `fr` values fall through to `baseLocale` (English) with no crash, so ship
English-complete and backfill `fr` per screen post-launch. Human translation + QA is a separate,
unbudgeted track.

## Out of JS scope (don't conflate)

App Store Connect metadata (name/subtitle/keywords/screenshots) localizes in the store listing.
RevenueCat paywall copy + prices localize via StoreKit product strings + the RC dashboard — only the
app's own surrounding UI strings need `en`/`fr`. So the unconfigured paywall neither blocks nor is
blocked by this work.

## Pitfalls that bit the first draft (honor these)

1. **Commit to Design B fully.** `overwriteSetLocale` replaces paraglide's built-in persistence and
   `overwriteGetLocale` bypasses the strategy resolution — so the custom setter must persist (to
   `@capacitor/preferences`), and the boot seed must read `navigator.languages` (sync) then reconcile
   with Preferences (async) itself. Don't assume the strategy chain still runs once you overwrite.
2. Prefer **storing numbers and formatting at render** over re-parsing formatted strings. Volume is
   _not_ corrupted by a locale switch today (integer value + digit-strip parser); the U+202F /
   parse-round-trip caution applies only to a future locale-aware **decimal** parse.
3. **Keep `app.load()`/SQLite init out of whatever the locale switch re-runs** — true only if the
   custom setter never falls through to `reload: true`.
4. Leave `experimentalStaticLocale` undefined (if set, `getLocale()` is never called and the rune
   goes dead).
