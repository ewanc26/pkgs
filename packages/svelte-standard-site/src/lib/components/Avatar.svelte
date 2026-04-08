<script lang="ts">
	interface Props {
		/** User's DID */
		did: string;
		/** User's handle (optional, for display) */
		handle?: string;
		/** User's display name */
		displayName?: string;
		/** Avatar image URL */
		src?: string;
		/** Size in pixels */
		size?: number;
		/** Whether to link to profile */
		link?: boolean;
		/** Has theme applied */
		hasTheme?: boolean;
	}

	const {
		did,
		handle,
		displayName,
		src,
		size = 40,
		link = true,
		hasTheme = false
	}: Props = $props();

	// Generate initials from display name or handle
	const initials = $derived(
		(displayName || handle || did)
			.split(/[.\s_@]+/)
			.slice(0, 2)
			.map((s) => s.charAt(0).toUpperCase())
			.join('')
	);

	// Profile URL
	const profileUrl = $derived(`https://leaflet.pub/p/${did}`);

	// Size classes
	const sizeStyle = $derived(`width: ${size}px; height: ${size}px; font-size: ${size * 0.4}px;`);
</script>

{#if link}
	<a
		href={profileUrl}
		target="_blank"
		rel="noopener noreferrer"
		class="avatar-link"
		title={displayName || handle || did}
	>
		{#if src}
			<img
				src={src}
				alt={displayName || handle || 'Avatar'}
				class="avatar rounded-full object-cover"
				style={sizeStyle}
				loading="lazy"
			/>
		{:else}
			<div
				class="avatar-placeholder rounded-full flex items-center justify-center font-medium"
				class:themed={hasTheme}
				style={sizeStyle}
			>
				{initials}
			</div>
		{/if}
	</a>
{:else if src}
	<img
		src={src}
		alt={displayName || handle || 'Avatar'}
		class="avatar rounded-full object-cover"
		style={sizeStyle}
		loading="lazy"
	/>
{:else}
	<div
		class="avatar-placeholder rounded-full flex items-center justify-center font-medium"
		class:themed={hasTheme}
		style={sizeStyle}
	>
		{initials}
	</div>
{/if}

<style>
	.avatar-link {
		display: inline-block;
		text-decoration: none;
	}

	.avatar-placeholder {
		background-color: rgb(229 231 235);
		color: rgb(107 114 128);
	}

	.avatar-placeholder.themed {
		background-color: color-mix(in srgb, var(--theme-accent) 20%, transparent);
		color: var(--theme-accent);
	}
</style>
