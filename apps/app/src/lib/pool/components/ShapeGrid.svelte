<script lang="ts">
	import { theme } from '../state/theme.svelte';

	let { value = $bindable(), onchange }: { value: string; onchange?: (shape: string) => void } =
		$props();

	const palette = $derived(theme.palette);

	const shapes = [
		{ kind: 'rect', label: 'Rectangle' },
		{ kind: 'oval', label: 'Oval' },
		{ kind: 'round', label: 'Round' },
		{ kind: 'kidney', label: 'Kidney' },
		{ kind: 'L', label: 'L-shape' },
		{ kind: 'free', label: 'Freeform' }
	];

	function pickShape(shapeLabel: string) {
		value = shapeLabel;
		onchange?.(shapeLabel);
	}

	function glyphStyle(kind: string, color: string): string {
		const base = `width:50px;height:34px;border:2.5px solid ${color};background:transparent;`;
		if (kind === 'round') return `${base}width:34px;border-radius:50%;`;
		if (kind === 'oval') return `${base}border-radius:50%;`;
		if (kind === 'kidney') return `${base}border-radius:45% 45% 55% 55% / 60% 60% 40% 40%;`;
		if (kind === 'free') return `${base}border-radius:62% 38% 50% 55% / 55% 48% 60% 50%;`;
		if (kind === 'L')
			return `width:38px;height:38px;border:2.5px solid ${color};clip-path:polygon(0 0,60% 0,60% 55%,100% 55%,100% 100%,0 100%);`;
		return `${base}border-radius:6px;`;
	}
</script>

<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px;">
	{#each shapes as shape (shape.kind)}
		{@const selected = value === shape.label}
		<button
			onclick={() => pickShape(shape.label)}
			style="background:{selected
				? `${palette.accent}10`
				: palette.card};border-radius:18px;padding:16px 6px 11px;box-shadow:{selected
				? 'none'
				: palette.shadow};border:2px solid {selected
				? palette.accent
				: 'transparent'};display:flex;flex-direction:column;align-items:center;gap:12px;"
		>
			<div style="height:40px;display:grid;place-items:center;">
				<div style={glyphStyle(shape.kind, selected ? palette.accent : palette.inkMuted)}></div>
			</div>
			<span
				style="font-size:12.5px;font-weight:{selected ? 700 : 600};color:{selected
					? palette.accent
					: palette.ink};">{shape.label}</span
			>
		</button>
	{/each}
</div>
