import type { SiteConfig } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// The product. Edit THIS file (and swap the brand droplet asset) to re-skin the
// entire marketing site for a different product — no component changes needed.
// All copy here is placeholder content; replace with real marketing copy.
// ─────────────────────────────────────────────────────────────────────────────

export const site: SiteConfig = {
	brand: {
		name: 'My Pool',
		tagline: 'Crystal-clear water, without the guesswork.',
		domain: 'mypool.app'
	},

	nav: [
		{ label: 'Features', href: '#features' },
		{ label: 'Pricing', href: '#pricing' },
		{ label: 'Reviews', href: '#reviews' },
		{ label: 'FAQ', href: '#faq' }
	],
	headerCta: { label: 'Get the app', href: '#download' },

	hero: {
		eyebrow: 'Pool care made simple',
		headline: 'Balance your pool in minutes, not weekends.',
		subhead:
			'Log a water test and get an exact, step-by-step dosing plan for your pool — tailored to its size, surface, and chemistry. No spreadsheets, no chemistry degree.',
		primaryCta: { label: 'Download for iOS', href: '#download' },
		secondaryCta: { label: 'See how it works', href: '#features' },
		screenshotCaption: 'Home dashboard'
	},

	stats: [
		{ value: '2 min', label: 'to a full dosing plan' },
		{ value: '12+', label: 'water parameters tracked' },
		{ value: '100%', label: 'on-device & private' },
		{ value: '4.9★', label: 'average tester rating' }
	],

	featuresHeading: {
		title: 'Everything you need to keep the water right',
		subtitle: 'From the first test to a healthy pool all season long.'
	},
	features: [
		{
			icon: 'flask-conical',
			title: 'Guided water tests',
			description:
				'Enter strip or kit readings with per-parameter units. We flag anything out of range instantly.',
			tier: 'Free'
		},
		{
			icon: 'calculator',
			title: 'Exact dosing plans',
			description:
				'Get the precise amount of each product to add, calculated from your pool’s real volume.',
			tier: 'Free'
		},
		{
			icon: 'stethoscope',
			title: 'Diagnose problems',
			description:
				'Cloudy or green water? Answer a few questions and follow a clear fix plan to clear it up.',
			tier: 'Premium'
		},
		{
			icon: 'line-chart',
			title: 'Trends over time',
			description:
				'See how each reading moves week to week so you can catch issues before they start.',
			tier: 'Premium'
		},
		{
			icon: 'bell',
			title: 'Smart reminders',
			description:
				'Get nudged to re-test on a cadence that fits your pool, your climate, and your season.',
			tier: 'Free'
		},
		{
			icon: 'shield-check',
			title: 'Private by design',
			description:
				'Your pool data lives on your device. No account required, nothing sold, nothing tracked.',
			tier: 'Free'
		}
	],

	pricingHeading: {
		title: 'Simple pricing',
		subtitle: 'Start free. Upgrade when you want the full toolkit.'
	},
	pricing: [
		{
			name: 'Free',
			price: '$0',
			period: 'forever',
			description: 'Everything you need to test and balance a single pool.',
			features: [
				'Guided water tests',
				'Exact dosing plans',
				'Re-test reminders',
				'On-device history'
			],
			cta: { label: 'Download free', href: '#download' }
		},
		{
			name: 'Pro',
			price: '$29.99',
			period: '/year',
			description: 'The full toolkit for a healthy pool all season.',
			features: [
				'Everything in Free',
				'Problem diagnosis & fix plans',
				'Trends & history insights',
				'Priority support'
			],
			cta: { label: 'Start 3-day free trial', href: '#download' },
			featured: true,
			badge: '3-day free trial'
		}
	],

	screenshotsHeading: {
		title: 'A closer look',
		subtitle: 'Designed to feel effortless on the pool deck.'
	},
	screenshots: [
		{ caption: 'Log a test' },
		{ caption: 'Your dosing plan' },
		{ caption: 'Diagnose issues' },
		{ caption: 'Track trends' }
	],

	testimonialsHeading: {
		title: 'Loved by pool owners',
		subtitle: 'Early testers on what changed for them.'
	},
	testimonials: [
		{
			quote:
				'I used to dread balancing the pool. Now I test, follow the plan, and I’m done before my coffee’s cold.',
			name: 'Jordan M.',
			location: 'Phoenix, AZ',
			rating: 5
		},
		{
			quote:
				'The dosing amounts are spot on for my exact pool size. No more guessing or over-shocking.',
			name: 'Camille R.',
			location: 'Aix-en-Provence, FR',
			rating: 5
		},
		{
			quote:
				'Green water gone in two days by just following the fix plan. This app paid for itself instantly.',
			name: 'Dale W.',
			location: 'Tampa, FL',
			rating: 4
		}
	],

	faqHeading: {
		title: 'Questions, answered',
		subtitle: 'Everything else you might be wondering.'
	},
	faq: [
		{
			question: 'Do I need a specific test kit?',
			answer:
				'No. My Pool works with test strips or liquid kits — just enter your readings and we handle the rest.'
		},
		{
			question: 'Does it work for any pool?',
			answer:
				'Yes. Set your pool’s size, shape, and surface once, and every dosing plan is tailored to your exact water volume.'
		},
		{
			question: 'Is my data private?',
			answer:
				'Completely. Your pool profile and test history stay on your device. No account is required and nothing is sold or tracked.'
		},
		{
			question: 'What do I get with Pro?',
			answer:
				'Pro unlocks problem diagnosis with guided fix plans and long-term trends. It starts with a 3-day free trial.'
		},
		{
			question: 'Can I cancel anytime?',
			answer:
				'Yes. Subscriptions are managed through the App Store and you can cancel before the trial ends at no charge.'
		}
	],

	ctaBand: {
		headline: 'Ready for an easier pool?',
		subhead: 'Download My Pool and get your first dosing plan today.',
		primaryCta: { label: 'Download for iOS', href: '#' },
		secondaryCta: { label: 'Get it on Android', href: '#' },
		note: 'Free to start. Pro available with a 3-day free trial.'
	},

	footer: {
		columns: [
			{
				title: 'Product',
				links: [
					{ label: 'Features', href: '#features' },
					{ label: 'Pricing', href: '#pricing' },
					{ label: 'Reviews', href: '#reviews' },
					{ label: 'FAQ', href: '#faq' }
				]
			},
			{
				title: 'Company',
				links: [
					{ label: 'About', href: '#' },
					{ label: 'Blog', href: '#' },
					{ label: 'Contact', href: 'mailto:hello@mypool.app' }
				]
			},
			{
				title: 'Legal',
				links: [
					{ label: 'Privacy', href: '/privacy' },
					{ label: 'Terms', href: '/terms' }
				]
			}
		],
		legal: '© 2026 My Pool. All rights reserved.'
	},

	seo: {
		title: 'My Pool — Crystal-clear water, without the guesswork',
		description:
			'Log a water test and get an exact, step-by-step dosing plan tailored to your pool. Track trends, diagnose problems, and keep your water healthy all season.',
		ogImage: '/og.png'
	}
};
