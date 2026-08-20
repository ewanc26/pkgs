<script lang="ts">
	interface Props {
		/** Monospace section index, e.g. "02". Omit to hide. */
		index?: string;
		title: string;
		sub?: string;
	}

	let { index, title, sub }: Props = $props();
</script>

<div class="section-heading">
	<div class="label-row">
		{#if index}
			<span class="idx">{index}</span>
		{/if}
		<h2>{title}</h2>
		<span class="rule"></span>
	</div>
	{#if sub}
		<p class="section-sub">{sub}</p>
	{/if}
</div>

<style>
	.section-heading {
		margin-bottom: 1.5rem;
	}

	.label-row {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.idx {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--accent);
		letter-spacing: 0.1em;
		flex-shrink: 0;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--text);
		letter-spacing: -0.02em;
		margin: 0;
		flex-shrink: 0;
	}

	/* Hairline that runs to the edge and fades, echoing the terminal rules. */
	.rule {
		flex: 1;
		height: 1px;
		min-width: 1.5rem;
		background: linear-gradient(to right, var(--border), transparent);
		transform: translateY(-0.25rem);
	}

	.section-sub {
		font-size: 0.825rem;
		color: var(--muted);
		line-height: 1.5;
		margin: 0.5rem 0 0;
	}
</style>
