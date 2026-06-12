# Dosing basis — audit trail & recalibration procedure

All dose math lives in `src/lib/pool/dosing.ts` as **one canonical computation**: inputs are
normalized to mg/L (ppm), pH, and litres at the boundaries; every constant is an entry in the
exported `DOSING_BASIS` table carrying its derivation/source and the reference points it was
checked against. The regression tests in `src/lib/pool/dosing.spec.ts` pin each constant.

## Recalibration procedure

1. Change the constant's `value` in `DOSING_BASIS` and update its `source`/`referencePoints`.
2. Run `pnpm vitest --run --project server` — the pinned regression test fails, forcing the
   matching expectation update (this is intentional: no silent drift).
3. Update this document.

## Constants

| Constant                        | Value                                                          | Confidence        | Source                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cal-Hypo strength               | 0.65                                                           | stoichiometric    | 1 ppm FC = 1 mg/L available chlorine (definitional) ÷ label strength                                                                                                                                                                                                                                                                                        |
| Dichlor strength                | 0.56                                                           | stoichiometric    | label strength; side effect: +≈0.9 ppm CYA per ppm FC                                                                                                                                                                                                                                                                                                       |
| Liquid chlorine 12.5%           | 8 mL/ppm/m³                                                    | stoichiometric    | trade % w/v = 125 g available Cl per litre                                                                                                                                                                                                                                                                                                                  |
| Baking soda (TA)                | 1.68 g/ppm/m³                                                  | stoichiometric    | Skinner & Hales, _Dosages for Adjusting Alkalinity_, JSPSI 1(1) 1995 — divisor 71,425; molar 2×84.0077/100.09. Chart check: 1.40 lbs per 10 ppm per 10,000 gal                                                                                                                                                                                              |
| Calcium chloride dihydrate (CH) | 1.47 g/ppm/m³                                                  | stoichiometric    | molar 147.01/100.09; CPO sample problem confirms the anhydrous figure (1.08 measured vs 1.11 molar)                                                                                                                                                                                                                                                         |
| Cyanuric acid (CYA)             | 1.0 g/ppm/m³                                                   | stoichiometric    | definitional (1 ppm = 1 mg/L of CYA itself)                                                                                                                                                                                                                                                                                                                 |
| Dry acid pH-down                | 5.0 g per 0.1 pH per m³ @ TA 100, ×(TA/100), TA clamped 50–180 | **approximation** | pH/acid demand is a carbonate-curve property; JSPSI 1995 explicitly cautions pH charts are rough below TA≈100. Published charts span ≈4.5 (pool-calculator convention) to 7.2 (thepoolnerd: 2 lb 6.4 oz per 0.4 pH per 10,000 gal) g/0.1pH/m³ — our value sits mid-window: 757 g for 7.8→7.4 @ TA 100 in 10,000 gal (window 600–1,100 g, asserted in tests) |
| Muriatic 31.45% ⇄ dry acid      | 0.785 mL/g                                                     | stoichiometric    | JSPSI alkalinity divisors: muriatic 125,000 (quarts) vs bisulfate 47,058 (lbs) → 2.00 mL vs 2.547 g per ppm TA per m³                                                                                                                                                                                                                                       |
| Soda ash pH-up                  | 2.25 g per 0.1 pH per m³ @ TA 100, ×(TA/100), same clamp       | **approximation** | two charts agree exactly: swimuniversity (6 oz / 0.2 pH / 10k gal) and thepoolnerd (12 oz / 7.0→7.4 / 10k gal)                                                                                                                                                                                                                                              |

## Known limitations (candidates for the resolution pipeline)

- pH dosing is a linearized approximation of the carbonate buffer curve. A proper model
  (acid demand from TA + pH + borates, e.g. PoolMath's approach) should replace the
  `×(TA/100)` scaling; the seam is `computeDose()`'s `'ph'` branch.
- Doses assume instant, complete mixing and label-accurate product strength (JSPSI notes
  bisulfate products range 88–95%).
- No single-application maximums are enforced yet (e.g. soda ash cloudiness threshold
  ~1.8 kg per 40 m³ per application) — worth adding when the pipeline schedules multi-day plans.

## Sources

- Skinner, K. & Hales, J.Q., "Dosages for Adjusting Alkalinity", _Journal of the Swimming Pool
  and Spa Industry_ 1(1), 1995 — https://cpo.training/wp-content/uploads/2022/03/ob_jspsi_v1n1_14-20_dosages.pdf
- Pool Operation Management, CPO sample problems — https://pooloperationmanagement.com/cpo/sample-problems/chemical-adjustments/
- The Pool Nerd pH calculator — https://www.thepoolnerd.com/pool-ph-calculator
- Swim University, soda ash guide — https://www.swimuniversity.com/soda-ash-pool/
