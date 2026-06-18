<script lang="ts">
	import { ICON_PATHS, type IconName } from '../icons';

	let {
		name,
		size = 22,
		color = 'currentColor',
		strokeWidth = 1.7,
		fill = 'none',
		style = ''
	}: {
		name: IconName;
		size?: number;
		color?: string;
		strokeWidth?: number;
		fill?: string;
		style?: string;
	} = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	{fill}
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	style="display:block;stroke:{color};{style}"
>
	<path d={ICON_PATHS[name]} />
</svg>
