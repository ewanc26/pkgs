<script lang="ts">
	/** Build a blob URL from a PDS endpoint, DID, and CID. */
	function blobUrl(pds: string, did: string, cid: string): string {
		return `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
	}

	interface BlobRef {
		$type?: 'blob';
		ref?: { $link: string };
		mimeType?: string;
		size?: number;
	}

	interface Props {
		block: {
			/** Blob object from the lexicon */
			image: BlobRef;
			alt?: string;
			aspectRatio?: { width: number; height: number };
		};
		did?: string;
		pds?: string;
		hasTheme?: boolean;
	}

	const { block, did = '', pds = '', hasTheme = false }: Props = $props();

	const cid = $derived(block.image?.ref?.$link ?? '');
	const src = $derived(cid && did && pds ? blobUrl(pds, did, cid) : '');
	const altText = $derived(block.alt ?? '');
</script>

{#if src}
	<figure class="my-2 w-full">
		<img
			{src}
			alt={altText}
			loading="lazy"
			decoding="async"
			height={block.aspectRatio?.height}
			width={block.aspectRatio?.width}
			class="h-auto max-w-full rounded"
		/>
		{#if altText}
			<figcaption class="mt-1 text-center text-xs italic text-gray-600 dark:text-gray-400">
				{altText}
			</figcaption>
		{/if}
	</figure>
{:else}
	<!-- Blob not resolvable (missing did/pds) -->
	<div class="my-2 rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-400 dark:border-gray-700 dark:bg-gray-900">
		[image unavailable]
	</div>
{/if}
