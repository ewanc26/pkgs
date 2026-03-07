<script lang="ts">
	import { onMount } from 'svelte';
	import { pdsStatus } from '$lib/status.svelte.js';
	import KvRow from '$lib/components/KvRow.svelte';

	onMount(() => pdsStatus.load());
</script>

<div class="card">
	<div class="card-titlebar">
		<span class="dot"></span>
		<span class="dot"></span>
		<span class="dot"></span>
		<span style="margin-left: 0.4rem">ewan's pds</span>
	</div>
	<div class="card-body">
		<div class="prompt-line">
			<span class="user-marker">server@pds.ewancroft.uk</span><span class="prompt-path"
				>:~</span
			><span class="prompt-char"> $</span>
		</div>
		<p class="tagline">Bluesky-compatible ATProto PDS · personal instance</p>

		<div class="section-label">status</div>
		<div class="kv-grid">
			{#each pdsStatus.kvRows as row (row.key)}
				<KvRow key={row.key} text={row.text} cls={row.cls} />
			{/each}
		</div>

		<hr class="divider" />

		<div class="section-label">endpoints</div>
		<p class="endpoints-note">
			Most API routes are under <span class="highlight">/xrpc/</span>
		</p>
		<ul class="link-list">
			<li><a href="https://github.com/bluesky-social/atproto" target="_blank" rel="noopener">atproto source code</a></li>
			<li><a href="https://github.com/bluesky-social/pds" target="_blank" rel="noopener">self-hosting guide</a></li>
			<li><a href="https://atproto.com" target="_blank" rel="noopener">protocol docs</a></li>
		</ul>

		<hr class="divider" />

		<div class="section-label">links</div>
		<ul class="link-list">
			<li><a href="https://witchsky.app" target="_blank" rel="noopener">Witchsky Web Client</a></li>
			{#each pdsStatus.extraLinks as link (link.href)}
				<li><a href={link.href} target="_blank" rel="noopener">{link.label}</a></li>
			{/each}
		</ul>

		<hr class="divider" />

		<div class="section-label">contact</div>
		<p class="contact-note">
			Send a mention on Bluesky to
			<a href="https://witchsky.app/profile/ewancroft.uk" target="_blank" rel="noopener">@ewancroft.uk</a>
		</p>
		{#if pdsStatus.contactEmail}
			<p class="contact-note" style="margin-top: 0.4rem">
				Email: <a href="mailto:{pdsStatus.contactEmail}">{pdsStatus.contactEmail}</a>
			</p>
		{/if}
	</div>
</div>

<footer>
	powered by
	<a href="https://search.nixos.org/packages?show=bluesky-pds" target="_blank" rel="noopener">nixpkgs#bluesky-pds</a>
	&nbsp;·&nbsp;
	<a href="https://atproto.com" target="_blank" rel="noopener">atproto.com</a>
</footer>
