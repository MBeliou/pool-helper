# Guidance Engine — Build Spec v0.2

The deterministic pipeline that turns a logged test + pool config into a single,
reasoned next action. No ML. One knowledge file + pure functions.

> **Status: source of truth.** Every chemistry figure below is traced to a reference in
> §10. Values are cross-checked but not infallible — when a constant changes, update it
> in the table *and* its §10 provenance row, and re-run the §8 snapshot tests. Superscript
> tags like `[S1]` point to the source list in §10.

> ⚠️ **Dosing-safety note (read first).** The *structure* in this spec is solid and
> codeable as-is. The numeric **dosing constants and chemistry coefficients are
> PLACEHOLDERS** marked `⚠CALIBRATE`. Before shipping any "add X" advice, replace them
> with values from an authoritative dosing reference (or the product label) and lock
> them with the snapshot tests in §8. The pH/acid case is nonlinear — do **not** ship a
> naive linear formula for it (see §7).

---

## 1. Conventions

- Volume in **liters (L)**. Concentrations in **ppm = mg/L**. Temp in **°C**.
- Alkalinity (TA) and calcium hardness (CH) expressed **as CaCO₃**.
- All engine functions are **pure**: `(readings, config) → guidance`. No I/O, no state.
- Every "add" output is an **increment** ("add ~half, wait, retest"), never a one-shot dump.

---

## 2. Parameter model

Declarative entry per parameter. This is data, not code — adding a parameter later is an
entry, not a rewrite.

```jsonc
{
  "id": "FC",
  "label": "Free Chlorine",
  "unit": "ppm",
  "deriveTarget": "fcFromCya",      // fn name; static band if null
  "safeBounds": [0, 0.40],          // as fraction-of-CYA for FC; absolute for others
  "movedBy": [                      // chemicals that change it
    { "chem": "liquid_chlorine", "dir": "+" },
    { "chem": "trichlor",        "dir": "+", "sideEffects": ["pH-","CYA+"] },
    { "chem": "cal_hypo",        "dir": "+", "sideEffects": ["CH+","pH+"] }
  ],
  "raisableOnly": false,            // true ⇒ "too high" action is dilution/drain
  "requiredFor": ["sanitation"]
}
```

| id   | label              | target source        | typical band            | raisable-only | notes |
|------|--------------------|----------------------|-------------------------|---------------|-------|
| CYA  | Stabilizer         | `cyaFromSanitizer`   | 30–50 liquid / 70–80 SWG `[S1][S6]` | **yes** | removable only by dilution |
| FC   | Free Chlorine      | `fcFromCya`          | f(CYA) — see §3 `[S1]`  | no            | the keystone derivation |
| pH   | pH                 | static               | 7.2–7.8 (aim 7.4–7.6)   | no            | acid down / aeration up |
| TA   | Total Alkalinity   | `taFromSanitizer`    | 60–90 (TFP) / 60–80 SWG `[S2]` | no    | the pH buffer; industry uses 80–120 `[S4]` |
| CH   | Calcium Hardness   | `chFromSurface`+LSI  | LSI-governed, not fixed — see §4 `[S4][S5]` | **yes** | drives LSI |
| TEMP | Water Temp         | n/a (input)          | —                       | n/a           | needed for LSI |
| LSI  | Saturation Index   | `lsi` (derived)      | −0.3 … +0.3 (aim ~0)    | n/a           | corrosive < −0.3, scaling > +0.3 |

---

## 3. Keystone derivation: FC from CYA

The single most important rule, and the one PoolMath's static "1.0–3.0" gets wrong.
Free chlorine must scale with stabilizer. Approximate TFP relationship:

```
minFC    ≈ 0.075 × CYA      // below this, water is under-sanitized
targetFC ≈ 0.115 × CYA      // maintenance target (manual chlorine)
shockFC  ≈ 0.40  × CYA      // SLAM / algae level
// SWG pools run leaner: minFC ≈ 0.045×CYA, targetFC ≈ 0.05×CYA
```

| CYA | min FC | target FC | shock FC |  ← `⚠CALIBRATE` against the official FC/CYA chart
|-----|--------|-----------|----------|
| 30  | ~2     | ~3–4      | ~12      |
| 40  | ~3     | ~5        | ~16      |
| 50  | ~4     | ~6        | ~20      |
| 70  | ~5     | ~8        | ~28      |
| 80  | ~6     | ~9        | ~31      |

**Edge case CYA = 0:** there is no meaningful FC target — chlorine is destroyed by UV
within hours. The engine must NOT report "FC ok"; it must report "FC cannot hold until
CYA is set" and route CYA as the root cause. (This is exactly the screenshot case → Test 1.)

---

## 4. Other derivations

- **`cyaFromSanitizer`** → liquid chlorine: 30–50; SWG: 70–80; indoor/low-sun: 20–30. `[S1][S6]`
- **`taFromSanitizer`** → manual: 60–90 (TFP); SWG: 60–80 (lower TA tempers SWG's pH rise). The broader pool industry cites 80–120; this spec follows TFP's tighter range. `[S2][S4]`
- **`chFromSurface`** → **sources disagree on absolute bands** (TFP runs higher for plaster; SwimUniversity cites ~200–275 plaster / 175–225 vinyl-fiberglass `[S5]`). Do **not** hard-code a band: pick a surface-appropriate starting target, then let LSI govern the final acceptable CH. Calcium protects plaster, so plaster tolerates/needs more. `[S4][S5]`
- **`lsi` (Langelier)** — derived diagnostic, never user-set. Standard Langelier form `[S7]`:

```
pHs = (9.3 + A + B) − (C + D)
A   = (log10(TDS) − 1) / 10                 // TDS≈salt+~1000; default 500 if unknown
B   = −13.12 × log10(°C + 273) + 34.55
C   = log10(CH_as_CaCO3) − 0.4
D   = log10(carbonate_alkalinity)
LSI = pH − pHs
```

> **Upgrade (recommended, not MVP): use CSI, not raw LSI.** TFP and Orenda prefer the
> **Calcite Saturation Index** (Wojtowicz's pool-specific revision of Langelier) `[S8]`.
> Langelier's own successor at UC Berkeley argued the index has no significance for open
> bodies of water like pools; Wojtowicz's corrected version is what the pool world actually
> trusts. LSI is fine to ship for v1; treat CSI as the accuracy upgrade. `[S8]`
>
> **Refinement (v1.1):** `carbonate_alkalinity = TA − cyaCorrection(CYA, pH)`. CYA inflates
> measured TA; at ~pH 7.5 it contributes roughly `CYA × 0.33`. MVP may use raw TA and flag
> reduced accuracy rather than hide it. `[S8]`

**Interpretation** `[S7]`: `LSI < −0.3` corrosive (etches plaster, attacks metal) ·
`−0.3…+0.3` balanced · `> +0.3` scaling (cloudy, scale on equipment).

---

## 5. Dependency graph

Two edge types. The sequencer (§6) topologically respects **ordering** edges; the
root-cause resolver walks **perturbation** edges.

**Ordering edges** (`X ⟹ Y` = "set X before Y's target is meaningful"):
```
sanitizer_type ⟹ CYA_target
surface_type   ⟹ CH_target
CYA            ⟹ FC            // ← the keystone
{pH, TA, CH, TEMP} ⟹ LSI
```

**Perturbation edges** (`X →(chem) Y` = "adjusting X also moves Y"). Quantified
side-effects per 10 ppm FC added are from TFP `[S3]`:
```
pH↓  (acid)        → TA↓
pH↑  (soda ash)    → TA↑ (slight)
TA↑  (baking soda) → pH↑ (slight)
pH↑  (aeration)    → TA·  (raises pH, no chemical)
FC↑  (trichlor)    → pH↓, CYA↑  (+6 ppm CYA per +10 ppm FC)   [S3]
FC↑  (dichlor)     → CYA↑        (+9 ppm CYA per +10 ppm FC)   [S3]
FC↑  (cal-hypo)    → CH↑, pH↑    (+7 ppm CH  per +10 ppm FC)   [S3]
FC↑  (SWG, over time) → pH↑
```

---

## 6. Sequence priority

Emit only the action(s) safe to do **now**; defer anything a current fix will perturb,
with "…after you retest." Never emit two actions that fight in one pass.

```
0. SAFETY     FC < minFC(CYA)  → under-sanitized: raise FC now (SLAM if algae)
1. CYA        to target  (gates the FC target; raisable-only → drain if too high)
2. pH         into safe band 7.2–7.8 first (extreme pH distorts everything)
3. TA         to target  (stabilizes pH)
4. CH / LSI   bring LSI into −0.3…+0.3
5. FC         fine-tune to derived targetFC
```

**Retest-gating example:** if both pH and TA are off, issue the acid step (which moves
both), then `WAIT_RETEST` before re-evaluating — do not also issue a TA step in the same pass.

---

## 7. Dosing model

General skeleton — same shape for every linear chemical:

```
dose = (volume_L / 10000) × (delta_ppm / step_ppm) × gramsOrMl_per_10kL_per_step
delta_ppm = clamp(target − current, 0, maxSafeStep)   // incremental
```

Constants below are sourced central values (converted to metric per 10,000 L), still
marked `⚠CALIBRATE` because real product concentrations vary — store a per-product
constant, don't trust a single rounded number.

| chemical            | raises    | dose per 10,000 L | source |
|---------------------|-----------|-------------------|--------|
| liquid chlorine 12.5% | FC      | ~78 mL → +1 ppm FC `⚠CALIBRATE` | `[S9]` (10 fl oz / 10k gal) |
| cyanuric acid (granular) | CYA  | ~97 g → +10 ppm CYA (slow; sock in skimmer) `⚠CALIBRATE` | `[S10][S9]` (13 oz / 10k gal) |
| sodium bicarbonate  | TA        | ~180 g → +10 ppm TA `⚠CALIBRATE` | `[S11][S5]` (1.5 lb / 10k gal) |
| calcium chloride (dihydrate) | CH | ~137 g → +10 ppm CH `⚠CALIBRATE` | `[S9]` (1.84 oz/1 ppm / 10k gal) |

> **pH / acid is NOT linear.** pH sits on the carbonate buffer, so acid demand depends on
> current pH, TA, *and* target. Do **not** use the skeleton above for pH. Use a buffer-aware
> acid calculation (or a vetted pH×TA lookup table) and always advise: add the smaller of
> the estimate, wait a few hours, retest. Treat this as a §4-style rabbit hole: settle the
> method before building the UI.

`maxSafeStep` caps per-dose change (e.g. pH ≤ 0.3/dose, FC ≤ shock level) so the engine
can never instruct a dangerous single addition.

---

## 8. Snapshot tests

Pure-function tests pin behavior so dosing advice is safe to ship. Three canonical cases:

### Test 1 — the screenshot (CYA = 0)
```
config:   { volume: 30000, sanitizer: liquid_chlorine, surface: plaster }
readings: { FC: 3.0, pH: 7.2, TA: 80, CYA: 0, CH: 100, TEMP: null }
expect:
  rootCause:        "CYA"
  primaryAction:    add cyanuric acid → ~1.2 kg to reach ~40 ppm
  fcVerdict:        "looks fine but WON'T HOLD — UV destroys it with CYA at 0"
  deferred:         ["FC target undefined until CYA set"]
  requestInput:     ["TEMP — needed for scaling/LSI check"]
  doesNotSay:       "FC ok"          // the failure mode we're beating
```

### Test 2 — high TA dragging pH up
```
config:   { volume: 50000, sanitizer: liquid_chlorine, surface: plaster }
readings: { FC: 5, pH: 8.0, TA: 180, CYA: 40, CH: 300, TEMP: 28 }
expect:
  rootCause:        "TA"            // not "pH" — treat the cause
  primaryAction:    add muriatic acid toward pH 7.4 (also lowers TA — desired)
  sideEffectShown:  "acid lowers TA"
  guidance:         "high TA means expect to repeat; do NOT add base; retest in hours"
  singleActionOnly: true           // no simultaneous TA step
```

### Test 3 — corrosive water (LSI)
```
config:   { volume: 40000, sanitizer: liquid_chlorine, surface: plaster }
readings: { FC: 5, pH: 7.2, TA: 60, CYA: 40, CH: 150, TEMP: 30 }
compute:  LSI ≈ −0.72        // corrosive (< −0.3)
expect:
  diagnosis:        "water is corrosive — will etch plaster & attack equipment"
  rootCause:        "CH" (low calcium for a plaster surface)
  primaryAction:    add calcium chloride → raise CH toward ~300–350
  note:             "recompute LSI after; may also need small pH/TA nudge to reach band"
  retest:           true
```

---

## 9. Build order (smallest first)

1. Parameter model + `fcFromCya` + diagnose (low/ok/high vs derived target). → already beats the incumbents.
2. Root-cause resolver for the 3 keystone linkages (CYA→FC, TA→pH, LSI drivers).
3. Sequencer + retest-gating.
4. Dosing skeleton with `⚠CALIBRATE` constants behind the snapshot tests.
5. LSI (raw TA first; CYA-correction later).

Everything else from the brainstorm (prediction, weather, filtration) layers on top of this
spine without touching it.

---

## 10. Sources & provenance

Every chemistry figure in this spec traces to one of these. When you change a constant,
update its table entry **and** the note here, then re-run §8.

| tag | claim it backs | reference |
|-----|----------------|-----------|
| S1 | FC/CYA relationship; 5–40% safe ratio; 7.5% min / 40% SLAM; "1–3 ppm is wrong"; CYA 30–60 liquid / 70–80 SWG | TroubleFreePool — *CYA Chlorine Relationship* & *Free Chlorine* wikis, troublefreepool.com/wiki |
| S2 | TA target 60–90 (TFP) | TFP — *Pool Chemical Levels: Industry vs TFP*, troublefreepool.com/blog (2025-12-21) |
| S3 | Side-effect constants: trichlor +6 CYA, dichlor +9 CYA, cal-hypo +7 CH (per +10 FC) | TFP — *Free Chlorine* wiki |
| S4 | Industry TA 80–120; adjustment order TA→pH→Cl→CH | thepoolnerd.com / completecalculators.com pool dosing guides |
| S5 | CH bands by surface (~200–275 plaster / 175–225 vinyl-fiberglass); baking-soda dose | swimuniversity.com — *How Much of Each Chemical* |
| S6 | CYA 30–50 chlorine / 60–80 SWG; UV destroys ~90% FC/day without CYA | iopool.com — *How to Balance CYA* |
| S7 | Langelier pHs formula (A,B,C,D terms); −0.3…+0.3 band | standard LSI (US Patent 8,721,898 formulation); aquachek.com; poolchemicalcalculator.com |
| S8 | CSI preferred over LSI for pools; Wojtowicz revision; CYA/cyanurate correction; Langelier-successor caveat | TFP — *CSI and LSI* wiki; blog.orendatech.com; saturationindex.net |
| S9 | Dosing: liquid chlorine 12.5% (~10 fl oz/10k gal/ppm); calcium chloride (~1.84 oz/10k gal/ppm); cal-hypo/dichlor rates | thepoolnerd.com — *Pool Chemical Calculator* |
| S10 | CYA dose ~13 oz / 10k gal / +10 ppm | swimuniversity.com; benchmarkpoolsupply.com |
| S11 | Baking soda ~1.5 lb / 10k gal / +10 ppm TA | poolchemcalculators.com — *Alkalinity Calculator* |

**Authoritative primaries to calibrate against before shipping dosing:** the official
**PoolMath app / FC-CYA tool** (TFP) for FC/CYA and dosing, and a **CSI calculator**
(Orenda / saturationindex.net) for water balance. Treat store-blog calculators (S4, S5,
S9–S11) as corroboration, not gospel — they mutually agree to ~±15%, which is why the
dosing constants stay `⚠CALIBRATE`.

**Known source disagreements (decide, don't average):**
- **TA target:** TFP 60–90 vs industry 80–120. Spec follows TFP.
- **CH band:** varies by source and surface; spec defers to LSI/CSI rather than a fixed band.
- **Water-balance index:** raw LSI (shipped) vs CSI (recommended upgrade).