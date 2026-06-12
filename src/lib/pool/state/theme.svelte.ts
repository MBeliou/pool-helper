// Palettes ported from the Pool Handler design prototype (design-reference/home.jsx)
export type StatusKey = 'ok' | 'high' | 'low' | 'info';

export interface Palette {
	dark: boolean;
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

export const LIGHT_PALETTE: Palette = {
	dark: false,
	page: '#F1F3F4',
	card: '#FFFFFF',
	ink: '#0F2A36',
	inkMuted: '#5E7A86',
	accent: '#0E6BA8',
	idealBand: '#DCEAF3',
	track: '#E7EDF0',
	line: '#E9EFF2',
	status: { ok: '#1E9E6A', high: '#E0962B', low: '#D9534F', info: '#0E6BA8' },
	shadow: '0 1px 2px rgba(15,42,54,.04), 0 6px 18px rgba(15,42,54,.06)',
	gradient: 'linear-gradient(158deg,#1f86c4,#0b5a92)',
	onGradient: '#fff'
};

export const DARK_PALETTE: Palette = {
	dark: true,
	page: '#0C1A22',
	card: '#15262F',
	ink: '#EAF4F8',
	inkMuted: '#7193A0',
	accent: '#39A7DD',
	idealBand: 'rgba(57,167,221,.16)',
	track: '#21343D',
	line: '#20333c',
	status: { ok: '#35C98C', high: '#F0B23E', low: '#FF6F66', info: '#39A7DD' },
	shadow: '0 2px 14px rgba(0,0,0,.4)',
	gradient: 'linear-gradient(158deg,#11506f,#0a3550)',
	onGradient: '#EAF4F8'
};

class Theme {
	dark = $state(false);
	readonly palette: Palette = $derived(this.dark ? DARK_PALETTE : LIGHT_PALETTE);
}

export const theme = new Theme();

/** Resolve a status key to its palette colour, falling back to the accent. */
export function statusColor(palette: Palette, statusKey: string): string {
	return palette.status[statusKey as StatusKey] ?? palette.accent;
}
