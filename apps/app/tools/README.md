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
deno task capture          # 1. guided grab from the booted simulator → out/raw/<id>.png
deno task frame            # 2. composite → out/framed/<id>.png (brand bg + headline +
                           #    screenshot inside assets/iphone-frame.svg)
deno task screenshots:push # 3. upload out/framed/** to the 6.7"/6.9" set (idempotent)
deno task metadata:push    # 4. push listing copy from metadata/** (idempotent)
```

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
