import { describe, expect, it } from 'vitest';
import {
	formatTimeCompact,
	formatShortDate,
	formatWeekdayTime,
	isToday,
	hoursSince,
	daysSince,
	dayLabel,
	relativeAge
} from './format';

const DAY_MS = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY_MS);

// Dates are built in local time; the formatters use the active app locale (via
// localeFormat), which defaults to English here, so these en strings are stable
// regardless of the machine's locale.
describe('absolute formatters', () => {
	it('formatTimeCompact → "9:00am" / "2:30pm"', () => {
		expect(formatTimeCompact(new Date(2024, 4, 28, 9, 0))).toBe('9:00am');
		expect(formatTimeCompact(new Date(2024, 4, 28, 14, 30))).toBe('2:30pm');
	});

	it('formatShortDate → "May 28"', () => {
		expect(formatShortDate(new Date(2024, 4, 28))).toBe('May 28');
	});

	it('formatWeekdayTime → "Tue · 9:00am"', () => {
		expect(formatWeekdayTime(new Date(2024, 4, 28, 9, 0))).toBe('Tue · 9:00am');
	});
});

describe('relative helpers', () => {
	it('isToday distinguishes today from yesterday', () => {
		expect(isToday(new Date())).toBe(true);
		expect(isToday(ago(1))).toBe(false);
	});

	it('daysSince floors elapsed whole days', () => {
		expect(daysSince(ago(3))).toBe(3);
		expect(daysSince(new Date())).toBe(0);
	});

	it('hoursSince returns fractional hours', () => {
		expect(hoursSince(new Date(Date.now() - 2 * 60 * 60 * 1000))).toBeCloseTo(2, 1);
	});
});

describe('dayLabel — journal headers', () => {
	it('labels today and yesterday by name, older dates by short date', () => {
		expect(dayLabel(new Date())).toBe('Today');
		expect(dayLabel(ago(1))).toBe('Yesterday');
		expect(dayLabel(new Date(2024, 4, 28))).toBe('May 28');
	});
});

describe('relativeAge — issue-card age', () => {
	it('reads "today", singular/plural days, then weeks', () => {
		expect(relativeAge(new Date())).toBe('today');
		expect(relativeAge(ago(1))).toBe('1 day');
		expect(relativeAge(ago(5))).toBe('5 days');
		expect(relativeAge(ago(13))).toBe('13 days');
		expect(relativeAge(ago(21))).toBe('3 weeks');
	});
});
