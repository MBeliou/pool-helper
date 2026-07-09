// ──────────────────────────────────────────────────────────────────────
// Symptom diagnosis — pure ranking, same conventions as engine.ts.
//
// score(cause) = Σ symptom priors × chemistry evidence × answer boosts
//
//   priors    — how strongly each picked symptom suggests each cause (data)
//   evidence  — what the latest test says, via the guidance engine's verdicts
//               and saturation assessment (a cause contradicted by the test
//               is damped, one confirmed is boosted)
//   boosts    — the user's clarifying answers (data on each option)
//
// Output is RELATIVE likelihood only: bands + bar fractions. No percentages —
// a heuristic must not display a precision it doesn't have.
// ──────────────────────────────────────────────────────────────────────
import type { GuidanceResult, VerdictStatus } from './engine';
import type { SaturationVerdict } from './saturationIndex';

export type SymptomKind = 'cloudy' | 'green' | 'algae' | 'eye' | 'smell' | 'foam';

export interface SymptomOption {
	kind: SymptomKind;
	label: string;
}

export const SYMPTOMS: SymptomOption[] = [
	{ kind: 'cloudy', label: 'Cloudy' },
	{ kind: 'green', label: 'Green tint' },
	{ kind: 'algae', label: 'Algae' },
	{ kind: 'eye', label: 'Eye sting' },
	{ kind: 'smell', label: 'Strong smell' },
	{ kind: 'foam', label: 'Foamy' }
];

export type CauseId =
	| 'low-sanitiser'
	| 'high-ph'
	| 'limescale'
	| 'algae-growth'
	| 'weak-filtration'
	| 'chloramines'
	| 'products-foam'
	| 'metals-in-fill'
	| 'stabiliser-lockup';

interface CauseDefinition {
	id: CauseId;
	title: string;
	/** palette status colour on the cause card */
	statusKey: 'low' | 'high' | 'info';
	/** generic fix line — replaced by the engine's action title when one exists */
	fixSummary: string;
	/** engine parameter whose verdict confirms or contradicts this cause */
	parameter?: 'fc' | 'ph' | 'ta' | 'ch' | 'cya';
	/** verdict-status → score multiplier (unlisted statuses are neutral ×1) */
	verdictEvidence?: Partial<Record<VerdictStatus, number>>;
	/** saturation-verdict → score multiplier */
	saturationEvidence?: Partial<Record<SaturationVerdict, number>>;
}

const CAUSES: CauseDefinition[] = [
	{
		id: 'low-sanitiser',
		title: 'Not enough sanitiser',
		statusKey: 'low',
		fixSummary: 'Raise chlorine/bromine to target',
		parameter: 'fc',
		verdictEvidence: { low: 3, 'wont-hold': 3, ok: 0.4, high: 0.25 }
	},
	{
		id: 'high-ph',
		title: 'pH too high',
		statusKey: 'high',
		fixSummary: 'Bring pH down with acid',
		parameter: 'ph',
		verdictEvidence: { high: 3, ok: 0.4, low: 0.2 }
	},
	{
		id: 'limescale',
		title: 'Limescale forming',
		statusKey: 'high',
		fixSummary: 'Rebalance pH / calcium',
		parameter: 'ch',
		saturationEvidence: { scaling: 3, balanced: 0.4, corrosive: 0.15 }
	},
	{
		id: 'algae-growth',
		title: 'Algae getting started',
		statusKey: 'low',
		fixSummary: 'Shock, brush walls, filter long hours',
		parameter: 'fc',
		verdictEvidence: { low: 2, 'wont-hold': 2, ok: 0.7 }
	},
	{
		id: 'weak-filtration',
		title: 'Not enough filtering',
		statusKey: 'info',
		fixSummary: 'Run the pump 8 h+ and clean the filter'
	},
	{
		id: 'chloramines',
		title: 'Used-up chlorine (chloramines)',
		statusKey: 'high',
		// evidence comes from combined chlorine (total − free) via the engine
		fixSummary: 'Shock to break down chloramines'
	},
	{
		id: 'products-foam',
		title: 'Foaming products or cosmetics',
		statusKey: 'info',
		fixSummary: 'Skim it off, ease up on algaecide, rinse swimwear'
	},
	{
		id: 'metals-in-fill',
		title: 'Metals in the fill water',
		statusKey: 'info',
		fixSummary: 'Metal sequestrant; avoid shocking first'
	},
	{
		id: 'stabiliser-lockup',
		title: 'Too much stabiliser',
		statusKey: 'high',
		fixSummary: 'Dilute — drain & refill part of the water',
		parameter: 'cya',
		verdictEvidence: { high: 3, ok: 0.4, low: 0.2 }
	}
];

const causeById = Object.fromEntries(CAUSES.map((cause) => [cause.id, cause])) as Record<
	CauseId,
	CauseDefinition
>;

/** how strongly each symptom suggests each cause (before evidence/answers) */
const SYMPTOM_PRIORS: Record<SymptomKind, Partial<Record<CauseId, number>>> = {
	cloudy: {
		'low-sanitiser': 2.5,
		'weak-filtration': 2,
		limescale: 1.5,
		'algae-growth': 1,
		'stabiliser-lockup': 0.8
	},
	green: { 'algae-growth': 3, 'low-sanitiser': 2, 'metals-in-fill': 1.5 },
	algae: { 'algae-growth': 3.5, 'low-sanitiser': 2, 'weak-filtration': 1.2 },
	eye: { chloramines: 3, 'high-ph': 2, 'low-sanitiser': 0.8 },
	smell: { chloramines: 3, 'algae-growth': 1.2, 'weak-filtration': 0.8 },
	foam: { 'products-foam': 3, 'weak-filtration': 0.6 }
};

export interface QuestionOption {
	label: string;
	/** multiplies the named causes' scores when this option is picked */
	boosts?: Partial<Record<CauseId, number>>;
}

export interface DiagnosisQuestion {
	id: string;
	prompt: string;
	options: QuestionOption[];
}

const SHOCKED_RECENTLY: DiagnosisQuestion = {
	id: 'shocked-48h',
	prompt: 'Shocked in the last 48 h?',
	options: [
		// post-shock cloudiness is usually dead matter waiting on the filter
		{ label: 'Yes', boosts: { 'weak-filtration': 1.6, 'low-sanitiser': 0.5 } },
		{ label: 'No', boosts: { 'low-sanitiser': 1.3 } },
		{ label: 'Not sure' }
	]
};

const QUESTIONS_BY_SYMPTOM: Record<SymptomKind, DiagnosisQuestion[]> = {
	cloudy: [
		{
			id: 'cloudy-tone',
			prompt: 'Milky-white or hazy-blue?',
			options: [
				{ label: 'Milky white', boosts: { limescale: 1.8, 'weak-filtration': 1.3 } },
				{ label: 'Hazy blue', boosts: { 'low-sanitiser': 1.5, 'algae-growth': 1.2 } }
			]
		},
		SHOCKED_RECENTLY,
		{
			id: 'cloudy-duration',
			prompt: 'How long like this?',
			options: [
				{ label: '< 1 day' },
				{ label: '2–4 days', boosts: { 'weak-filtration': 1.2 } },
				{ label: 'A week +', boosts: { 'weak-filtration': 1.5, limescale: 1.2 } }
			]
		}
	],
	green: [
		{
			id: 'green-clarity',
			prompt: 'Clear-but-green, or murky green?',
			options: [
				// clear green water right after a fill is the classic copper signature
				{ label: 'Clear but green', boosts: { 'metals-in-fill': 2.5, 'algae-growth': 0.5 } },
				{ label: 'Murky green', boosts: { 'algae-growth': 2 } }
			]
		},
		{
			id: 'green-walls',
			prompt: 'Walls or steps feel slippery?',
			options: [{ label: 'Yes', boosts: { 'algae-growth': 2 } }, { label: 'No' }]
		},
		{
			id: 'green-fill',
			prompt: 'Refilled recently, or well water?',
			options: [
				{ label: 'Yes', boosts: { 'metals-in-fill': 2 } },
				{ label: 'No', boosts: { 'metals-in-fill': 0.5 } }
			]
		}
	],
	algae: [
		{
			id: 'algae-where',
			prompt: 'Where do you see it?',
			options: [
				{ label: 'Walls & steps', boosts: { 'algae-growth': 1.5 } },
				{ label: 'Shady corners only', boosts: { 'weak-filtration': 1.5 } },
				{ label: 'Floating in the water', boosts: { 'algae-growth': 1.3, 'weak-filtration': 1.3 } }
			]
		},
		SHOCKED_RECENTLY
	],
	eye: [
		{
			id: 'eye-smell',
			prompt: 'Strong chlorine-like smell too?',
			options: [
				{ label: 'Yes', boosts: { chloramines: 2 } },
				{ label: 'No', boosts: { 'high-ph': 1.5 } }
			]
		},
		{
			id: 'eye-crowd',
			prompt: 'Worse after busy swim days?',
			options: [{ label: 'Yes', boosts: { chloramines: 1.6 } }, { label: 'No' }]
		}
	],
	smell: [
		{
			id: 'smell-kind',
			prompt: 'What does it smell like?',
			options: [
				// the paradox: a strong "chlorine" smell is chloramines, not chlorine
				{ label: 'Strong chlorine', boosts: { chloramines: 2.2 } },
				{ label: 'Musty / earthy', boosts: { 'algae-growth': 1.8 } },
				{ label: 'Stale / rotten', boosts: { 'weak-filtration': 1.4 } }
			]
		}
	],
	foam: [
		{
			id: 'foam-algaecide',
			prompt: 'Added algaecide recently?',
			options: [{ label: 'Yes', boosts: { 'products-foam': 2.2 } }, { label: 'No' }]
		},
		{
			id: 'foam-swimmers',
			prompt: 'Lots of swimmers or sunscreen lately?',
			options: [{ label: 'Yes', boosts: { 'products-foam': 1.8 } }, { label: 'No' }]
		}
	]
};

const MAX_QUESTIONS = 4;

/** union of the picked symptoms' questions, deduped, stable order, capped */
export function questionsForSymptoms(symptoms: SymptomKind[]): DiagnosisQuestion[] {
	const seen = new Set<string>();
	const questions: DiagnosisQuestion[] = [];
	for (const symptom of symptoms) {
		for (const question of QUESTIONS_BY_SYMPTOM[symptom] ?? []) {
			if (seen.has(question.id)) continue;
			seen.add(question.id);
			questions.push(question);
		}
	}
	return questions.slice(0, MAX_QUESTIONS);
}

export interface AnsweredQuestion {
	question: DiagnosisQuestion;
	selectedIndex: number;
}

export type LikelihoodBand = 'Most likely' | 'Possible' | 'Less likely';

export interface RankedCause {
	id: CauseId;
	title: string;
	band: LikelihoodBand;
	/** relative to the top cause, 0..1 — drives the bar width */
	barFraction: number;
	statusKey: 'low' | 'high' | 'info';
	/** "Fix: …" line — the engine's action title when the test backs it */
	fixText: string;
	/** internal relative score ×100 for persistence — never display as a percent */
	internalScore: number;
}

const POSSIBLE_BAND_THRESHOLD = 0.55; // of the top cause's score
const MAX_RANKED_CAUSES = 4;

function evidenceMultiplier(cause: CauseDefinition, guidance: GuidanceResult | null): number {
	if (!guidance) return 1;
	let multiplier = 1;
	if (cause.verdictEvidence && cause.parameter) {
		const verdict = guidance.verdicts.find((entry) => entry.parameter === cause.parameter);
		if (verdict) multiplier *= cause.verdictEvidence[verdict.status] ?? 1;
	}
	if (cause.saturationEvidence && guidance.saturation) {
		multiplier *= cause.saturationEvidence[guidance.saturation.verdict] ?? 1;
	}
	// chloramines are measured directly: combined chlorine = total − free
	if (cause.id === 'chloramines' && guidance.combinedChlorine !== null) {
		multiplier *=
			guidance.combinedChlorine >= 1.0 ? 3 : guidance.combinedChlorine >= 0.5 ? 1.8 : 0.3;
	}
	return multiplier;
}

function fixTextFor(cause: CauseDefinition, guidance: GuidanceResult | null): string {
	if (cause.parameter && guidance) {
		const engineAction = guidance.actions.find((action) => action.parameter === cause.parameter);
		if (engineAction) return engineAction.title;
	}
	return cause.fixSummary;
}

/**
 * Rank causes for the picked symptoms. `guidance` is the engine result for the
 * latest test, or null when there's no usable test (ranking then leans on
 * symptoms + answers alone — see `noTestNote`).
 */
export function rankCauses(
	symptoms: SymptomKind[],
	answers: AnsweredQuestion[],
	guidance: GuidanceResult | null
): RankedCause[] {
	const scores = new Map<CauseId, number>();
	for (const symptom of symptoms) {
		for (const [causeId, weight] of Object.entries(SYMPTOM_PRIORS[symptom] ?? {})) {
			scores.set(causeId as CauseId, (scores.get(causeId as CauseId) ?? 0) + (weight ?? 0));
		}
	}

	for (const [causeId, baseScore] of scores) {
		let score = baseScore * evidenceMultiplier(causeById[causeId], guidance);
		for (const { question, selectedIndex } of answers) {
			const boost = question.options[selectedIndex]?.boosts?.[causeId];
			if (boost !== undefined) score *= boost;
		}
		scores.set(causeId, score);
	}

	const ranked = [...scores.entries()]
		.filter(([, score]) => score > 0)
		.sort(([, first], [, second]) => second - first)
		.slice(0, MAX_RANKED_CAUSES);
	const topScore = ranked[0]?.[1] ?? 1;

	return ranked.map(([causeId, score], rankIndex) => {
		const cause = causeById[causeId];
		const barFraction = score / topScore;
		return {
			id: causeId,
			title: cause.title,
			band:
				rankIndex === 0
					? 'Most likely'
					: barFraction >= POSSIBLE_BAND_THRESHOLD
						? 'Possible'
						: 'Less likely',
			barFraction,
			statusKey: cause.statusKey,
			fixText: fixTextFor(cause, guidance),
			internalScore: Math.round(barFraction * 100)
		};
	});
}

/** shown under the ranking when it ran without a recent test */
export const NO_TEST_NOTE = 'No recent test — log one to sharpen this ranking.';
