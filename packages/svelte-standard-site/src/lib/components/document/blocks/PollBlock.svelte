<script lang="ts">
	interface PollOption {
		text: string;
	}

	interface PollVote {
		voter_did: string;
		record: {
			option: string[];
		};
	}

	interface Props {
		block: {
			pollRef: {
				uri: string;
				cid: string;
			};
		};
		pollData?: {
			record: {
				options: PollOption[];
			};
			atp_poll_votes: PollVote[];
		};
		hasTheme?: boolean;
	}

	const { block, pollData, hasTheme = false }: Props = $props();

	const totalVotes = $derived(pollData?.atp_poll_votes.length || 0);

	function getVoteOption(voteRecord: any): string | null {
		try {
			return voteRecord.option && voteRecord.option.length > 0 ? voteRecord.option[0] : null;
		} catch {
			return null;
		}
	}

	function getVotesForOption(optionIndex: number): number {
		if (!pollData) return 0;
		return pollData.atp_poll_votes.filter((v) => getVoteOption(v.record) === optionIndex.toString())
			.length;
	}

	function getHighestVotes(): number {
		if (!pollData) return 0;
		const options = pollData.record.options;
		return Math.max(...options.map((_, i) => getVotesForOption(i)));
	}
</script>

{#if !pollData}
	<div
		class="my-2 rounded-md border bg-white p-6 dark:bg-gray-900"
		style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
		class:border-gray-200={!hasTheme}
		class:dark:border-gray-700={!hasTheme}
	>
		<div class="mb-3 flex items-center gap-2 text-sm font-medium">
			<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
				/>
			</svg>
			<span>Poll Reference</span>
		</div>
		<p class="text-sm opacity-70">
			Poll: <code class="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800"
				>{block.pollRef.uri}</code
			>
		</p>
	</div>
{:else}
	<div
		class="poll my-2 flex w-full flex-col gap-2 rounded-md border p-3"
		style:border-color={hasTheme ? 'var(--theme-accent)' : undefined}
		style:background-color={hasTheme
			? 'color-mix(in oklab, var(--theme-accent), white 85%)'
			: '#f0f9ff'}
		class:border-gray-200={!hasTheme}
		class:dark:border-gray-700={!hasTheme}
	>
		<!-- Poll Results (Read-only) -->
		{#each pollData.record.options as option, index}
			{@const votes = getVotesForOption(index)}
			{@const isWinner = totalVotes > 0 && votes === getHighestVotes()}
			{@const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0}

			<div
				class="pollResult relative grow overflow-hidden rounded-md px-2 py-0.5 {isWinner
					? 'border-2 border-blue-600 font-bold dark:border-blue-400'
					: 'border border-blue-600 dark:border-blue-400'}"
			>
				<div
					class="pollResultContent relative z-10 flex justify-between gap-2"
					style="color: {hasTheme ? 'var(--theme-accent)' : '#1e40af'};"
				>
					<div class="max-w-full grow truncate">{option.text}</div>
					<div class="tabular-nums">{votes}</div>
				</div>
				<div class="pollResultBG absolute top-0 right-0 bottom-0 left-0 z-0 flex w-full flex-row">
					<div
						class="m-0.5 rounded-[2px]"
						style="background-color: {hasTheme
							? 'var(--theme-accent)'
							: '#3b82f6'}; width: {percentage}%; min-width: 4px;"
					></div>
					<div></div>
				</div>
			</div>
		{/each}

		<div class="pt-2 text-center text-sm text-gray-600 dark:text-gray-400">
			{totalVotes}
			{totalVotes === 1 ? 'vote' : 'votes'}
		</div>
	</div>
{/if}
