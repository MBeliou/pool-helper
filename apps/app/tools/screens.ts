// The App Store screenshot set: one entry per marketing shot. Consumed by both
// capture.ts (which app screen to grab) and frame.ts (the renderfast overlay text).
//
// Order = display order on the store. Apple shows the first 3 in search, so the
// strongest value props lead. Headlines are ≤ ~30 chars/line, two lines max.

export type Screen = {
	/** stable id → used for the raw + framed file names */
	id: string;
	/** app route to navigate to for the raw capture */
	route: string;
	/** bold two-line headline (top of the frame) */
	headline: string;
	/** supporting line under the headline */
	subhead: string;
	/** the purple pill + arrow callout pointing at a UI element (optional) */
	callout?: string;
};

export const SCREENS: Screen[] = [
	{
		id: "01-home",
		route: "/",
		headline: "Balance your pool\nin minutes",
		subhead: "Log a water test and get an exact plan — no chemistry degree.",
		callout: "See what's off at a glance",
	},
	{
		id: "02-test",
		route: "/log/test",
		headline: "Log a test in\nunder a minute",
		subhead: "Enter strip or kit readings. We flag anything out of range instantly.",
		callout: "Per-parameter units",
	},
	{
		id: "03-plan",
		route: "/results",
		headline: "An exact dosing\nplan, every time",
		subhead: "The precise amount of each product to add — for your pool's real volume.",
		callout: "Follow the steps",
	},
	{
		id: "04-diagnose",
		route: "/care/diagnose/1",
		headline: "Cloudy or green?\nDiagnose it fast",
		subhead: "Answer a few questions and follow a clear plan to clear the water.",
		callout: "Guided fix plans",
	},
	{
		id: "05-trends",
		route: "/trends",
		headline: "Catch problems\nbefore they start",
		subhead: "See how every reading moves week to week, all season long.",
		callout: "Full history",
	},
];
