<script lang="ts">
	/**
	 * PDSPage — a fully assembled ATProto PDS landing page.
	 *
	 * All sections (status, endpoints, links, contact) are included by default.
	 * Each section can be individually disabled via boolean props, and the
	 * individual primitives (TerminalCard, StatusGrid, LinkList, …) can be
	 * composed manually for bespoke layouts.
	 */
	import { onMount } from 'svelte';
	import TerminalCard from './TerminalCard.svelte';
	import PromptLine from './PromptLine.svelte';
	import Tagline from './Tagline.svelte';
	import SectionLabel from './SectionLabel.svelte';
	import Divider from './Divider.svelte';
	import StatusGrid from './StatusGrid.svelte';
	import LinkList from './LinkList.svelte';
	import ContactSection from './ContactSection.svelte';
	import PDSFooter from './PDSFooter.svelte';
	import type { LinkItem } from './LinkList.svelte';
	import { fetchPDSStatus } from '../utils/fetchPDSStatus.js';

	interface Props {
		// ── Card chrome ──────────────────────────────────────────────────────
		/** Text shown in the terminal titlebar. */
		cardTitle?: string;

		// ── Prompt ───────────────────────────────────────────────────────────
		promptUser?: string;
		promptHost?: string;
		promptPath?: string;
		tagline?: string;

		// ── API ──────────────────────────────────────────────────────────────
		/**
		 * Origin prepended to `/xrpc/…` calls.
		 * Leave empty (`''`) to use the current page's origin (default).
		 */
		baseUrl?: string;

		// ── Sections ─────────────────────────────────────────────────────────
		showStatus?: boolean;
		showEndpoints?: boolean;
		showLinks?: boolean;
		showContact?: boolean;
		showFooter?: boolean;

		// ── Links section ────────────────────────────────────────────────────
		/**
		 * Static links always shown in the Links section.
		 * Dynamic links (privacy policy / ToS) from `describeServer` are
		 * appended automatically.
		 */
		staticLinks?: LinkItem[];

		// ── Contact section ──────────────────────────────────────────────────
		blueskyHandle?: string;
		blueskyClientUrl?: string;

		// ── Footer ───────────────────────────────────────────────────────────
		showNixpkg?: boolean;
		showAtproto?: boolean;
	}

	let {
		cardTitle = "ewan's pds",
		promptUser = 'server',
		promptHost = 'pds.ewancroft.uk',
		promptPath = '~',
		tagline = 'Bluesky-compatible ATProto PDS · personal instance',
		baseUrl = '',
		showStatus = true,
		showEndpoints = true,
		showLinks = true,
		showContact = true,
		showFooter = true,
		staticLinks = [{ href: 'https://witchsky.app', label: 'Witchsky Web Client' }],
		blueskyHandle = 'ewancroft.uk',
		blueskyClientUrl = 'https://witchsky.app',
		showNixpkg = true,
		showAtproto = true
	}: Props = $props();

	const ENDPOINT_LINKS: LinkItem[] = [
		{ href: 'https://github.com/bluesky-social/atproto', label: 'atproto source code' },
		{ href: 'https://github.com/bluesky-social/pds', label: 'self-hosting guide' },
		{ href: 'https://atproto.com', label: 'protocol docs' }
	];

	// Dynamic state populated from describeServer
	let extraLinks: LinkItem[] = $state([]);
	let dynamicLinks: LinkItem[] = $derived([...staticLinks, ...extraLinks]);
	let contactEmail: string | null = $state(null);

	onMount(async () => {
		try {
			const { description } = await fetchPDSStatus(baseUrl);
			const extras: LinkItem[] = [];
			if (description.links?.privacyPolicy) {
				extras.push({ href: description.links.privacyPolicy, label: 'Privacy Policy' });
			}
			if (description.links?.termsOfService) {
				extras.push({ href: description.links.termsOfService, label: 'Terms of Service' });
			}
			if (extras.length) extraLinks = extras;
			if (description.contact?.email) contactEmail = description.contact.email;
		} catch {
			// silently fall back to static defaults
		}
	});
</script>

<div class="pds-page">
	<TerminalCard title={cardTitle}>
		<PromptLine user={promptUser} host={promptHost} path={promptPath} />
		<Tagline text={tagline} />

		{#if showStatus}
			<SectionLabel label="status" />
			<StatusGrid {baseUrl} />
		{/if}

		{#if showEndpoints}
			<Divider />
			<SectionLabel label="endpoints" />
			<p class="pds-endpoints-note">
				Most API routes are under <span class="pds-highlight">/xrpc/</span>
			</p>
			<LinkList links={ENDPOINT_LINKS} />
		{/if}

		{#if showLinks}
			<Divider />
			<SectionLabel label="links" />
			<LinkList links={dynamicLinks} />
		{/if}

		{#if showContact}
			<Divider />
			<SectionLabel label="contact" />
			<ContactSection
				{blueskyHandle}
				{blueskyClientUrl}
				email={contactEmail ?? undefined}
			/>
		{/if}
	</TerminalCard>

	{#if showFooter}
		<PDSFooter {showNixpkg} {showAtproto} />
	{/if}
</div>

<style>
	.pds-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		width: 100%;
	}

	.pds-endpoints-note {
		font-size: 0.88em;
		color: var(--pds-color-subtext-0);
		margin-bottom: 0.7rem;
	}

	.pds-highlight {
		color: var(--pds-color-green);
	}
</style>
