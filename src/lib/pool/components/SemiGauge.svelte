<script lang="ts">
	import { theme } from '../state/theme.svelte';

	let {
		radius,
		value,
		unit = '',
		fraction,
		idealLow,
		idealHigh,
		statusColor,
		track,
		ticks = false
	}: {
		radius: number;
		value: string;
		unit?: string;
		fraction: number;
		idealLow: number;
		idealHigh: number;
		statusColor: string;
		track: string;
		ticks?: boolean;
	} = $props();

	const palette = $derived(theme.palette);

	const STROKE_WIDTH = 9;
	const TICK_COUNT = 10;

	const width = $derived(radius * 2 + 16);
	const centerX = $derived(width / 2);
	const centerY = $derived(radius + 8);
	const arcLength = $derived(Math.PI * radius);

	// semicircle: fraction 0 = left, 0.5 = top, 1 = right
	function pointOnArc(arcRadius: number, arcFraction: number): [number, number] {
		const angle = ((180 - 180 * arcFraction) * Math.PI) / 180;
		return [centerX + arcRadius * Math.cos(angle), centerY - arcRadius * Math.sin(angle)];
	}

	const tickLines = $derived(
		Array.from({ length: TICK_COUNT + 1 }, (_, tickIndex) => {
			const tickFraction = tickIndex / TICK_COUNT;
			const major = tickIndex % 5 === 0;
			const outerRadius = radius - STROKE_WIDTH / 2 - 2.5;
			const innerRadius = outerRadius - (major ? 7 : 4);
			const [outerX, outerY] = pointOnArc(outerRadius, tickFraction);
			const [innerX, innerY] = pointOnArc(innerRadius, tickFraction);
			return { outerX, outerY, innerX, innerY, major };
		})
	);
</script>

<svg
	{width}
	height={centerY + 10}
	viewBox="0 0 {width} {centerY + 10}"
	style="display:block;overflow:visible;"
>
	<path
		d="M8 {centerY} A {radius} {radius} 0 0 1 {width - 8} {centerY}"
		fill="none"
		stroke={track}
		stroke-width={STROKE_WIDTH}
		stroke-linecap="round"
	/>
	{#if idealHigh > idealLow}
		<path
			d="M8 {centerY} A {radius} {radius} 0 0 1 {width - 8} {centerY}"
			fill="none"
			stroke={palette.idealBand}
			stroke-width={STROKE_WIDTH}
			stroke-dasharray="0 {arcLength * idealLow} {arcLength * (idealHigh - idealLow)} {arcLength *
				2}"
			stroke-linecap="butt"
		/>
	{/if}
	{#if ticks}
		{#each tickLines as tick, tickIndex (tickIndex)}
			<line
				x1={tick.outerX}
				y1={tick.outerY}
				x2={tick.innerX}
				y2={tick.innerY}
				stroke={palette.inkMuted}
				stroke-width={tick.major ? 1.8 : 1.2}
				opacity={tick.major ? 0.55 : 0.35}
				stroke-linecap="round"
			/>
		{/each}
	{/if}
	<path
		d="M8 {centerY} A {radius} {radius} 0 0 1 {width - 8} {centerY}"
		fill="none"
		stroke={statusColor}
		stroke-width={STROKE_WIDTH}
		stroke-dasharray="{arcLength * fraction} {arcLength * 2}"
		stroke-linecap="round"
	/>
	<text
		x={centerX}
		y={centerY - radius * 0.14}
		text-anchor="middle"
		font-family="var(--font-display)"
		font-weight="600"
		font-size={radius * 0.46}
		fill={palette.ink}>{value}</text
	>
	{#if unit}
		<text
			x={centerX}
			y={centerY - radius * 0.14 + radius * 0.3}
			text-anchor="middle"
			font-family="var(--font-sans)"
			font-size={radius * 0.2}
			fill={palette.inkMuted}>{unit}</text
		>
	{/if}
</svg>
