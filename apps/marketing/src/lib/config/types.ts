// Marketing site content model. This is the single source of truth that makes the
// site reusable: to launch a new product, edit `site.ts` (and swap the brand asset)
// — the section components below never need to change.

export interface NavLink {
	label: string;
	/** Anchor (e.g. "#features") or route ("/privacy"). */
	href: string;
}

export interface CtaLink {
	label: string;
	href: string;
}

export interface Brand {
	name: string;
	/** Short tagline used near the logo / in the footer. */
	tagline: string;
	domain: string;
}

export interface Hero {
	/** Small eyebrow text above the headline. */
	eyebrow?: string;
	headline: string;
	subhead: string;
	primaryCta: CtaLink;
	secondaryCta?: CtaLink;
	/** Caption shown under the hero screenshot. */
	screenshotCaption: string;
	/** Root-relative path to the hero screenshot (e.g. "/screenshots/01-home.png"). */
	screenshotSrc?: string;
}

export interface HowItWorksStep {
	/** Step number as displayed, e.g. "1". */
	step: string;
	title: string;
	description: string;
}

export interface Feature {
	/** lucide icon name, resolved in Features.svelte (see ICONS map). */
	icon: string;
	title: string;
	description: string;
	tier?: 'Free' | 'Pro';
}

export interface PricingTier {
	name: string;
	price: string;
	/** e.g. "/year", "one-time", or "" for free. */
	period?: string;
	description: string;
	features: string[];
	cta: CtaLink;
	/** Visually highlight this tier. */
	featured?: boolean;
	badge?: string;
}

export interface Shot {
	caption: string;
	/** Root-relative path to a real screenshot; falls back to a placeholder when absent. */
	src?: string;
}

export interface FaqItem {
	question: string;
	answer: string;
}

export interface CtaBand {
	headline: string;
	subhead: string;
	primaryCta: CtaLink;
	secondaryCta?: CtaLink;
	note?: string;
}

export interface FooterColumn {
	title: string;
	links: NavLink[];
}

export interface Seo {
	title: string;
	description: string;
	/** Absolute or root-relative OG image path. */
	ogImage?: string;
}

export interface SiteConfig {
	brand: Brand;
	/**
	 * The live App Store URL. Leave undefined pre-launch: download CTAs render a
	 * "Coming soon" badge. Set it and every download CTA becomes a real link.
	 */
	appStoreUrl?: string;
	nav: NavLink[];
	headerCta: CtaLink;
	hero: Hero;
	howItWorksHeading: { title: string; subtitle: string };
	howItWorks: HowItWorksStep[];
	featuresHeading: { title: string; subtitle: string };
	features: Feature[];
	pricingHeading: { title: string; subtitle: string };
	pricing: PricingTier[];
	screenshotsHeading: { title: string; subtitle: string };
	screenshots: Shot[];
	faqHeading: { title: string; subtitle: string };
	faq: FaqItem[];
	ctaBand: CtaBand;
	footer: { columns: FooterColumn[]; legal: string };
	seo: Seo;
}
