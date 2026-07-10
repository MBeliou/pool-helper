# App Store release tooling

TypeScript run with **Deno** (no Fastlane/Ruby). Talks directly to the App Store
Connect REST API (ES256 JWT) and composites marketing screenshots locally. The only
shell-out is `xcrun simctl` for the simulator grab.

## Setup (once)

```sh
cp .env.example .env      # then fill in the values
deno task ping            # verifies renderfast + App Store Connect auth
```

`.env` (gitignored) needs the renderfast key and the App Store Connect API key
(Key ID, Issuer ID, path to the downloaded `.p8` — keep the `.p8` outside the repo).
`ASC_APP_ID` is optional; the tools resolve the app by `ASC_BUNDLE_ID` if it's absent.

## Workflow

```sh
deno task capture          # 1. automated: seeds demo data + navigates via mypool://
                           #    deep links, grabs each screen → out/raw/<id>.png
                           #    (needs a cap:dev build running; use -- --manual to drive by hand)
deno task frame            # 2. composite → out/framed/<id>.png (brand bg + headline +
                           #    screenshot inside assets/iphone-frame.svg)
deno task screenshots:push # 3. upload out/framed/** to the 6.7"/6.9" set (idempotent)
deno task metadata:push    # 4. push listing copy from metadata/** (idempotent)
```

### Subscriptions / IAP (products)

```sh
deno task readiness                   # JSON: full submission-readiness report (what's ok/missing/issues)
deno task readiness -- --format=text  # same, human-readable
deno task prices:report               # read-only: price + state + missing pieces per product
deno task products:pull               # mirror current ASC settings into products/products.json
deno task paywall                     # grab the RC paywall → out/paywall/ (see StoreKit config below)
deno task products:push -- --target=asc  # set price + localization + review screenshot from products.json
deno task products:push -- --target=rc   # verify RC structure (needs RC_SECRET_API_KEY; RC can't set prices)
```

**Paywall review screenshot — real prices via StoreKit config.** The dev build (`test_` key) shows
RevenueCat Test Store prices, and Test Store prices are immutable. To capture the paywall with the
real App Store prices, use the StoreKit config `apps/app/ios/App/Configuration.storekit` (mirrors
ASC: `yearly_sub` $29.99 + 3-day trial, `lifetime_pro` $59.99). One-time Xcode setup:
1. `pnpm cap:prod` (production bundle → the real `appl_` RevenueCat key), then `npx cap open ios`.
2. In Xcode, add `Configuration.storekit` to the App project if it isn't listed (drag it into the
   navigator), then Product → Scheme → Edit Scheme → Run → Options → **StoreKit Configuration →
   Configuration.storekit**.
3. **Run from Xcode** in the simulator (StoreKit config is ignored on headless `simctl` launches).
   As a free (non-Pro) user open the paywall → it shows $29.99 / $59.99 → `deno task paywall`.

### Deep links (screenshot automation)

The app registers a `mypool://` URL scheme (`Info.plist` + `src/lib/pool/native/deepLinks.ts`):

- `mypool://go/<route>` — navigate the router (e.g. `go/results`, `go/care/diagnose/1`).
- `mypool://seed/problem` · `seed/balanced` — (DEV only) load a demo profile + history, land home.
- `mypool://seed/<scenario>` — (DEV only) guidance-engine scenarios from
  `src/lib/pool/db/demoScenarios.ts`, one per canonical `engine.spec.ts` case:
  `cya-zero`, `high-ta`, `corrosive`, `bromine-low`, `swg-nudge`, `safety-floor`.
- `mypool://pro/on` · `pro/off` — (DEV only) fake the Pro entitlement in-memory so
  screenshots show the paid experience (capture.ts turns it on after seeding).

Try one on a booted simulator: `xcrun simctl openurl booted "mypool://seed/high-ta"`.
After changing the scheme or handler, run `pnpm cap sync` and rebuild (`pnpm cap:dev`).

- **Screens** (routes, headlines, subheads): `screens.ts`.
- **Listing copy**: `metadata/en-US/*.txt` + `metadata/urls.txt`.
- Re-running the two `:push` tasks overwrites the same fields / replaces the set —
  safe to run repeatedly while iterating.

## Framing is local (not renderfast)

`frame.ts` composites with `@napi-rs/canvas` on-device: brand gradient + headline + subhead,
with the screenshot dropped behind the real iPhone frame `assets/iphone-frame.svg` (its screen
area is transparent, so it shows through the cutout). renderfast's API can't render image
layers, so it can't frame a screenshot — see `RENDERFAST_FEEDBACK.md`. `template.ts` + the
renderfast client are parked (text/background render fine) for when that's fixed.

## Still done by hand (outside these tools)

Everything below bit us during the real 1.0 submission — `deno task readiness` reminds you of
these, but the API can't verify most of them.

- **Deploy the marketing site** so the Privacy URL (`/privacy`) is live — the reviewer follows it.
- **Attach the IAPs to the version** — version page → *In-App Purchases and Subscriptions* → add
  both products. First-time IAPs are reviewed **with** the app version; `READY_TO_SUBMIT` in the
  products section is NOT enough on its own. Miss this and the app can be approved while the
  paywall sells nothing in production.
- **App Privacy questionnaire** (App → App Privacy) — must be **published** by an Account
  Holder/Admin before submission. Because we ship the RevenueCat SDK, per
  [RevenueCat's Apple privacy guidance](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy):
  - Declare **Purchases → Purchase History**, with BOTH purposes **App Functionality** (receipt
    validation, entitlements) and **Analytics** (RC dashboards/charts).
  - **Not linked to identity** (we use RC anonymous IDs — would flip to "linked" if we ever set a
    custom appUserID) · **not used for tracking**.
  - Everything else: *Data not collected* — pool data lives on-device only.
- **Copyright** — required version field; now pushed by `metadata:push` from `urls.txt`
  (`copyright=© 2026 …`).
- **iPad screenshots** — demanded automatically if the build declares iPad support. We ship
  iPhone-only (`TARGETED_DEVICE_FAMILY = 1` in project.pbxproj); if that ever flips back to
  `"1,2"` (Capacitor's default), ASC requires 13" iPad (2064×2752) screenshots too.
- **App review information** (version page) — contact name/phone/email (private; use a monitored
  personal inbox, not the public hello@), "sign-in required" unticked (no accounts), and reviewer
  notes **in English**: data on-device, no login, Pro sold via RevenueCat paywall (annual w/
  3-day trial + lifetime).
- **Pricing & availability** — app price $0 (Pro is IAP) + territory availability selected
  (all territories; trimming later needs no re-review).
- **Paid Apps Agreement** (Agreements, Tax, and Banking) — must be Active with banking/tax
  complete or paid IAPs won't go live. Not visible via the API.
- **RevenueCat entitlement identifier** must equal `revenuecatConfig.ts`
  `MY_POOL_PRO_ENTITLEMENT` (**`My Pool Pro`**, exact case/spacing) with both products attached —
  otherwise purchases succeed but Pro never unlocks. Identifiers can't be renamed in RC; recreate
  the entitlement if wrong.
- **Build numbers**: Xcode's "Automatically manage build number" rewrites the archive's number at
  upload time — the pbxproj value is a starting point, not what ASC necessarily receives. Trust
  the Organizer's *Submission Status* for what was actually uploaded.
- Final **Submit for Review** in App Store Connect (answer the export-compliance question
  "exempt only" if asked).
</content>
