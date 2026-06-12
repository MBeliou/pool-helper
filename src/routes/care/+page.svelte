<script lang="ts">
	import { onMount } from 'svelte';
	import { theme, statusColor } from '$lib/pool/state/theme.svelte';
	import { app } from '$lib/pool/state/app.svelte';
	import { daysSince, formatShortDate, relativeAge } from '$lib/pool/format';
	import Icon from '$lib/pool/components/Icon.svelte';
	import NavHeader from '$lib/pool/components/NavHeader.svelte';
	import TabBar from '$lib/pool/components/TabBar.svelte';
	import { listIssues } from '$lib/pool/db/issuesRepository';
	import type { IssueRow } from '$lib/pool/db/schema';

	const palette = $derived(theme.palette);

	let issues = $state<IssueRow[]>([]);
	let loaded = $state(false);

	onMount(async () => {
		await app.load();
		issues = await listIssues();
		loaded = true;
	});

	const activeCount = $derived(issues.filter((issue) => !issue.resolvedAt).length);

	function issueAgeText(issue: IssueRow): string {
		if (issue.resolvedAt) return formatShortDate(issue.resolvedAt);
		if (issue.expectedDays) {
			return `Day ${daysSince(issue.startedAt) + 1} of ~${issue.expectedDays}`;
		}
		return relativeAge(issue.startedAt);
	}
</script>

<div class="screen" style="background:{palette.page};">
	<NavHeader large title="Pool care" sub="Issues you're working through" />
	<div class="scroll" style="padding:16px 18px 0;">
		<!-- diagnose CTA -->
		<a
			href="/care/diagnose/1"
			style="display:flex;align-items:center;gap:13px;background:{palette.accent};border-radius:18px;padding:15px 16px;margin-bottom:20px;"
		>
			<div
				style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.2);display:grid;place-items:center;color:#fff;flex-shrink:0;"
			>
				<Icon name="shield" size={22} strokeWidth={1.8} />
			</div>
			<div style="flex:1;">
				<div style="font-weight:800;font-size:16px;color:#fff;">Diagnose an issue</div>
				<div style="font-size:12.5px;color:rgba(255,255,255,.85);">Cloudy, green, irritation…</div>
			</div>
			<Icon name="plus" size={22} color="#fff" strokeWidth={2.2} />
		</a>
		<div
			style="font-family:var(--font-display);font-weight:600;font-size:16px;color:{palette.ink};margin-bottom:11px;"
		>
			Active · {activeCount}
		</div>
		<div style="display:flex;flex-direction:column;gap:11px;">
			{#each issues as issue (issue.id)}
				{@const resolved = Boolean(issue.resolvedAt)}
				<a
					href="/care/timeline?issue={issue.id}"
					style="display:block;background:{palette.card};border-radius:16px;padding:13px 15px;box-shadow:{palette.shadow};opacity:{resolved
						? 0.7
						: 1};"
				>
					<div style="display:flex;align-items:flex-start;gap:11px;">
						<div
							style="width:11px;height:11px;border-radius:999px;background:{statusColor(
								palette,
								issue.statusKey
							)};margin-top:4px;flex-shrink:0;"
						></div>
						<div style="flex:1;min-width:0;">
							<div
								style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;"
							>
								<span
									style="font-weight:700;font-size:15.5px;color:{resolved
										? palette.inkMuted
										: palette.ink};">{issue.title}</span
								>
								<span
									style="font-size:11.5px;color:{palette.inkMuted};white-space:nowrap;flex-shrink:0;"
									>{issueAgeText(issue)}</span
								>
							</div>
							<div style="font-size:12.5px;color:{palette.inkMuted};margin-top:1px;">
								{issue.subtitle}
							</div>
							{#if !resolved}
								<div
									style="height:5px;background:{palette.line};border-radius:999px;margin-top:10px;"
								>
									<div
										style="width:{issue.progress * 100}%;height:100%;background:{statusColor(
											palette,
											issue.statusKey
										)};border-radius:999px;"
									></div>
								</div>
							{/if}
						</div>
						{#if resolved}
							<div style="color:{palette.status.ok};flex-shrink:0;">
								<Icon name="shield" size={18} strokeWidth={1.9} />
							</div>
						{/if}
					</div>
				</a>
			{/each}
			{#if loaded && issues.length === 0}
				<div
					style="background:{palette.card};border-radius:16px;padding:18px 15px;box-shadow:{palette.shadow};text-align:center;font-size:14px;color:{palette.inkMuted};"
				>
					No issues on record — your pool's having a good run.
				</div>
			{/if}
		</div>
	</div>
	<TabBar />
</div>
