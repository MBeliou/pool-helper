# Post-v1 improvements (parked)

Status opened: 2026-07-08, during the v1 App Store readiness review.

These are **deliberately out of scope for the v1 release**. They are captured here so v1 can ship a
small, honest, working product now, and these can be picked up in order afterward. Each item has
enough context to start cold.

Legend: **What** · **Why deferred** · **Where it lives** · **Notes to pick it up**.

---

> **Update 2026-07-09:** the guidance engine shipped (`src/lib/pool/guidance/`) — item 1's
> intelligence is now wired deterministically (symptom priors × engine evidence, no LLM) and
> item 3 (SWG + bromine chemistry, sanitiser-aware targets/doses) is DONE; see
> docs/guidance-engine-implementation-notes.md. Item 2 (total chlorine) is DONE too: `totalChlorine`
> column, per-tester entry (testers now declare `measures` in data.ts), combined chlorine in the
> engine (note ≥ 0.5 ppm, shock action ≥ 1.0 ppm) and real chloramines evidence in diagnose.
> Still open from item 3: a **salt reading/parameter for SWG pools** (ranges, dosing, cell-output
> advice) — the "Salt meter" tester currently contributes only water temperature. New item 7 below.

## 1. Real problem-diagnosis engine (replace the placeholder wizard)

- **What:** The "Diagnose an issue" wizard (`src/routes/care/diagnose/[step]/+page.svelte`) is the
  flagship **Pro** feature, but today its output is entirely **static**. The step-2 clarifying
  questions are hardcoded ("Milky-white or hazy-blue?", "Shocked in the last 48h?"), the step 2/3
  subtitle always reads "Cloudy water" regardless of symptoms, and step-4 always returns the same three
  ranked causes ("Low chlorine + high pH · 78%", "Weak filtration · 41%", "High calcium hardness ·
  18%") no matter what the user picked or what their latest test says.
- **Why deferred:** The real "resolution pipeline" (diagnosis ranking, issue content, dosing-plan
  logic) is a separate workstream owned by Maxime. Building it properly is a large effort.
- **Where it lives:** Wizard UI + `computeFixPlan()` seam (`src/lib/pool/fixPlan.ts`), the
  `diagnoses` / `issues` / `issue_events` tables, and `createIssueWithPlan()`
  (`src/lib/pool/db/issuesRepository.ts`). The **persistence** seam already works — completing the
  wizard writes a real issue that survives relaunch. Only the **intelligence** is placeholder.
- **Notes to pick it up:** Rank causes from the actual symptoms + latest `TestRow` (the fix-plan math
  already knows what's out of range). Make step-2 questions depend on the picked symptom. Remove the
  fabricated percentages until they're computed from something real. A diagnosis-requirements doc is
  to be provided by Maxime.
- **Candidate approach — LLM-guided pool care:** Use an LLM to turn symptoms + the latest readings +
  the pool profile into a plain-language diagnosis and a tailored fix plan (the raw material — real
  chemistry ranges, dosing math, and symptom list — already exists in `chemistry.ts` / `dosing.ts` /
  `fixPlan.ts`). Design decisions: on-device vs. hosted (privacy promise is "data never leaves the
  device" — an API call breaks that unless disclosed), cost, offline behaviour, and how to keep the
  model from giving unsafe dosing advice (constrain it to the computed doses, don't let it invent
  numbers).

## 2. Total chlorine vs. free chlorine (and testers that only read total)

- **What:** The app models only **free chlorine** (`fc` in `chemistry.ts`). Many cheap test strips
  report only **total chlorine** (TC), and some kits report both (free + total, where combined
  chlorine = total − free). A user with a TC-only strip has no honest place to enter their reading.
- **Why deferred:** Adds a parameter, changes the test-entry UI, and needs care around what advice to
  give (high combined chlorine → shock recommendation).
- **Where it lives:** `PARAMETERS` in `src/lib/pool/chemistry.ts`, the log-entry form
  (`src/routes/log/entry/+page.svelte`), the `tests` schema, and `computeFixPlan()`.
- **Notes:** Add a `totalChlorine` column; when only TC is entered, either treat it as FC with a
  caveat or compute combined chlorine when both are present and surface "shock needed" when combined
  > ~0.5 ppm. Coordinate with the per-tester capability model (item 3).

## 3. Non-chlorine sanitisers: Salt (SWG) and Bromine

- **What:** Onboarding lets the user pick **Chlorine / Salt (SWG) / Bromine** and claims "These change
  the chemistry advice" — but `app.sanitiser` is **only stored and displayed** (as a chip on `/more`).
  It does **not** change any parameter, range, or dose. A salt or bromine pool currently gets
  identical chlorine advice.
  - **SWG = Salt Water Chlorine Generator.** A salt pool isn't dosed with liquid chlorine day to day;
    it dissolves salt (target ~2700–3400 ppm NaCl, brand-dependent) and a cell electrolyses it into
    chlorine. You tune the **cell output %**, not a chemical dose. Relevant params add **salt level**;
    the "raise chlorine" advice should mostly become "raise SWG output / check the cell", with salt
    dosing when salt is low.
  - **Bromine** pools measure **total bromine** (ideal ~4–6 ppm), not free chlorine. Bromine is
    common on hot tubs/spas. The FC gauge and chlorine dosing don't apply.
- **Why deferred:** Each is its own chemistry model (parameters, ranges, products, advice).
- **Where it lives:** `app.sanitiser` (`state/app.svelte.ts`), `chemistry.ts` `PARAMETERS`,
  `dosing.ts` products, `fixPlan.ts`. Also the marketing/App Store "chlorine or salt" claim.
- **Notes:** Gate the parameter set and the dosing catalogue on `app.sanitiser`. Add a `salt`
  parameter for SWG; swap `fc` → total bromine for bromine.

## 4. Filter-media-aware guidance (incl. what D.E. is)

- **What:** Onboarding captures filter media — **Sand, Glass, Cartridge, D.E., Cotton balls** — but
  `app.filter` is only stored/displayed, never used in advice.
  - **D.E. = Diatomaceous Earth:** a fine powder (fossilised diatoms) that coats a set of grids and
    filters the finest particles of any common media. Maintained by periodic **backwash + recharge**
    (add fresh D.E. through the skimmer). It's a legitimate, common media — worth keeping in the list.
  - **"Cotton balls"** refers to polyester **fibre balls**, a cartridge alternative used mainly in hot
    tubs; you rinse or replace them.
- **Why deferred:** Filter-specific maintenance advice (backwash cadence for sand/glass/D.E., rinse
  for cartridge, replace for fibre) is a content + logic effort.
- **Notes:** This ties into item 5 (quick actions) — the right maintenance quick-actions depend on the
  filter media.

## 5. Quick-pick maintenance actions (reduce friction on "Add an action")

- **What:** Logging a maintenance action is fully manual (free-text). Common recurring tasks —
  **backwash, rinse cartridge, replace fibre/cotton balls, add D.E., brush walls, empty skimmer, run
  pump** — should be one-tap presets.
- **Why deferred:** Pure UX enhancement; the manual path works for v1.
- **Where it lives:** The action-logging flow (`actionsRepository.ts`, the "Add an action" entry
  point) and the Care timeline.
- **Notes:** Offer a preset grid (filtered by the pool's filter media / sanitiser) that pre-fills the
  title; keep free-text as the fallback. Consider per-preset default cadences to feed reminders.

## 6. Weather capabilities

- **What:** Use location weather (temperature, UV, rain, wind, pollen) to inform pool care — e.g.
  heat/UV burns off chlorine faster (raise the re-test cadence, expect higher demand), heavy rain
  dilutes and lowers pH/alkalinity, storms wash in debris.
- **Why deferred:** Needs a location permission, a weather data source, and a privacy-policy update
  (the current promise is "no account, nothing tracked, data on device" — calling a weather API with
  location changes that story and must be disclosed).
- **Notes:** Could feed both the reminder cadence and the diagnosis engine (item 1). Decide on a
  provider (Apple WeatherKit fits the iOS-only, privacy-conscious posture) and make it opt-in.

## 7. Product shelf — the user's actual chemicals (manual entry → vision scan)

- **What:** Doses are computed against a default catalogue product (e.g. "Dry acid ~93%") the user
  may not own. Let users declare what's on their shelf: product name + type + strength, stored on
  the profile, becoming the default in every dose picker. Phase 2: a vision-model label scan
  ("point your camera at the tub") that identifies the product and its strength so users can't
  apply a dose to the wrong product.
- **Why deferred:** Needs per-product dosing-basis input UX (strength %, chemical type) and, for
  phase 2, a vision model — which collides with the "data never leaves the device" privacy promise
  unless disclosed or run on-device.
- **Where it lives:** `DOSING_PRODUCTS`/`DOSING_BASIS` (`src/lib/pool/dosing.ts` — already per-product
  constants, so a user product is just another entry), the product picker sheet
  (`src/routes/results/+page.svelte`), and the profile schema.
- **Notes:** The "What you'll need to buy" page was removed (2026-07-09) precisely because it
  pretended to know the user's products. Interim state: catalogue defaults + the "check your
  product's label" disclaimer.

---

## Related v1-launch honesty gaps (NOT fixed — awaiting your direction)

The readiness review found places where the app/store currently _claim_ things these deferred features
would deliver. **No code or copy was changed** — these are flagged for you to decide how to handle:

- **Diagnose wizard (item 1)** — the flagship Pro feature returns fabricated static causes/percentages.
  Awaiting the diagnosis-requirements doc before any change.
- **Salt/Bromine (item 3)** — onboarding says the sanitiser "changes the chemistry advice" and the
  marketing FAQ / App Store description promise "chlorine or salt", but only chlorine is supported.

These are recorded so the claims and the features are reconciled before submitting for review.
