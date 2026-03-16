<script lang="ts">
	import Card from '../../../ui/Card.svelte';
	import InternalCard from '../../../ui/InternalCard.svelte';
	import { formatRelativeTime } from '../../../../utils/locale.js';
	import { ExternalLink, Rss } from '@lucide/svelte';

	export interface FeedItem {
		/** Unique key — used as a Svelte `{#each}` key. Falls back to `title` when omitted. */
		id?: string;
		/** Primary label for the item. Required. */
		title: string;
		/** Short supporting copy shown below the title. */
		description?: string;
		/** When provided the item renders as an `<a>` pointing here. */
		href?: string;
		/** Avatar / thumbnail URL rendered at the leading edge of the row. */
		avatarUrl?: string;
		/**
		 * Fallback shown inside the avatar slot when `avatarUrl` is absent.
		 * Accepts an emoji or up to two characters (initials).
		 */
		iconFallback?: string;
		/** ISO-8601 date string used to produce a relative timestamp. */
		timestamp?: string;
		/** Short label rendered as a badge on the trailing edge. */
		badge?: string;
	}

	interface Props {
		items?: FeedItem[] | null;
		/** Optional heading rendered at the top of the card. */
		title?: string;
		/** Overrides the default "Nothing here yet" empty-state copy. */
		emptyMessage?: string;
	}

	let {
		items = null,
		title = 'Feed',
		emptyMessage = 'Nothing here yet.'
	}: Props = $props();

	function itemKey(item: FeedItem, index: number): string {
		return item.id ?? `${item.title}-${index}`;
	}
</script>

<div class="mx-auto w-full max-w-2xl">
	{#if !items}
		<!-- Loading skeleton -->
		<Card loading={true} variant="elevated" padding="md">
			{#snippet skeleton()}
				<div class="mb-4 h-6 w-36 rounded bg-canvas-300 dark:bg-canvas-700"></div>
				<div class="space-y-3">
					{#each Array(3) as _}
						<div class="flex items-start gap-3 rounded-lg bg-canvas-200 p-4 dark:bg-canvas-800">
							<div class="h-10 w-10 shrink-0 rounded-full bg-canvas-300 dark:bg-canvas-700"></div>
							<div class="flex-1 space-y-2">
								<div class="h-4 w-3/4 rounded bg-canvas-300 dark:bg-canvas-700"></div>
								<div class="h-3 w-full rounded bg-canvas-300 dark:bg-canvas-700"></div>
								<div class="h-3 w-16 rounded bg-canvas-300 dark:bg-canvas-700"></div>
							</div>
						</div>
					{/each}
				</div>
			{/snippet}
		</Card>
	{:else if items.length > 0}
		<Card variant="elevated" padding="md">
			{#snippet children()}
				<div class="mb-4 flex items-center gap-2">
					<Rss class="h-4 w-4 text-primary-600 dark:text-primary-400" aria-hidden="true" />
					<h2 class="text-2xl font-bold text-ink-900 dark:text-ink-50">{title}</h2>
				</div>
				<div class="space-y-3">
					{#each items as item, index (itemKey(item, index))}
						<InternalCard href={item.href}>
							{#snippet children()}
								<!-- Avatar / icon slot -->
								<div class="shrink-0">
									{#if item.avatarUrl}
										<img
											src={item.avatarUrl}
											alt=""
											class="h-10 w-10 rounded-full object-cover"
											loading="lazy"
											role="presentation"
										/>
									{:else}
										<div
											class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-200 text-base font-semibold text-primary-700 dark:bg-primary-800 dark:text-primary-300"
											role="presentation"
											aria-hidden="true"
										>
											{item.iconFallback?.slice(0, 2) ?? title.charAt(0).toUpperCase()}
										</div>
									{/if}
								</div>

								<!-- Content -->
								<div class="min-w-0 flex-1 space-y-1">
									<p class="overflow-wrap-anywhere font-semibold leading-snug wrap-break-word text-ink-900 dark:text-ink-50">
										{item.title}
									</p>
									{#if item.description}
										<p class="overflow-wrap-anywhere line-clamp-2 text-sm wrap-break-word text-ink-700 dark:text-ink-200">
											{item.description}
										</p>
									{/if}
									{#if item.timestamp}
										<time
											datetime={item.timestamp}
											class="block text-xs font-medium text-ink-600 dark:text-ink-400"
										>
											{formatRelativeTime(item.timestamp)}
										</time>
									{/if}
								</div>

								<!-- Trailing slot: badge + external-link icon -->
								<div class="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
									{#if item.href}
										<ExternalLink
											class="h-4 w-4 text-ink-700 transition-colors dark:text-ink-200"
											aria-hidden="true"
										/>
									{/if}
									{#if item.badge}
										<span
											class="rounded bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white uppercase dark:bg-accent-600"
										>
											{item.badge}
										</span>
									{/if}
								</div>
							{/snippet}
						</InternalCard>
					{/each}
				</div>
			{/snippet}
		</Card>
	{:else}
		<!-- Empty state -->
		<Card variant="flat" padding="lg">
			{#snippet children()}
				<div class="text-center">
					<p class="text-ink-700 dark:text-ink-300">{emptyMessage}</p>
				</div>
			{/snippet}
		</Card>
	{/if}
</div>
