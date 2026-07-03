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
`mypool://go/<route>` navigates; `mypool://seed/problem` (DEV only) onboards + loads demo data.
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

- Deploy the marketing site so the Privacy URL (`/privacy`) is live.
- Confirm the Annual + Lifetime IAP are attached to the version for review.
- Final **Submit for Review** in App Store Connect.
</content>
