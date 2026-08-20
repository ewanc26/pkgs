<script lang="ts">
	import { Heart, Star, ArrowUpRight } from '@lucide/svelte';

	interface Props {
		/** Project name, used in the copy. */
		name: string;
		/** Ko-fi one-off tip link. */
		kofiUrl?: string;
		/** GitHub Sponsors link. */
		sponsorsUrl?: string;
		/** Repo link, used for the "star it instead" alternative. */
		githubUrl?: string;
	}

	let {
		name,
		kofiUrl = 'https://ko-fi.com/ewancroft',
		sponsorsUrl = 'https://github.com/sponsors/ewanc26',
		githubUrl
	}: Props = $props();
</script>

<section class="support">
	<span class="support-icon"><Heart size={18} /></span>
	<h2>{name} is free, and staying that way</h2>
	<p>
		No ads, no accounts, no tracking — just a tool that does the job and gets out of the way.
		If it saved you an afternoon, chipping in helps keep it maintained.
	</p>

	<div class="support-actions">
		<a href={kofiUrl} target="_blank" rel="noopener" class="btn-support">
			<Heart size={14} /> Buy me a coffee
		</a>
		<a href={sponsorsUrl} target="_blank" rel="noopener" class="btn-ghost">
			Sponsor monthly <ArrowUpRight size={14} />
		</a>
	</div>

	<p class="support-alt">
		Rather not? {#if githubUrl}<a href={githubUrl} target="_blank" rel="noopener"
			><Star size={11} /> Star the repo</a
		>{:else}A star on the repo{/if} or a word to someone who'd use it helps just as much.
	</p>
</section>

<style>
	.support {
		position: relative;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		padding: 2rem 2rem 1.75rem;
		text-align: center;
		margin-bottom: 3rem;
		overflow: hidden;
		box-shadow:
			0 1px 0 0 rgba(255, 255, 255, 0.03) inset,
			0 24px 48px -32px rgba(0, 0, 0, 0.55);
	}

	.support::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse 70% 90% at 50% -20%, var(--accent-glow), transparent 60%);
		pointer-events: none;
	}

	.support > * {
		position: relative;
	}

	.support-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--bg);
		border: 1px solid var(--border);
		color: var(--accent);
		margin-bottom: 0.85rem;
	}

	.support h2 {
		font-size: 1.15rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--text);
		margin: 0 0 0.5rem;
	}

	.support p {
		font-size: 0.875rem;
		color: var(--muted);
		line-height: 1.6;
		max-width: 42ch;
		margin: 0 auto 1.5rem;
	}

	.support-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 1.25rem;
	}

	.btn-support {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--accent);
		color: var(--bg);
		font-weight: 600;
		font-size: 0.875rem;
		padding: 0.6rem 1.15rem;
		border-radius: 6px;
		text-decoration: none;
		transition:
			transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 0.2s ease;
	}

	.btn-support:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 24px -8px var(--accent-glow);
		text-decoration: none;
	}

	.btn-support:active {
		transform: translateY(0);
	}

	.support-alt {
		font-size: 0.75rem;
		color: var(--muted);
		opacity: 0.75;
		margin: 0;
	}

	.support-alt a {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--muted);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.support-alt a:hover {
		color: var(--accent);
	}

	@media (max-width: 480px) {
		.support {
			padding: 1.75rem 1.25rem 1.5rem;
		}
	}
</style>
