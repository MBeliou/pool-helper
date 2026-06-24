import { describe, expect, it } from 'vitest';
import { sanitizeDecimalInput } from './localeFormat';

describe('sanitizeDecimalInput', () => {
	it('accepts a French comma as the decimal separator', () => {
		expect(sanitizeDecimalInput('7,4')).toBe('7.4');
		expect(sanitizeDecimalInput('1,5')).toBe('1.5');
	});

	it('keeps a regular dot unchanged', () => {
		expect(sanitizeDecimalInput('7.4')).toBe('7.4');
	});

	it('strips non-numeric characters', () => {
		expect(sanitizeDecimalInput('1a2b')).toBe('12');
		expect(sanitizeDecimalInput('-3.2')).toBe('3.2');
	});

	it('collapses multiple separators to a single decimal point', () => {
		expect(sanitizeDecimalInput('1,2,3')).toBe('1.23');
		expect(sanitizeDecimalInput('7.4.5')).toBe('7.45');
	});

	it('preserves a trailing separator so mid-typing values render', () => {
		expect(sanitizeDecimalInput('7,')).toBe('7.');
		expect(sanitizeDecimalInput('7.')).toBe('7.');
	});

	it('caps the length when a max is given', () => {
		expect(sanitizeDecimalInput('123456', 5)).toBe('12345');
		expect(sanitizeDecimalInput('1.2345', 5)).toBe('1.234');
	});

	it('round-trips through parseFloat for comma input', () => {
		expect(parseFloat(sanitizeDecimalInput('7,4'))).toBe(7.4);
		// the bug this guards against: parseFloat on a raw comma truncates
		expect(parseFloat('7,4')).toBe(7);
	});
});
