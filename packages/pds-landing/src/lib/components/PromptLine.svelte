<script lang="ts">
	interface Props {
		/** Username portion (before the @). */
		user: string;
		/** Hostname (after the @). */
		host: string;
		/** Shell path shown after the colon. Defaults to `~`. */
		path?: string;
	}

	let { user, host, path = '~' }: Props = $props();
</script>

<div class="pds-prompt-line">
	<span class="pds-user-marker">{user}@{host}</span><span class="pds-prompt-path">:{path}</span
	><span class="pds-prompt-char" aria-hidden="true"> $</span>
</div>

<style>
	.pds-prompt-line {
		display: flex;
		align-items: baseline;
		margin-bottom: 0.3rem;
	}

	.pds-user-marker {
		color: var(--pds-color-green);
		font-weight: 700;
		word-break: break-all;
		font-size: clamp(0.95em, 4vw, 1.15em);
		letter-spacing: -0.01em;
	}

	.pds-prompt-path {
		color: var(--pds-color-subtext-0);
		font-weight: 700;
		font-size: clamp(0.95em, 4vw, 1.15em);
		opacity: 0.6;
		user-select: none;
	}

	.pds-prompt-char {
		color: var(--pds-color-subtext-0);
		font-weight: 700;
		font-size: clamp(0.95em, 4vw, 1.15em);
		user-select: none;
	}
</style>
