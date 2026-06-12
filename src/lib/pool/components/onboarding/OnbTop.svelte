<script lang="ts">
	import { theme } from '../../state/theme.svelte';

	let { step, label, stepCount = 4 }: { step: number; label: string; stepCount?: number } =
		$props();
	const palette = $derived(theme.palette);
</script>

<div style="flex-shrink:0;padding:0 22px;">
	<div class="safe-top"></div>
	<div style="display:flex;gap:6px;">
		{#each Array.from({ length: stepCount }) as _, stepIndex (stepIndex)}
			<div
				style="flex:1;height:5px;border-radius:999px;background:{stepIndex < step
					? palette.accent
					: palette.line};"
			></div>
		{/each}
	</div>
	<div style="font-size:12.5px;color:{palette.inkMuted};margin-top:8px;font-weight:600;">
		{label}
	</div>
</div>
