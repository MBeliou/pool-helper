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
