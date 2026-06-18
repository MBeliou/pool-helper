<script lang="ts">
	let { kind, color }: { kind: string; color: string } = $props();
</script>

<svg
	width="26"
	height="26"
	viewBox="0 0 24 24"
	fill="none"
	stroke-width="1.7"
	stroke-linecap="round"
	stroke-linejoin="round"
	style="stroke:{color}"
>
	{#if kind === 'cloudy'}
		<path d="M7 17.5h9a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 5.6 11 3.2 3.2 0 0 0 6.5 17.5Z" />
	{:else if kind === 'green'}
		<path d="M12 3.5c3.2 3.7 5.5 6.3 5.5 9.2A5.5 5.5 0 0 1 6.5 12.7c0-2.9 2.3-5.5 5.5-9.2Z" />
	{:else if kind === 'algae'}
		<path d="M5 19c0-7.5 5.5-12 13-12 0 7.5-4.7 13-13 12Z" />
		<path d="M5.5 18.5c2.7-3.6 5.5-5.6 8.5-6.5" />
	{:else if kind === 'eye'}
		<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z" />
		<circle cx="12" cy="12" r="2.7" />
	{:else if kind === 'smell'}
		<path d="M7 16c2-1 2-3 0-4s-2-3 0-4" />
		<path d="M12 16c2-1 2-3 0-4s-2-3 0-4" />
		<path d="M17 16c2-1 2-3 0-4s-2-3 0-4" />
	{:else if kind === 'foam'}
		<circle cx="8" cy="15" r="3.2" />
		<circle cx="16" cy="13" r="2.3" />
		<circle cx="13" cy="17.5" r="1.6" />
	{/if}
</svg>
