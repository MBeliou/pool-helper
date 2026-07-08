// ──────────────────────────────────────────────────────────────────────
// Dosing chemistry — ONE canonical computation.
//
// Everything entering this module is already canonical:
//   concentrations in mg/L (= ppm, CaCO₃-equivalent for TA/CH),
//   pH unitless, volume in LITRES. Output is grams (solids) or
//   millilitres (liquids). Unit conversion happens only at the
//   boundaries (chemistry.testValue / units.LITRES_PER_VOLUME_UNIT).
//
// Every constant lives in DOSING_BASIS with its derivation or cited
// reference points — no magic numbers below. To recalibrate: change the
// basis entry, update its reference points, and the regression tests in
// dosing.spec.ts will force the change to be intentional.
// See docs/dosing-basis.md for the full audit trail.
// ──────────────────────────────────────────────────────────────────────
import type { ParameterKey } from './chemistry';

export type BasisConfidence = 'stoichiometric' | 'approximation';

export interface BasisEntry {
	/** the number used in computation (meaning documents its unit) */
	value: number;
	meaning: string;
	basis: BasisConfidence;
	source: string;
	referencePoints: string[];
}

export const DOSING_BASIS = {
	calHypoStrength: {
		value: 0.65,
		meaning: 'available chlorine fraction of calcium hypochlorite product',
		basis: 'stoichiometric',
		source: 'product labelling standard; 1 ppm FC = 1 mg/L available chlorine by definition',
		referencePoints: ['PoolMath-style check: +4 ppm in 37,854 L → 4×37,854/1000/0.65 ≈ 233 g']
	},
	dichlorStrength: {
		value: 0.56,
		meaning: 'available chlorine fraction of dichlor granules',
		basis: 'stoichiometric',
		source: 'product labelling standard (sodium dichloro-s-triazinetrione dihydrate)',
		referencePoints: ['+4 ppm in 37,854 L → ≈ 270 g; raises CYA ≈ 0.9 ppm per 1 ppm FC']
	},
	bcdmhAvailableBromine: {
		value: 0.66,
		meaning: 'available bromine (as Br₂) fraction of BCDMH granules/tablets',
		basis: 'stoichiometric',
		source:
			'1-bromo-3-chloro-5,5-dimethylhydantoin MW 241.47 yields one Br₂ equivalent (HOBr + HOCl regenerating HOBr from the bromide bank) → 159.8/241.5 ≈ 0.66; labels state 61–68%',
		referencePoints: [
			'envirotech BCDMH data sheet: ≥61% available bromine',
			'commodity BCDMH tablets: ≥68% available bromine',
			'+2 ppm Br in 30,000 L → 2×30/0.66 ≈ 91 g'
		]
	},
	liquidChlorineMlPerPpmPerM3: {
		value: 8,
		meaning: 'mL of 12.5% w/v liquid chlorine per 1 ppm FC per m³ (125 g/L available Cl)',
		basis: 'stoichiometric',
		source: 'trade-percent definition: 12.5 % w/v = 125 g available chlorine per litre',
		referencePoints: ['+4 ppm in 37,854 L → 8×4×37.854 ≈ 1,211 mL ≈ 1.21 L']
	},
	bakingSodaGramsPerPpmPerM3: {
		value: 1.68,
		meaning: 'g NaHCO₃ per 1 ppm TA (as CaCO₃) per m³',
		basis: 'stoichiometric',
		source:
			'Skinner & Hales, "Dosages for Adjusting Alkalinity", JSPSI 1(1) 1995 — divisor 71,425 (lbs per gal per ppm); molar 2×84.0077/100.09',
		referencePoints: ['JSPSI chart: +10 ppm in 10,000 gal = 1.40 lbs (635 g) → 1.678 g/m³/ppm']
	},
	calciumChlorideDihydrateGramsPerPpmPerM3: {
		value: 1.47,
		meaning: 'g CaCl₂·2H₂O (≈77% products) per 1 ppm CH (as CaCO₃) per m³',
		basis: 'stoichiometric',
		source: 'molar mass 147.01 / CaCO₃-equivalent 100.09',
		referencePoints: [
			'CPO sample problem (anhydrous): 40.5 lbs / 25,000 gal / 180 ppm → 1.08 g/m³/ppm ≈ molar 1.11; dihydrate = ×147/111'
		]
	},
	cyanuricAcidGramsPerPpmPerM3: {
		value: 1.0,
		meaning: 'g cyanuric acid per 1 ppm CYA per m³',
		basis: 'stoichiometric',
		source: 'definitional: 1 ppm = 1 mg/L of the measured substance itself',
		referencePoints: ['+30 ppm in 37,854 L → ≈ 1.14 kg']
	},
	dryAcidGramsPerTenthPhPerM3: {
		value: 5.0,
		meaning: 'g sodium bisulfate (~93%) per 0.1 pH decrease per m³, at TA 100 (scaled by TA/100)',
		basis: 'approximation',
		source:
			'pH/acid-demand is a carbonate-curve property (JSPSI 1995 cautions charts are rough below TA≈100). Constant pinned mid-window of published charts.',
		referencePoints: [
			'thepoolnerd.com pH calculator: 7.8→7.4 per 10,000 gal = 2 lb 6.4 oz (1,089 g) → 7.2 g/0.1pH/m³ (TA unstated, high end)',
			'legacy pool-calculator convention ≈ 4.5 g/0.1pH/m³ at TA 100–120',
			'our value: 7.8→7.4 @ TA 100, 37,854 L → 757 g (inside 600–1,100 g reference window)'
		]
	},
	muriaticMlPerDryAcidGram: {
		value: 0.785,
		meaning: 'mL muriatic acid 31.45% (sg 1.16) equivalent to 1 g sodium bisulfate ~93%',
		basis: 'stoichiometric',
		source:
			'JSPSI 1995 alkalinity divisors: muriatic 2.00 mL/ppm-TA/m³ vs bisulfate 2.547 g/ppm-TA/m³ → 0.785 mL/g',
		referencePoints: ['thepoolnerd pH chart implies 757 mL / 1,089 g ≈ 0.70 (same order)']
	},
	sodaAshGramsPerTenthPhPerM3: {
		value: 2.25,
		meaning: 'g Na₂CO₃ per 0.1 pH increase per m³, at TA 100 (scaled by TA/100)',
		basis: 'approximation',
		source: 'two independent charts agree exactly at this value',
		referencePoints: [
			'swimuniversity.com: 6 oz per 10,000 gal raises pH 0.2 → 2.25 g/0.1pH/m³',
			'thepoolnerd.com: 12 oz per 10,000 gal raises pH 7.0→7.4 → 2.25 g/0.1pH/m³'
		]
	}
} as const satisfies Record<string, BasisEntry>;

// TA scaling window for pH doses: below ~50 ppm the carbonate buffer is so
// weak that chart maths overshoots badly (JSPSI's caution); above ~180 we cap
// rather than extrapolate.
const PH_DOSE_TA_ANCHOR = 100;
const PH_DOSE_TA_MIN = 50;
const PH_DOSE_TA_MAX = 180;

export type DoseUnit = 'g' | 'mL';

export interface DosingProduct {
	name: string;
	parameter: ParameterKey;
	direction: 'raise' | 'lower';
	unit: DoseUnit;
	/** line shown in the dosing-math panel, e.g. '÷ 65% available chlorine' */
	basisLabel: string;
	disabledReason?: string;
	/** side effect worth surfacing next to the dose */
	sideEffectNote?: string;
	/**
	 * sanitiser systems this product belongs to ('chlorine' | 'swg' | 'bromine');
	 * undefined = any. Keeps chlorine shock out of bromine pools and vice versa.
	 */
	sanitisers?: readonly string[];
}

export const DOSING_PRODUCTS = {
	calHypo: {
		name: 'Cal-Hypo 65%',
		parameter: 'fc',
		direction: 'raise',
		unit: 'g',
		basisLabel: '÷ 65% available chlorine',
		sideEffectNote: 'also raises CH ≈ 0.7 ppm per 1 ppm FC',
		sanitisers: ['chlorine', 'swg']
	},
	liquidChlorine: {
		name: 'Liquid chlorine 12.5%',
		parameter: 'fc',
		direction: 'raise',
		unit: 'mL',
		basisLabel: '125 g chlorine per litre',
		sanitisers: ['chlorine', 'swg']
	},
	dichlor: {
		name: 'Dichlor 56%',
		parameter: 'fc',
		direction: 'raise',
		unit: 'g',
		basisLabel: '÷ 56% available chlorine',
		sideEffectNote: 'also raises CYA ≈ 0.9 ppm per 1 ppm FC',
		sanitisers: ['chlorine', 'swg']
	},
	trichlorTabs: {
		name: 'Trichlor tabs',
		parameter: 'fc',
		direction: 'raise',
		unit: 'g',
		basisLabel: '',
		disabledReason: 'not for shock',
		sanitisers: ['chlorine', 'swg']
	},
	bcdmh: {
		name: 'Bromine granules (BCDMH)',
		parameter: 'fc',
		direction: 'raise',
		unit: 'g',
		basisLabel: '÷ 66% available bromine',
		sideEffectNote: 'tablets release slowly — granules or a boosted brominator act faster',
		sanitisers: ['bromine']
	},
	bakingSoda: {
		name: 'Baking soda',
		parameter: 'ta',
		direction: 'raise',
		unit: 'g',
		basisLabel: '1.68 g per ppm per m³ (NaHCO₃)'
	},
	calciumChloride: {
		name: 'Calcium chloride 77%',
		parameter: 'ch',
		direction: 'raise',
		unit: 'g',
		basisLabel: '1.47 g per ppm per m³ (dihydrate)'
	},
	cyanuricAcid: {
		name: 'Cyanuric acid',
		parameter: 'cya',
		direction: 'raise',
		unit: 'g',
		basisLabel: '1 g per ppm per m³'
	},
	dryAcid: {
		name: 'Dry acid',
		parameter: 'ph',
		direction: 'lower',
		unit: 'g',
		basisLabel: 'scaled by your alkalinity',
		sideEffectNote: 'also lowers TA slightly'
	},
	muriaticAcid: {
		name: 'Muriatic acid 31.45%',
		parameter: 'ph',
		direction: 'lower',
		unit: 'mL',
		basisLabel: 'scaled by your alkalinity',
		sideEffectNote: 'also lowers TA slightly'
	},
	sodaAsh: {
		name: 'Soda ash',
		parameter: 'ph',
		direction: 'raise',
		unit: 'g',
		basisLabel: 'scaled by your alkalinity',
		sideEffectNote: 'also raises TA'
	}
} as const satisfies Record<string, DosingProduct>;

/**
 * Product options per parameter/direction (first non-disabled = default),
 * filtered to the pool's sanitiser system when the product is system-specific.
 */
export function productsFor(
	parameter: ParameterKey,
	direction: 'raise' | 'lower',
	sanitizer: string = 'chlorine'
): DosingProduct[] {
	const allProducts: DosingProduct[] = Object.values(DOSING_PRODUCTS);
	return allProducts.filter(
		(product) =>
			product.parameter === parameter &&
			product.direction === direction &&
			(product.sanitisers === undefined || product.sanitisers.includes(sanitizer))
	);
}

export interface DoseRequest {
	parameter: ParameterKey;
	/** canonical: ppm, or pH for 'ph' */
	currentValue: number;
	targetValue: number;
	poolVolumeLitres: number;
	/** canonical ppm — required for pH doses (acid/base demand scales with TA) */
	totalAlkalinityPpm?: number;
}

export interface DoseResult {
	product: DosingProduct;
	amount: number;
	unit: DoseUnit;
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

/**
 * The single canonical dose computation. Returns null when the product
 * doesn't apply (wrong parameter/direction, disabled, non-positive delta,
 * or pH dose without an alkalinity reading).
 */
export function computeDose(request: DoseRequest, product: DosingProduct): DoseResult | null {
	if (product.disabledReason) return null;
	if (product.parameter !== request.parameter) return null;

	const delta =
		product.direction === 'raise'
			? request.targetValue - request.currentValue
			: request.currentValue - request.targetValue;
	if (delta <= 0 || request.poolVolumeLitres <= 0) return null;

	const cubicMetres = request.poolVolumeLitres / 1000;

	if (request.parameter === 'ph') {
		if (request.totalAlkalinityPpm === undefined) return null;
		const alkalinityScale =
			clamp(request.totalAlkalinityPpm, PH_DOSE_TA_MIN, PH_DOSE_TA_MAX) / PH_DOSE_TA_ANCHOR;
		const tenthsOfPh = delta / 0.1;
		if (product.direction === 'lower') {
			const dryAcidGrams =
				DOSING_BASIS.dryAcidGramsPerTenthPhPerM3.value * tenthsOfPh * cubicMetres * alkalinityScale;
			if (product.name === DOSING_PRODUCTS.muriaticAcid.name) {
				return {
					product,
					amount: dryAcidGrams * DOSING_BASIS.muriaticMlPerDryAcidGram.value,
					unit: 'mL'
				};
			}
			return { product, amount: dryAcidGrams, unit: 'g' };
		}
		return {
			product,
			amount:
				DOSING_BASIS.sodaAshGramsPerTenthPhPerM3.value * tenthsOfPh * cubicMetres * alkalinityScale,
			unit: 'g'
		};
	}

	if (request.parameter === 'fc') {
		const availableHalogenGrams = delta * cubicMetres; // 1 ppm = 1 g/m³ (FC as Cl₂, or Br as Br₂)
		if (product.name === DOSING_PRODUCTS.liquidChlorine.name) {
			return {
				product,
				amount: DOSING_BASIS.liquidChlorineMlPerPpmPerM3.value * delta * cubicMetres,
				unit: 'mL'
			};
		}
		const strength =
			product.name === DOSING_PRODUCTS.dichlor.name
				? DOSING_BASIS.dichlorStrength.value
				: product.name === DOSING_PRODUCTS.bcdmh.name
					? DOSING_BASIS.bcdmhAvailableBromine.value
					: DOSING_BASIS.calHypoStrength.value;
		return { product, amount: availableHalogenGrams / strength, unit: 'g' };
	}

	const gramsPerPpmPerM3 =
		request.parameter === 'ta'
			? DOSING_BASIS.bakingSodaGramsPerPpmPerM3.value
			: request.parameter === 'ch'
				? DOSING_BASIS.calciumChlorideDihydrateGramsPerPpmPerM3.value
				: DOSING_BASIS.cyanuricAcidGramsPerPpmPerM3.value;
	return { product, amount: gramsPerPpmPerM3 * delta * cubicMetres, unit: 'g' };
}

/** "Add 1.2 kg" / "Add 680 g" / "Add 1.2 L" / "Add 760 mL" */
export function formatDoseAmount(result: DoseResult): string {
	if (result.unit === 'mL') {
		return result.amount >= 1000
			? `Add ${(result.amount / 1000).toFixed(1)} L`
			: `Add ${Math.round(result.amount)} mL`;
	}
	return result.amount >= 1000
		? `Add ${(result.amount / 1000).toFixed(1)} kg`
		: `Add ${Math.round(result.amount)} g`;
}
