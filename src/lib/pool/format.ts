// Shared date/time display helpers
const DAY_MS = 24 * 60 * 60 * 1000;

/** "8:30am" */
export function formatTimeCompact(date: Date): string {
	return date
		.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
		.toLowerCase()
		.replace(' ', '');
}

/** "May 28" */
export function formatShortDate(date: Date): string {
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** "Mon · 9:00am" */
export function formatWeekdayTime(date: Date): string {
	const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
	return `${weekday} · ${formatTimeCompact(date)}`;
}

export function isToday(date: Date): boolean {
	return date.toDateString() === new Date().toDateString();
}

export function hoursSince(date: Date): number {
	return (Date.now() - date.getTime()) / (60 * 60 * 1000);
}

export function daysSince(date: Date): number {
	return Math.floor((Date.now() - date.getTime()) / DAY_MS);
}

/** "Today", "Yesterday", or "Jun 8" — journal day headers */
export function dayLabel(date: Date): string {
	if (isToday(date)) return 'Today';
	const yesterday = new Date(Date.now() - DAY_MS);
	if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
	return formatShortDate(date);
}

/** "today", "2 days", "3 weeks" — coarse age for issue cards */
export function relativeAge(date: Date): string {
	const days = daysSince(date);
	if (days <= 0) return 'today';
	if (days === 1) return '1 day';
	if (days < 14) return `${days} days`;
	return `${Math.round(days / 7)} weeks`;
}
