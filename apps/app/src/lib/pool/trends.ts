// Trend series derived from logged tests (chart fractions + display stats)
import type { TestRow } from './db/schema';
import {
	PARAMETERS,
	displayUnitText,
	displayValue,
	formatReading,
	readingStatus,
	scaleFraction,
	testValue,
	type DisplayUnits,
	type ParameterKey,
	type ReadingStatus
} from './chemistry';

export type TrendDirection = 'up' | 'down' | 'flat';

export interface ParameterTrend {
	key: ParameterKey;
	label: string;
	/** formatted latest value in display units */
	latestDisplay: string;
	status: ReadingStatus;
	direction: TrendDirection;
	note: string;
	/** chart fractions 0..1, oldest first */
	points: number[];
	dates: Date[];
	lowDisplay: string;
	highDisplay: string;
	avgDisplay: string;
	idealLowFraction: number;
	idealHighFraction: number;
	idealRangeText: string;
}

const DIRECTION_NOTES: Record<TrendDirection, string> = {
	up: 'creeping up',
	down: 'dropping',
	flat: 'steady'
};
const DIRECTION_THRESHOLD = 0.08; // fraction-of-scale change considered a real move

/** trends for all chemistry parameters that have at least one reading; oldest-first input */
export function buildTrends(tests: TestRow[], displayUnits: DisplayUnits): ParameterTrend[] {
	const trends: ParameterTrend[] = [];
	for (const parameter of PARAMETERS) {
		if (parameter.key === 'temp') continue;
		const samples = tests
			.map((test) => ({ date: test.testedAt, value: testValue(test, parameter.key) }))
			.filter((sample): sample is { date: Date; value: number } => sample.value !== null);
		if (samples.length === 0) continue;

		const canonicalValues = samples.map((sample) => sample.value);
		const points = canonicalValues.map((value) => scaleFraction(parameter, value));
		const latestValue = canonicalValues[canonicalValues.length - 1];
		const fractionDelta = points[points.length - 1] - points[0];
		const direction: TrendDirection =
			points.length < 2 || Math.abs(fractionDelta) < DIRECTION_THRESHOLD
				? 'flat'
				: fractionDelta > 0
					? 'up'
					: 'down';

		const displayValues = canonicalValues.map((value) =>
			displayValue(parameter, value, displayUnits)
		);
		const average = displayValues.reduce((sum, value) => sum + value, 0) / displayValues.length;
		const unitText = displayUnitText(parameter, displayUnits);
		const idealText =
			parameter.idealLow !== undefined && parameter.idealHigh !== undefined
				? `Ideal range ${formatReading(displayValue(parameter, parameter.idealLow, displayUnits), parameter.decimals)}–${formatReading(displayValue(parameter, parameter.idealHigh, displayUnits), parameter.decimals)}${unitText ? ` ${unitText}` : ''}`
				: '';

		trends.push({
			key: parameter.key,
			label: parameter.shortLabel,
			latestDisplay: formatReading(
				displayValue(parameter, latestValue, displayUnits),
				parameter.decimals
			),
			status: readingStatus(parameter, latestValue),
			direction,
			note: DIRECTION_NOTES[direction],
			points,
			dates: samples.map((sample) => sample.date),
			lowDisplay: formatReading(Math.min(...displayValues), parameter.decimals),
			highDisplay: formatReading(Math.max(...displayValues), parameter.decimals),
			avgDisplay: formatReading(average, parameter.decimals),
			idealLowFraction:
				parameter.idealLow !== undefined ? scaleFraction(parameter, parameter.idealLow) : 0,
			idealHighFraction:
				parameter.idealHigh !== undefined ? scaleFraction(parameter, parameter.idealHigh) : 0,
			idealRangeText: idealText
		});
	}
	return trends;
}
