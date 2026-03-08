<script lang="ts">
	interface Props {
		/** Show the `nixpkgs#bluesky-pds` credit. Defaults to `true`. */
		showNixpkg?: boolean;
		/** Show the `atproto.com` link. Defaults to `true`. */
		showAtproto?: boolean;
	}

	let { showNixpkg = true, showAtproto = true }: Props = $props();
</script>

<footer class="pds-footer">
	{#if showNixpkg}
		powered by
		<a href="https://search.nixos.org/packages?show=bluesky-pds" target="_blank" rel="noopener"
			>nixpkgs#bluesky-pds</a
		>
	{/if}
	{#if showNixpkg && showAtproto}
		&nbsp;·&nbsp;
	{/if}
	{#if showAtproto}
		<a href="https://atproto.com" target="_blank" rel="noopener">atproto.com</a>
	{/if}
</footer>

<style>
	.pds-footer {
		text-align: center;
		color: color-mix(in srgb, var(--pds-color-green) 35%, transparent);
		font-size: 0.75em;
	}

	.pds-footer a {
		text-decoration: underline;
		color: color-mix(in srgb, var(--pds-color-green) 35%, transparent);
		transition: color 0.15s;
	}

	.pds-footer a:hover {
		color: var(--pds-color-green);
	}
</style>
