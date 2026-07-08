# Guidance Engine — Implementation Notes & Deviations

What shipped differs from `pool-guidance-engine-spec.md` (and from the initial
implementation plan) in the places below, each with the reason. The engine lives in
`apps/app/src/lib/pool/guidance/` (`targets.ts`, `saturationIndex.ts`, `engine.ts`),
pinned by the spec §8 snapshot tests in `engine.spec.ts`.

## Deviations from the spec

1. **Dosing constants: kept the app's `DOSING_BASIS`, not the spec §7 table.**
   The spec's §7 numbers are explicitly `⚠CALIBRATE` placeholders. The app already had
   calibrated, provenance-tracked constants (`dosing.ts` + `docs/dosing-basis.md`,
   regression-tested) that agree with the spec's reference window. The engine therefore
   only decides _what to change and by how much_; `dosing.ts` stays the single dose
   computation. The spec's pH-nonlinearity warning is honoured by the existing TA-scaled
   acid model (JSPSI-derived), not a naive linear formula.

2. **Saturation index ships WITH the CYA correction (spec marks it v1.1).**
   `carbonate_alkalinity = TA − CYA/3` is a three-line change the spec itself calls more
   accurate, so it ships now instead of "raw TA + accuracy flag". Consequence: spec test 3
   computes ≈ **−0.82** instead of the raw-TA **−0.72**; the snapshot test pins the
   corrosive verdict and range, plus a separate raw-TA check against the spec's worked
   example. CSI remains the future accuracy upgrade.

3. **pH per-dose step is 0.6, not the spec's 0.3 example.** 0.3 from pH 8.2 wouldn't even
   reach the band edge, guaranteeing a frustrating three-round fix for a common reading.
   0.6 still forces incremental dosing (waitNote: retest before redosing) while letting
   pH 8.0 → 7.5 happen in one pass, matching spec test 2's own expectation ("toward 7.4").

4. **TDS default for the saturation index: 4,200 ppm for SWG pools, 500 otherwise.**
   The spec says "default 500 if unknown", but an SWG pool is _known_ to carry ~3,200 ppm
   salt (+ ~1,000 base TDS) — using 500 there would be wrong by construction.

5. **Sequencer conflict rule, made concrete.** Spec §5–6 describe edges informally. The
   implemented rule: a candidate is deferred when an already-emitted action moves either
   (a) the candidate's own parameter, or (b) any reading in the candidate's `dependsOn`
   set. Safety-FC (priority 0) always sorts first. This reproduces every spec example
   (acid defers TA; CYA raise defers the FC fine-tune; pH movement defers saturation work)
   while still allowing independent same-day actions (CYA + safety chlorine).

6. **Absolute FC safety floor (1 ppm) when the FC target is undefined.** Spec §3 says
   "no meaningful FC target at CYA 0" — but taken literally that would let FC 0.2 with an
   unknown/zero CYA pass without a safety action (minFC(0) = 0). Rule 0's intent wins:
   below 1 ppm the engine emits "Raise chlorine now" toward a static 3 ppm regardless of
   CYA, while still refusing to bless a decent-looking FC at CYA 0 (won't-hold verdict).
   Caught by the pre-existing e2e (`log.e2e.ts` logs FC 0.2 alone).

## Extensions beyond the spec (user decisions during build)

6. **Full bromine support** (user chose over a limited fallback). Bromine pools get:
   total-bromine band 3–5 ppm (target 4, safety floor 2, shock cap 10), no CYA coupling
   (CYA neither protects bromine nor gets a target — informational only), and a BCDMH
   dosing product at 66% available bromine (stoichiometric: Br₂-equivalent 159.8/241.5;
   labels state 61–68%). The tests table's `free_chlorine` column stores total bromine for
   bromine pools — same math, relabelled everywhere via `sanitizerLevelLabel`.
   Sources: TFP "How to Maintain a Bromine Pool" (3–5 ppm), ANSI/APSP-11 (2–8 ppm),
   envirotech/commodity BCDMH data sheets. Chlorine shock products are hidden from
   bromine pools (`sanitisers` filter in the dosing catalogue) and vice versa.

7. **Location (Outdoor/Indoor) + Sun exposure (Full/Partial/Mostly shaded) profile
   fields** (user asked for more precision than the spec's "indoor/low-sun" note).
   Migration `0009_pool_location_sun_exposure`. CYA bands extended accordingly:
   - chlorine outdoor full/partial: 30–50 · outdoor shaded: 20–30 · indoor: 0–30
     (indoor pools _need_ no CYA; only flagged when high)
   - SWG outdoor: 70–80 · SWG shaded: 40–60 · SWG indoor: 0–30
     The shaded/indoor SWG values are our interpolation (spec/TFP only cover outdoor);
     marked here as the calibration point to revisit.

8. **Indoor static FC band.** The spec's "CYA=0 ⇒ no FC target / won't hold" verdict
   assumes UV. An indoor pool at CYA 0 is correct, not broken — it gets a static band
   (min 1 / target 3 / high 4) instead of the won't-hold verdict.

9. **Missing readings degrade gracefully** (user requirement). Untested parameters get
   `not-tested` verdicts (never "ok"); the engine emits `requestInput` asks: FC/bromine
   when absent (with a free-vs-total-chlorine caution — strips show both), CYA when the
   sanitiser target can't be derived, temperature when the saturation check is blocked.
   Total chlorine / combined chlorine tracking is a post-v1 item (needs a new column and
   a shock rule: CC > 0.5 ⇒ oxidise).

## User-visible behaviour changes vs the old app

10. **TA ideal band is now 60–90 (TFP), was 80–120 (industry).** Spec's explicit
    decision ("decide, don't average"). SWG pools: 60–80.
11. **FC gauge band is derived from CYA** (was static 2–4), CYA band from sanitiser+sun
    (was static 30–50), CH band from surface (was static 200–400), pH band 7.2–7.8
    (was 7.2–7.6). Home gauges, trends and the fix plan all read the same derivation
    (`guidance/displayBands.ts`), so they can no longer disagree.
12. **Fix plan is sequenced.** "Grab everything in one trip" copy removed (user decision).
    The screen now shows: red notices (e.g. "FC won't hold with CYA at 0"), the actions
    safe to do now (each expandable with the root-cause _why_ and a wait-then-retest
    note), an "After you retest" list with the reason each item is gated, and
    "next test" input requests.
13. **Raisable-only parameters get dilution advice** (CYA/CH too high → "drain & refill
    ~N%"), and high-CH-but-balanced-LSI is reported as "watch it", not an action —
    CH acceptability is LSI-governed per spec §4.
14. **pH-raise strategy is TA-aware**: soda ash normally, aeration-only when TA is high
    (soda ash would push TA further up); TA-high with pH in band gets the acid+aeration
    cycle guidance instead of a fake "TA remover" dose.
