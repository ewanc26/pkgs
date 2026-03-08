<script lang="ts">
	/** A single entry in a link list. */
	export interface LinkItem {
		href: string;
		label: string;
		/**
		 * Whether to open in a new tab.
		 * Defaults to `true` — set to `false` for internal navigation.
		 */
		external?: boolean;
	}

	interface Props {
		links: LinkItem[];
	}

	let { links }: Props = $props();
</script>

<ul class="pds-link-list">
	{#each links as link (link.href)}
		<li>
			<a
				href={link.href}
				target={link.external !== false ? '_blank' : undefined}
				rel={link.external !== false ? 'noopener' : undefined}
			>
				{link.label}
			</a>
		</li>
	{/each}
</ul>

<style>
	.pds-link-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.88em;
		padding: 0;
		margin: 0;
	}

	.pds-link-list li::before {
		content: '→ ';
		color: var(--pds-color-green);
	}

	.pds-link-list a {
		text-decoration: none;
		color: var(--pds-color-green);
		opacity: 0.85;
		transition: opacity 0.15s;
	}

	.pds-link-list a:hover {
		opacity: 1;
	}
</style>
