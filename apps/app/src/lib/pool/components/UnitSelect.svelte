<script lang="ts">
	import { theme } from '../state/theme.svelte';
	import Icon from './Icon.svelte';

	let {
		options,
		value = $bindable(),
		onchange,
		name = ''
	}: {
		options: readonly string[];
		value: string;
		onchange?: (selected: string) => void;
		name?: string;
	} = $props();

	const palette = $derived(theme.palette);
</script>

<!-- chip-styled native select: iOS presents its system picker wheel -->
<label
	style="position:relative;display:inline-flex;align-items:center;gap:5px;font-size:13.5px;font-weight:700;color:{palette.ink};background:{palette.page};border:1px solid {palette.line};padding:7px 11px;border-radius:10px;"
>
	{value}
	<Icon
		name="chevron"
		size={12}
		color={palette.inkMuted}
		strokeWidth={2.2}
		style="transform:rotate(90deg);"
	/>
	<select
		{name}
		bind:value
		onchange={() => onchange?.(value)}
		style="position:absolute;inset:0;width:100%;height:100%;opacity:0;appearance:none;-webkit-appearance:none;font-size:16px;"
	>
		{#each options as option (option)}
			<option value={option}>{option}</option>
		{/each}
	</select>
</label>
