<script lang="ts">
	import { Heart, ArrowUpRight, Star } from '@lucide/svelte';
</script>

<section class="support">
	<div class="support-text">
		<span class="support-icon"><Heart size={16} aria-hidden="true" /></span>
		<h2>All of this is free</h2>
		<p>
			Every tool here runs in your browser, takes no accounts, and tracks nothing. If one of them
			saved you an afternoon, chipping in keeps them maintained.
		</p>
	</div>

	<div class="support-actions">
		<a href="https://ko-fi.com/ewancroft" target="_blank" rel="noopener" class="btn-support">
			<Heart size={14} aria-hidden="true" /> Buy me a coffee
		</a>
		<a href="https://github.com/sponsors/ewanc26" target="_blank" rel="noopener" class="btn-ghost">
			Sponsor monthly <ArrowUpRight size={14} aria-hidden="true" />
		</a>
		<a href="https://github.com/ewanc26/pkgs" target="_blank" rel="noopener" class="btn-quiet">
			<Star size={13} aria-hidden="true" /> Star the repo
		</a>
	</div>
</section>

<style>
	.support {
		position: relative;
		width: 100%;
		max-width: 72rem;
		margin: 1rem 0 3rem;
		padding: 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		flex-wrap: wrap;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--surface);
		overflow: hidden;
	}

	.support::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse 60% 120% at 15% -20%, var(--accent-glow), transparent 60%);
		pointer-events: none;
	}

	.support > * {
		position: relative;
	}

	.support-text {
		flex: 1 1 24rem;
	}

	.support-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		border: 1px solid var(--border);
		background: var(--bg);
		color: var(--accent);
		margin-bottom: 0.75rem;
	}

	.support h2 {
		font-size: 1.15rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		margin: 0 0 0.4rem;
		color: var(--text);
	}

	.support p {
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--muted);
		margin: 0;
		max-width: 46ch;
	}

	.support-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.btn-support,
	.btn-ghost,
	.btn-quiet {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		padding: 0.6rem 1.1rem;
		border-radius: 6px;
		text-decoration: none;
		transition:
			transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
			border-color 0.2s ease,
			color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.btn-support {
		background: var(--accent);
		color: var(--bg);
		font-weight: 600;
		border: 1px solid var(--accent);
	}

	.btn-support:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 24px -8px var(--accent-glow);
	}

	.btn-ghost {
		background: var(--bg);
		color: var(--muted);
		border: 1px solid var(--border);
	}

	.btn-ghost:hover {
		border-color: var(--accent);
		color: var(--text);
		transform: translateY(-1px);
	}

	.btn-quiet {
		background: transparent;
		color: var(--muted);
		border: 1px solid transparent;
		padding-inline: 0.5rem;
		font-size: 0.8rem;
		opacity: 0.8;
	}

	.btn-quiet:hover {
		color: var(--accent);
		opacity: 1;
	}

	@media (max-width: 768px) {
		.support {
			padding: 1.5rem 1.25rem;
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
