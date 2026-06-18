// Locale-aware formatting. The active locale comes from Paraglide's getLocale()
// rather than a hardcoded 'en-US', so dates/numbers render correctly once a
// non-English locale can actually be selected (i18n Phase 0). Until then this
// resolves to English and is a behaviour-preserving de-hardcoding.
import { getLocale } from '$lib/paraglide/runtime';

// Map app locale → a BCP-47 tag Intl understands (region drives grouping/format).
const INTL_TAG: Record<string, string> = { en: 'en-US', fr: 'fr-FR' };

/** BCP-47 tag for the active locale, for `Intl` / `toLocaleX` calls. */
export function localeTag(): string {
	return INTL_TAG[getLocale()] ?? 'en-US';
}

/**
 * Format a number for display in the active locale. Grouping is on by default
 * ("50,000"); pass `false` for an editing buffer where a thousands separator
 * would be ambiguous with a decimal comma (e.g. the m³ volume field).
 */
export function formatNumber(value: number, useGrouping = true): string {
	return value.toLocaleString(localeTag(), { useGrouping });
}

/**
 * Normalize raw text from a numeric input: accept both ',' and '.' as the decimal
 * separator (French keyboards/locales emit ','), keep digits plus a single '.',
 * and cap the length. Stored canonically with '.' so `parseFloat` round-trips.
 * Locale-independent on purpose — it works regardless of how the device region is
 * set, which the simulator and real devices can disagree on.
 */
export function sanitizeDecimalInput(raw: string, maxLength = Infinity): string {
	let cleaned = raw.replaceAll(',', '.').replace(/[^0-9.]/g, '');
	const firstDot = cleaned.indexOf('.');
	if (firstDot !== -1) {
		cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replaceAll('.', '');
	}
	return Number.isFinite(maxLength) ? cleaned.slice(0, maxLength) : cleaned;
}
