import { describe, expect, it } from 'vitest';
import {
	ALL_READING_KEYS,
	TESTERS,
	resolveTesterMeasures,
	resolveTesterType,
	testerIcon
} from './data';

describe('resolveTesterMeasures', () => {
	it('prefers the stored tester over the catalogue', () => {
		const stored = [{ name: 'Test strips', measures: ['ph' as const] }];
		expect(resolveTesterMeasures('Test strips', stored)).toEqual(['ph']);
	});

	it('falls back to the catalogue for known names', () => {
		expect(resolveTesterMeasures('Drop test kit', [])).toEqual(
			TESTERS.find((tester) => tester.name === 'Drop test kit')?.measures
		);
	});

	it('maps legacy brand names to their generic replacements', () => {
		expect(resolveTesterMeasures('AquaChek 7-in-1', [])).toEqual(
			TESTERS.find((tester) => tester.name === 'Test strips')?.measures
		);
		expect(testerIcon('Taylor K-2006')).toBe('drop');
	});

	it('unknown names never lose fields (all keys)', () => {
		expect(resolveTesterMeasures('Mystery Kit', [])).toEqual(ALL_READING_KEYS);
	});

	it('an empty stored measures list falls through instead of hiding everything', () => {
		const stored = [{ name: 'Broken Kit', measures: [] }];
		expect(resolveTesterMeasures('Broken Kit', stored)).toEqual(ALL_READING_KEYS);
	});
});

describe('testerIcon', () => {
	it('catalogue names keep their icon; customs get the beaker', () => {
		expect(testerIcon('Salt meter')).toBe('spark');
		expect(testerIcon('My Strips')).toBe('beaker');
	});
});

describe('resolveTesterType', () => {
	it('prefers the stored tester over the catalogue', () => {
		const stored = [{ name: 'Drop test kit', type: 'meter' as const }];
		expect(resolveTesterType('Drop test kit', stored)).toBe('meter');
	});

	it('falls back to the catalogue for known names', () => {
		expect(resolveTesterType('Drop test kit', [])).toBe('drops');
		expect(resolveTesterType('Salt meter', [])).toBe('meter');
	});

	it('maps legacy brand names to their generic replacements', () => {
		expect(resolveTesterType('AquaChek 7-in-1', [])).toBe('strips');
		expect(resolveTesterType('Taylor K-2006', [])).toBe('drops');
	});

	it('unknown names get the conservative strips fallback', () => {
		expect(resolveTesterType('Mystery Kit', [])).toBe('strips');
	});
});
