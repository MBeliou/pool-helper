// Theming is pure CSS: the palette tokens are CSS custom properties defined in
// `pool.css` and switched by `@media (prefers-color-scheme: dark)`. The browser
// resolves them before first paint (even on prerendered HTML), so light/dark is
// OS-driven and flash-free with no JavaScript.
//
// This module just exposes the palette *API* the app already reads everywhere
// (`theme.palette.x`, `statusColor(...)`) — each value is the matching `var(--x)`
// string, so existing call sites are unchanged.
export type StatusKey = 'ok' | 'high' | 'low' | 'info';

export interface Palette {
	page: string;
	card: string;
	ink: string;
	inkMuted: string;
	accent: string;
	idealBand: string;
	track: string;
	line: string;
	status: Record<StatusKey, string>;
	shadow: string;
	gradient: string;
	onGradient: string;
}

const PALETTE: Palette = {
	page: 'var(--page)',
	card: 'var(--card)',
	ink: 'var(--ink)',
	inkMuted: 'var(--ink-muted)',
	accent: 'var(--accent)',
	idealBand: 'var(--ideal-band)',
	track: 'var(--track)',
	line: 'var(--line)',
	status: {
		ok: 'var(--status-ok)',
		high: 'var(--status-high)',
		low: 'var(--status-low)',
		info: 'var(--status-info)'
	},
	shadow: 'var(--shadow)',
	gradient: 'var(--gradient)',
	onGradient: 'var(--on-gradient)'
};

// Kept as `theme.palette` so existing `const palette = $derived(theme.palette)`
// call sites need no change. The palette is static now — CSS drives the theme.
export const theme = { palette: PALETTE };

/** Resolve a status key to its palette colour, falling back to the accent. */
export function statusColor(palette: Palette, statusKey: string): string {
	return palette.status[statusKey as StatusKey] ?? palette.accent;
}
