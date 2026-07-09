// Plain-language "What is this?" explainers for each chemistry parameter,
// shown on the trends detail screen. Copy rules: no jargon, give the other
// names people meet on labels and forums, say why it matters — assume the
// reader never took chemistry (see guidance-UI copy principles).
import type { ParameterKey } from './chemistry';
import type { SanitizerType } from './guidance/targets';

export interface ParameterExplainer {
	title: string;
	body: string;
}

const EXPLAINERS: Partial<Record<ParameterKey, ParameterExplainer>> = {
	ph: {
		title: 'What is pH?',
		body: 'How acidic or basic the water is, on a 0–14 scale where 7 is neutral. Pools aim slightly basic (7.2–7.8) — close to your eyes and skin, so the water doesn’t sting. Too low, the water slowly eats metal and surfaces; too high, your sanitiser gets weak and limescale forms. Most pools drift up over time — small acid doses are normal.'
	},
	ta: {
		title: 'What is alkalinity?',
		body: 'Total alkalinity (TA) is dissolved bicarbonate — the same family as baking soda — acting as the water’s shock absorber. It soaks up acid so pH doesn’t bounce around with every rain or splash of chemicals. Too low and pH gets jumpy; too high and pH keeps creeping up no matter what you do.'
	},
	ch: {
		title: 'What is hardness?',
		body: 'Calcium hardness (CH) is how much calcium is dissolved in the water. Water always wants some: too little and “hungry” water pulls calcium out of plaster, grout and metal; too much and the extra comes back out as limescale — a white crust on surfaces and equipment.'
	},
	cya: {
		title: 'What is stabiliser?',
		body: 'Cyanuric acid (CYA) — also sold as stabiliser or conditioner — is sunscreen for chlorine. Without it, sunlight destroys chlorine within hours; with the right amount it lasts for days. Too much, though, and chlorine turns sluggish. Your chlorine target scales with it, and it only leaves the water by draining.'
	},
	temp: {
		title: 'Why log temperature?',
		body: 'Warm water grows algae faster and burns through sanitiser quicker; cold water is more corrosive to surfaces and metal. The app also needs it to check your limescale/corrosion balance — that’s why it asks when it’s missing.'
	}
};

const CHLORINE_EXPLAINER: ParameterExplainer = {
	title: 'What is free chlorine?',
	body: 'The chlorine that’s still active and free to kill germs and algae — different from the “total chlorine” some strips also show, which counts used-up chlorine too. Sunlight burns it off (stabiliser is its sunscreen), and hot days or lots of swimmers use it up faster. It’s the one reading worth checking most often.'
};

const BROMINE_EXPLAINER: ParameterExplainer = {
	title: 'What is bromine?',
	body: 'The sanitiser keeping your water safe — it works like chlorine but stays effective in hot water and regenerates when shocked, which is why spas and some pools use it. You measure it as “total bromine”; sunlight still breaks it down, and no stabiliser can protect it.'
};

/** explainer for a parameter, sanitiser-aware for the fc/bromine gauge */
export function parameterExplainer(
	parameterKey: ParameterKey,
	sanitizer: SanitizerType
): ParameterExplainer | undefined {
	if (parameterKey === 'fc') {
		return sanitizer === 'bromine' ? BROMINE_EXPLAINER : CHLORINE_EXPLAINER;
	}
	return EXPLAINERS[parameterKey];
}
