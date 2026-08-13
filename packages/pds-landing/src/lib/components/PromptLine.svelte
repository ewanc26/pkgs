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
	><span class="pds-prompt-char" aria-hidden="true"> $</span
	><span class="pds-prompt-cursor" aria-hidden="true"></span>
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

	.pds-prompt-cursor {
		display: inline-block;
		width: 0.55em;
		height: 1em;
		margin-left: 0.35em;
		background: var(--pds-color-green);
		animation: pds-cursor-blink 1.1s step-end infinite;
		user-select: none;
	}

	@keyframes pds-cursor-blink {
		0%,
		49% {
			opacity: 1;
		}
		50%,
		100% {
			opacity: 0;
		}
	}
</style>
