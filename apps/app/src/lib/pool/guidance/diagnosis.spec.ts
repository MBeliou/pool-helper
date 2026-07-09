// Pins the symptom-diagnosis ranking: engine evidence must move causes, answers
// must move causes, questions must follow symptoms, and no percentages leak.
import { describe, expect, it } from 'vitest';
import {
	questionsForSymptoms,
	rankCauses,
	type AnsweredQuestion,
	type SymptomKind
} from './diagnosis';
import { runGuidance, type GuidanceReadings } from './engine';
import type { GuidanceConfig } from './targets';

const OUTDOOR_CHLORINE_PLASTER: GuidanceConfig = {
	volumeLitres: 30_000,
	sanitizer: 'chlorine',
	surface: 'plaster',
	location: 'outdoor',
	sunExposure: 'full'
};

function guidanceFor(partial: Partial<GuidanceReadings>) {
	const readings: GuidanceReadings = {
		fc: null,
		ph: null,
		ta: null,
		ch: null,
		cya: null,
		temp: null,
		...partial
	};
	return runGuidance(readings, OUTDOOR_CHLORINE_PLASTER);
}

function defaultAnswers(symptoms: SymptomKind[]): AnsweredQuestion[] {
	return questionsForSymptoms(symptoms).map((question) => ({ question, selectedIndex: 0 }));
}

describe('questionsForSymptoms', () => {
	it('varies by symptom', () => {
		const cloudy = questionsForSymptoms(['cloudy']).map((question) => question.id);
		const green = questionsForSymptoms(['green']).map((question) => question.id);
		expect(cloudy).not.toEqual(green);
		expect(green).toContain('green-clarity');
	});

	it('dedupes shared questions and caps the total', () => {
		const combined = questionsForSymptoms(['cloudy', 'algae', 'green', 'foam']);
		const ids = combined.map((question) => question.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(combined.length).toBeLessThanOrEqual(4);
	});
});

describe('rankCauses — engine evidence', () => {
	it('murky-green water with collapsed chlorine ranks algae/sanitiser trouble on top', () => {
		const guidance = guidanceFor({ fc: 0.2, ph: 7.4, ta: 80, cya: 40, ch: 300, temp: 26 });
		// answers describe the algae presentation: murky green, slippery walls, no fresh fill
		const answers: AnsweredQuestion[] = questionsForSymptoms(['green']).map((question) => ({
			question,
			selectedIndex: question.id === 'green-clarity' ? 1 : question.id === 'green-walls' ? 0 : 1
		}));
		const ranked = rankCauses(['green'], answers, guidance);
		expect(['algae-growth', 'low-sanitiser']).toContain(ranked[0].id);
		expect(ranked[0].band).toBe('Most likely');
	});

	it('cloudy water with scale-forming saturation boosts limescale', () => {
		// pH 8.0 + TA 180 + CH 300 at 28°C is scale-forming (engine test 2 data)
		const scaling = guidanceFor({ fc: 5, ph: 8.0, ta: 180, cya: 40, ch: 300, temp: 28 });
		const balanced = guidanceFor({ fc: 5, ph: 7.4, ta: 80, cya: 40, ch: 300, temp: 26 });
		const answers = defaultAnswers(['cloudy']);
		const withScaling = rankCauses(['cloudy'], answers, scaling);
		const withBalanced = rankCauses(['cloudy'], answers, balanced);
		const scalingRank = withScaling.findIndex((cause) => cause.id === 'limescale');
		const balancedRank = withBalanced.findIndex((cause) => cause.id === 'limescale');
		expect(scalingRank).toBeGreaterThanOrEqual(0);
		expect(balancedRank === -1 || scalingRank < balancedRank).toBe(true);
	});

	it('a healthy test damps chemistry causes instead of parroting the symptom prior', () => {
		const healthy = guidanceFor({ fc: 4, ph: 7.4, ta: 80, cya: 40, ch: 300, temp: 26 });
		const ranked = rankCauses(['cloudy'], defaultAnswers(['cloudy']), healthy);
		// with chlorine fine, filtration should beat low-sanitiser
		const filtration = ranked.findIndex((cause) => cause.id === 'weak-filtration');
		const sanitiser = ranked.findIndex((cause) => cause.id === 'low-sanitiser');
		expect(filtration).toBeGreaterThanOrEqual(0);
		expect(sanitiser === -1 || filtration < sanitiser).toBe(true);
	});

	it('works without any test (symptoms + answers only)', () => {
		const ranked = rankCauses(['foam'], defaultAnswers(['foam']), null);
		expect(ranked[0].id).toBe('products-foam');
	});
});

describe('rankCauses — answers move the ranking', () => {
	it('"clear but green" points to metals over algae', () => {
		const questions = questionsForSymptoms(['green']);
		const clarity = questions.find((question) => question.id === 'green-clarity')!;
		const clearGreen: AnsweredQuestion[] = questions.map((question) => ({
			question,
			selectedIndex: question.id === 'green-clarity' ? 0 : question.options.length - 1
		}));
		expect(clarity.options[0].label).toBe('Clear but green');
		const ranked = rankCauses(['green'], clearGreen, null);
		const metals = ranked.findIndex((cause) => cause.id === 'metals-in-fill');
		const algae = ranked.findIndex((cause) => cause.id === 'algae-growth');
		expect(metals).toBeGreaterThanOrEqual(0);
		expect(algae === -1 || metals < algae).toBe(true);
	});
});

describe('rankCauses — output honesty', () => {
	it('bands and bar fractions are monotonic, top is Most likely, no percent strings', () => {
		const ranked = rankCauses(
			['cloudy', 'eye'],
			defaultAnswers(['cloudy', 'eye']),
			guidanceFor({ fc: 1, ph: 8.0, ta: 120, cya: 40, ch: 300, temp: 26 })
		);
		expect(ranked[0].band).toBe('Most likely');
		expect(ranked[0].barFraction).toBe(1);
		for (let index = 1; index < ranked.length; index++) {
			expect(ranked[index].barFraction).toBeLessThanOrEqual(ranked[index - 1].barFraction);
		}
		for (const cause of ranked) {
			expect(cause.title).not.toMatch(/%/);
			expect(cause.fixText).not.toMatch(/%/);
			expect(cause.band).not.toMatch(/%/);
		}
	});
});
