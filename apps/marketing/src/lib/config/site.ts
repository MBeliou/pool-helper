import type { SiteConfig } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// The product. Edit THIS file (and swap the brand droplet asset) to re-skin the
// entire marketing site for a different product — no component changes needed.
// Copy here mirrors the App Store listing (apps/app/tools/metadata/en-US) so the
// website and the store tell the same story.
// ─────────────────────────────────────────────────────────────────────────────

export const site: SiteConfig = {
	brand: {
		name: 'My Pool',
		tagline: 'Crystal-clear water, without the guesswork.',
		domain: 'getmypool.care'
	},

	// Pre-launch: leave undefined and every download CTA renders a "Coming soon"
	// badge. At launch, set this to the App Store URL and they become real links.
	// appStoreUrl: 'https://apps.apple.com/app/idXXXXXXXXXX',

	nav: [
		{ label: 'Features', href: '#features' },
		{ label: 'How it works', href: '#how' },
		{ label: 'Pricing', href: '#pricing' },
		{ label: 'FAQ', href: '#faq' }
	],
	headerCta: { label: 'Get the app', href: '#download' },

	hero: {
		eyebrow: 'Pool care made simple',
		headline: 'Balance your pool in minutes, not weekends.',
		subhead:
			'Log a water test and get an exact, step-by-step dosing plan for your pool — tailored to its size, surface, and chemistry. No spreadsheets, no chemistry degree.',
		primaryCta: { label: 'Download for iOS', href: '#download' },
		secondaryCta: { label: 'See how it works', href: '#how' },
		screenshotCaption: 'Your pool at a glance',
		screenshotSrc: '/screenshots/01-home.png'
	},

	howItWorksHeading: {
		title: 'From water test to balanced, in three steps',
		subtitle: 'No dumping in chemicals and hoping. Just test, dose, and you’re done.'
	},
	howItWorks: [
		{
			step: '1',
			title: 'Log a water test',
			description:
				'Enter your strip or kit readings. My Pool instantly flags anything out of range.'
		},
		{
			step: '2',
			title: 'Get your dosing plan',
			description:
				'See the precise amount of each product to add, calculated from your pool’s real volume.'
		},
		{
			step: '3',
			title: 'Follow the steps',
			description: 'Add what the plan says, re-test, and your water’s balanced.'
		}
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
				'Cloudy, green, or foamy water? Answer a few questions and follow a clear fix plan to clear it up.',
			tier: 'Pro'
		},
		{
			icon: 'line-chart',
			title: 'Trends over time',
			description:
				'See how each reading moves week to week so you can catch issues before they start.',
			tier: 'Pro'
		},
		{
			icon: 'bell',
			title: 'Re-test reminders',
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
				'Full trend history',
				'Smart reminders'
			],
			cta: { label: 'Start 3-day free trial', href: '#download' },
			featured: true,
			badge: '3-day free trial'
		},
		{
			name: 'Lifetime',
			price: '$59.99',
			period: 'one-time',
			description: 'Pay once. Every Pro feature, forever — no subscription.',
			features: [
				'Everything in Pro',
				'One-time purchase',
				'No recurring subscription',
				'Free updates'
			],
			cta: { label: 'Buy Lifetime', href: '#download' }
		}
	],

	screenshotsHeading: {
		title: 'A closer look',
		subtitle: 'Designed to feel effortless on the pool deck.'
	},
	screenshots: [
		{ caption: 'Log a test', src: '/screenshots/02-test.png' },
		{ caption: 'Your dosing plan', src: '/screenshots/03-plan.png' },
		{ caption: 'Diagnose issues', src: '/screenshots/04-diagnose.png' },
		{ caption: 'Track trends', src: '/screenshots/05-trends.png' }
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
			question: 'Does it work for any pool or hot tub?',
			answer:
				'Yes. Set your pool or hot tub’s size, shape, and surface once — chlorine or salt — and every dosing plan is tailored to your exact water volume.'
		},
		{
			question: 'Is my data private?',
			answer:
				'Completely. Your pool profile and test history stay on your device. No account is required and nothing is sold or tracked. You can export everything at any time.'
		},
		{
			question: 'What do I get with Pro?',
			answer:
				'Pro unlocks problem diagnosis with guided fix plans, your full trend history, and smart reminders. It’s available as an annual plan with a 3-day free trial, or a one-time Lifetime purchase.'
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
		primaryCta: { label: 'Download for iOS', href: '#download' },
		note: 'Free to start. Pro from $29.99/year with a 3-day free trial, or $59.99 once.'
	},

	footer: {
		columns: [
			{
				title: 'Product',
				links: [
					{ label: 'Features', href: '#features' },
					{ label: 'How it works', href: '#how' },
					{ label: 'Pricing', href: '#pricing' },
					{ label: 'FAQ', href: '#faq' }
				]
			},
			{
				title: 'Support',
				links: [
					{ label: 'Help & support', href: '/support' },
					{ label: 'Contact', href: 'mailto:hello@getmypool.care' }
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
