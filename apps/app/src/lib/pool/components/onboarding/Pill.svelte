<script lang="ts">
	import { theme } from '../../state/theme.svelte';

	let {
		selected = false,
		label,
		onclick
	}: { selected?: boolean; label: string; onclick?: () => void } = $props();
	const palette = $derived(theme.palette);
</script>

<button
	{onclick}
	style="padding:9px 15px;border-radius:999px;font-family:var(--font-sans);font-size:14px;font-weight:{selected
		? 700
		: 500};background:{selected ? `${palette.accent}15` : palette.card};color:{selected
		? palette.accent
		: palette.ink};border:1.5px solid {selected
		? palette.accent
		: palette.line};box-shadow:{selected ? 'none' : palette.shadow};white-space:nowrap;"
	>{label}</button
>
