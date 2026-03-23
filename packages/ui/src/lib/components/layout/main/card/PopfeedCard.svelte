<script lang="ts">
	import Card from '../../../ui/Card.svelte';
	import { ExternalLink, Star } from '@lucide/svelte';
	import type { PopfeedReview, PopfeedCreativeWorkType } from '@ewanc26/atproto';
	import InternalCard from '../../../ui/InternalCard.svelte';
	import NoiseImage from '../../../ui/NoiseImage.svelte';
	import { formatRelativeTime } from '../../../../utils/locale.js';

	interface Props {
		reviews?: PopfeedReview[] | null;
		/** The handle of the account, used to build Popfeed review URLs. */
		handle?: string | null;
	}

	let { reviews = null, handle = null }: Props = $props();

	const TYPE_LABELS: Record<PopfeedCreativeWorkType, string> = {
		movie: 'Film',
		tv_show: 'TV Show',
		tv_season: 'TV Season',
		tv_episode: 'Episode',
		episode: 'Episode',
		video_game: 'Game',
		album: 'Album',
		ep: 'EP',
		track: 'Track',
		book: 'Book',
		book_series: 'Book Series'
	};

	function popfeedUrl(h: string | null | undefined, rkey: string): string {
		if (h) return `https://popfeed.app/u/${h}/review/${rkey}`;
		return 'https://popfeed.app';
	}

	function formatRating(rating: number): string {
		return `${rating % 1 === 0 ? rating : rating.toFixed(1)}/10`;
	}
</script>

<div class="mx-auto w-full max-w-2xl">
	{#if !reviews}
		<Card loading={true} variant="elevated" padding="md">
			{#snippet skeleton()}
				<div class="mb-4 h-6 w-40 rounded bg-canvas-300 dark:bg-canvas-700"></div>
				<div class="space-y-3">
					{#each Array(3) as _}
						<div class="rounded-lg bg-canvas-200 p-4 dark:bg-canvas-800">
							<div class="flex items-start gap-3">
								<div class="h-12 w-9 shrink-0 rounded bg-canvas-300 dark:bg-canvas-700"></div>
								<div class="flex-1 space-y-2">
									<div class="h-3 w-16 rounded bg-canvas-300 dark:bg-canvas-700"></div>
									<div class="h-4 w-2/3 rounded bg-canvas-300 dark:bg-canvas-700"></div>
									<div class="h-3 w-24 rounded bg-canvas-300 dark:bg-canvas-700"></div>
								</div>
								<div class="h-4 w-12 shrink-0 rounded bg-canvas-300 dark:bg-canvas-700"></div>
							</div>
						</div>
					{/each}
				</div>
			{/snippet}
		</Card>
	{:else if reviews.length > 0}
		<Card variant="elevated" padding="md">
			{#snippet children()}
				<h2 class="mb-4 text-2xl font-bold text-ink-900 dark:text-ink-50">Recent Reviews</h2>
				<div class="space-y-3">
					{#each reviews as review (review.rkey)}
						<InternalCard href={popfeedUrl(handle, review.rkey)}>
							{#snippet children()}
								<!-- Poster thumbnail -->
								<div class="shrink-0">
									<NoiseImage
										src={review.posterUrl}
										seed={review.title ?? review.rkey}
										alt={review.title ? `Poster for ${review.title}` : 'Review poster'}
										class="h-12 w-9 rounded object-cover object-top"
									/>
								</div>

								<!-- Metadata -->
								<div class="relative min-w-0 flex-1 space-y-1.5">
									{#if review.creativeWorkType}
										<div class="flex flex-wrap items-center gap-2">
											<span class="rounded bg-accent-500 px-2 py-0.5 text-xs font-semibold text-white uppercase dark:bg-accent-600">
												{TYPE_LABELS[review.creativeWorkType] ?? review.creativeWorkType}
											</span>
										</div>
									{/if}
									{#if review.title}
										<h4 class="overflow-wrap-anywhere font-semibold wrap-break-word text-ink-900 dark:text-ink-50">
											{review.title}
										</h4>
									{/if}
									{#if review.mainCredit}
										<p class="overflow-wrap-anywhere line-clamp-1 text-sm wrap-break-word text-ink-700 dark:text-ink-200">
											{review.mainCredit}
										</p>
									{/if}
									<div class="pt-1">
										<time datetime={review.createdAt} class="text-xs font-medium text-ink-800 dark:text-ink-100">
											{formatRelativeTime(review.createdAt)}
										</time>
									</div>
								</div>

								<!-- Right: link icon + rating -->
								<div class="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
									<ExternalLink class="h-4 w-4 text-ink-700 transition-colors dark:text-ink-200" aria-hidden="true" />
									<div class="flex items-center gap-1.5 rounded bg-ink-100 px-2 py-0.5 dark:bg-ink-800" aria-label="Rating: {formatRating(review.rating)}">
										<Star class="h-3 w-3 text-ink-700 dark:text-ink-200" aria-hidden="true" />
										<span class="text-xs font-medium text-ink-800 dark:text-ink-100">{formatRating(review.rating)}</span>
									</div>
								</div>
							{/snippet}
						</InternalCard>
					{/each}
				</div>
			{/snippet}
		</Card>
	{/if}
</div>
