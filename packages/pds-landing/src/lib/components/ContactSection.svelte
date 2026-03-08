<script lang="ts">
	interface Props {
		/**
		 * Bluesky handle (without @) to link to.
		 * Example: `'ewancroft.uk'`
		 */
		blueskyHandle?: string;
		/**
		 * Base URL of the Bluesky web client used to build the profile link.
		 * Defaults to `'https://bsky.app'`.
		 */
		blueskyClientUrl?: string;
		/** Contact email address. Rendered only when provided. */
		email?: string;
	}

	let {
		blueskyHandle,
		blueskyClientUrl = 'https://bsky.app',
		email
	}: Props = $props();

	let profileUrl = $derived(
		blueskyHandle ? `${blueskyClientUrl}/profile/${blueskyHandle}` : null
	);
</script>

{#if blueskyHandle && profileUrl}
	<p class="pds-contact-note">
		Send a mention on Bluesky to
		<a href={profileUrl} target="_blank" rel="noopener">@{blueskyHandle}</a>
	</p>
{/if}

{#if email}
	<p class="pds-contact-note pds-contact-email-row">
		Email: <a href="mailto:{email}">{email}</a>
	</p>
{/if}

<style>
	.pds-contact-note {
		font-size: 0.88em;
		color: var(--pds-color-subtext-0);
	}

	.pds-contact-email-row {
		margin-top: 0.4rem;
	}

	.pds-contact-note a {
		text-decoration: none;
		color: var(--pds-color-green);
	}

	.pds-contact-note a:hover {
		text-decoration: underline;
	}
</style>
