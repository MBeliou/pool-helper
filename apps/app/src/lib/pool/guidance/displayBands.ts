// Gauge/trend parameter definitions with the engine's DERIVED targets in
// place of the static prototype bands: FC scales with CYA (or becomes the
// bromine band), CYA follows the sanitiser + sun, TA follows the sanitiser,
// CH follows the surface. Gauges, trends and the fix plan all agree this way.
import { PARAMETERS, type ParameterDefinition } from '../chemistry';
import {
	PH_BAND,
	chBand,
	cyaBand,
	sanitizerLevelLabel,
	sanitizerTargets,
	taBand,
	type GuidanceConfig
} from './targets';

export function derivedParameterDefinitions(
	config: GuidanceConfig,
	latestCyaPpm: number | null
): ParameterDefinition[] {
	return PARAMETERS.map((parameter) => {
		switch (parameter.key) {
			case 'fc': {
				const levelLabels = sanitizerLevelLabel(config.sanitizer);
				const targets = sanitizerTargets(config, latestCyaPpm);
				if (targets === null) {
					// no meaningful target (outdoor pool, CYA ≈ 0) — the gauge must not
					// paint an "ok" band the engine would contradict
					return {
						...parameter,
						label: levelLabels.label,
						shortLabel: levelLabels.shortLabel,
						idealLow: undefined,
						idealHigh: undefined
					};
				}
				return {
					...parameter,
					label: levelLabels.label,
					shortLabel: levelLabels.shortLabel,
					idealLow: targets.min,
					idealHigh: targets.high,
					scaleMax: Math.max(parameter.scaleMax, Math.ceil(targets.high * 1.4))
				};
			}
			case 'cya': {
				const band = cyaBand(config);
				if (band === null) {
					// bromine pool: stabiliser is informational only
					return { ...parameter, idealLow: undefined, idealHigh: undefined };
				}
				return {
					...parameter,
					idealLow: band.low,
					idealHigh: band.high,
					scaleMax: Math.max(parameter.scaleMax, band.high + 20)
				};
			}
			case 'ph':
				return { ...parameter, idealLow: PH_BAND.low, idealHigh: PH_BAND.high };
			case 'ta': {
				const band = taBand(config);
				return { ...parameter, idealLow: band.low, idealHigh: band.high };
			}
			case 'ch': {
				const band = chBand(config);
				return { ...parameter, idealLow: band.low, idealHigh: band.high };
			}
			default:
				return parameter;
		}
	});
}
