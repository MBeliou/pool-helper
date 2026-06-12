<script lang="ts">
	import { theme } from '../state/theme.svelte';

	let {
		series,
		timestamps,
		color,
		height = 150,
		band = false,
		bandLowFraction = 0.32,
		bandHighFraction = 0.62,
		dots = false,
		gradientId
	}: {
		series: number[];
		/** epoch ms per point — when provided, x positions reflect real time gaps */
		timestamps?: number[];
		color: string;
		height?: number;
		band?: boolean;
		/** ideal band bounds as 0..1 fractions of the chart scale */
		bandLowFraction?: number;
		bandHighFraction?: number;
		dots?: boolean;
		gradientId: string;
	} = $props();

	const palette = $derived(theme.palette);

	const CHART_WIDTH = 320;
	const PAD_X = 6;
	const PAD_Y = 14;

	// 0..1 horizontal position per point: real time gaps when timestamps are
	// usable, even index spacing otherwise
	const xFractions = $derived.by(() => {
		if (timestamps && timestamps.length === series.length) {
			const first = timestamps[0];
			const last = timestamps[timestamps.length - 1];
			if (last > first) return timestamps.map((timestamp) => (timestamp - first) / (last - first));
		}
		return series.map((_, index) => index / (series.length - 1));
	});

	const points = $derived(
		series.map((value, index) => ({
			x: PAD_X + xFractions[index] * (CHART_WIDTH - PAD_X * 2),
			y: PAD_Y + (1 - value) * (height - PAD_Y * 2)
		}))
	);

	// smoothed line through the points (quadratic segments through midpoints)
	const linePath = $derived.by(() => {
		let path = `M ${points[0].x},${points[0].y}`;
		for (let index = 1; index < points.length; index++) {
			const midX = (points[index - 1].x + points[index].x) / 2;
			const midY = (points[index - 1].y + points[index].y) / 2;
			path += ` Q ${points[index - 1].x},${points[index - 1].y} ${midX},${midY}`;
		}
		path += ` L ${points[points.length - 1].x},${points[points.length - 1].y}`;
		return path;
	});

	const areaPath = $derived(
		`${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`
	);
	const lastPoint = $derived(points[points.length - 1]);
	const bandTop = $derived(PAD_Y + (1 - bandHighFraction) * (height - PAD_Y * 2));
	const bandBottom = $derived(PAD_Y + (1 - bandLowFraction) * (height - PAD_Y * 2));
</script>

<svg
	width="100%"
	{height}
	viewBox="0 0 {CHART_WIDTH} {height}"
	preserveAspectRatio="none"
	style="display:block;overflow:visible;"
>
	<defs>
		<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0%" stop-color={color} stop-opacity="0.22" />
			<stop offset="100%" stop-color={color} stop-opacity="0" />
		</linearGradient>
	</defs>
	{#if band}
		<rect
			x="0"
			y={bandTop}
			width={CHART_WIDTH}
			height={bandBottom - bandTop}
			fill={palette.status.ok}
			opacity="0.10"
		/>
		{#each [bandTop, bandBottom] as bandY, bandIndex (bandIndex)}
			<line
				x1="0"
				y1={bandY}
				x2={CHART_WIDTH}
				y2={bandY}
				stroke={palette.status.ok}
				stroke-width="1"
				stroke-dasharray="2 4"
				opacity="0.5"
				vector-effect="non-scaling-stroke"
			/>
		{/each}
	{/if}
	<path d={areaPath} fill="url(#{gradientId})" />
	<path
		d={linePath}
		fill="none"
		stroke={color}
		stroke-width="2.5"
		stroke-linecap="round"
		stroke-linejoin="round"
		vector-effect="non-scaling-stroke"
	/>
	{#if dots}
		<circle
			cx={lastPoint.x}
			cy={lastPoint.y}
			r="4.5"
			fill={color}
			stroke={palette.card}
			stroke-width="2.5"
			vector-effect="non-scaling-stroke"
		/>
	{/if}
</svg>
