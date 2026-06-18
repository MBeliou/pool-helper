<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { theme } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { daysSince, formatShortDate, formatWeekdayTime } from '$lib/pool/format';
	import { localeTag } from '$lib/pool/localeFormat';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import {
		getIssue,
		listEventsForIssue,
		listIssues,
		resolveIssue
	} from '$lib/pool/db/issuesRepository';
	import type { IssueRow, IssueEventRow } from '$lib/pool/db/schema';

	const palette = $derived(theme.palette);

	let issue = $state<IssueRow | undefined>(undefined);
	let events = $state<IssueEventRow[]>([]);
	let loaded = $state(false);

	onMount(async () => {
		await app.load();
		const requestedId = Number(page.url.searchParams.get('issue'));
		issue =
			Number.isFinite(requestedId) && requestedId > 0 ? await getIssue(requestedId) : undefined;
		if (!issue) issue = (await listIssues())[0]; // direct visit fallback
		if (issue) events = await listEventsForIssue(issue.id);
		loaded = true;
	});

	const headerSubtitle = $derived.by(() => {
		if (!issue) return '';
		if (issue.resolvedAt) return `Resolved ${formatShortDate(issue.resolvedAt)}`;
		const startedWeekday = issue.startedAt.toLocaleDateString(localeTag(), { weekday: 'short' });
		const dayCount = `Day ${daysSince(issue.startedAt) + 1}${issue.expectedDays ? ` of ~${issue.expectedDays}` : ''}`;
		return `Started ${startedWeekday} · ${dayCount}`;
	});

	function eventWhenText(event: IssueEventRow): string {
		if (event.whenLabel) return event.whenLabel;
		if (event.happenedAt) return formatWeekdayTime(event.happenedAt);
		return '';
	}

	async function markResolved() {
		if (issue && !issue.resolvedAt) await resolveIssue(issue.id);
		goto('/care');
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader title={issue?.title ?? 'Issue'} sub={headerSubtitle}>
		{#snippet right()}
			{#if issue && !issue.resolvedAt}
				<span
					style="font-family:var(--font-display);font-weight:700;font-size:13px;color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);padding:6px 11px;border-radius:999px;"
					>{Math.round(issue.progress * 100)}%</span
				>
			{/if}
		{/snippet}
	</NavHeader>
	<div class="scroll" style="padding:14px 18px 0;">
		{#if issue?.banner}
			<div
				style="display:flex;align-items:center;gap:11px;background:{palette.status
					.ok}14;border:1px solid {palette.status
					.ok}33;border-radius:14px;padding:12px 14px;margin-bottom:18px;"
			>
				<div style="color:{palette.status.ok};flex-shrink:0;">
					<Icon name="trend" size={20} strokeWidth={1.9} />
				</div>
				<div style="font-size:13px;color:{palette.ink};line-height:1.3;">{issue.banner}</div>
			</div>
		{/if}
		<div
			style="font-family:var(--font-display);font-weight:600;font-size:16px;color:{palette.ink};margin-bottom:14px;"
		>
			Timeline
		</div>
		<div style="display:flex;flex-direction:column;">
			{#each events as event, eventIndex (event.id)}
				{@const done = event.state === 'done'}
				{@const active = event.state === 'active'}
				<div
					style="display:flex;gap:13px;position:relative;padding-bottom:{eventIndex <
					events.length - 1
						? 18
						: 0}px;"
				>
					{#if eventIndex < events.length - 1}
						<div
							style="position:absolute;left:10px;top:22px;bottom:0;width:2px;background:{palette.line};"
						></div>
					{/if}
					<div
						style="width:22px;height:22px;border-radius:999px;flex-shrink:0;z-index:1;display:grid;place-items:center;background:{done
							? palette.status.ok
							: active
								? palette.accent
								: palette.card};border:{done
							? 'none'
							: `2px solid ${active ? palette.accent : palette.line}`};color:#fff;font-size:12px;font-weight:800;box-shadow:{active
							? `0 0 0 4px ${palette.accent}22`
							: 'none'};"
					>
						{done ? '✓' : ''}
					</div>
					<div style="flex:1;padding-top:1px;">
						<div
							style="font-size:14.5px;font-weight:{active ? 700 : 500};color:{done
								? palette.inkMuted
								: palette.ink};"
						>
							{event.title}
						</div>
						<div
							style="font-size:12px;color:{active
								? palette.accent
								: palette.inkMuted};margin-top:1px;"
						>
							{eventWhenText(event)}
						</div>
					</div>
				</div>
			{/each}
			{#if loaded && !issue}
				<div
					style="background:{palette.card};border-radius:16px;padding:18px 15px;box-shadow:{palette.shadow};text-align:center;font-size:14px;color:{palette.inkMuted};"
				>
					No issue selected — head back to Pool care.
				</div>
			{/if}
		</div>
	</div>
	<div style="flex-shrink:0;display:flex;gap:12px;padding:10px 18px 12px;">
		{#if issue && !issue.resolvedAt}
			<button
				onclick={markResolved}
				style="flex:1;text-align:center;padding:14px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:15px;color:{palette.ink};background:{palette.card};box-shadow:{palette.shadow};"
				>Mark resolved</button
			>
		{/if}
		<button
			onclick={() => goto('/log/new')}
			style="flex:1;text-align:center;padding:14px;border-radius:15px;border:none;font-family:var(--font-sans);font-weight:700;font-size:15px;color:#fff;background:{palette.accent};"
			>Log re-test</button
		>
	</div>
	<TabBar />
</div>
