<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Heart } from '@lucide/svelte';

	let handleA = $state(page.url.searchParams.get('with') ?? '');
	let handleB = $state('');

	function compare() {
		const a = handleA.trim();
		const b = handleB.trim();
		if (!a || !b) return;
		goto(`/compare/${encodeURIComponent(a)}/${encodeURIComponent(b)}`);
	}
</script>

<svelte:head>
	<title>Compare — Tourmaline</title>
	<meta name="description" content="Compare music taste between two AT Protocol listeners" />
</svelte:head>

<div class="mx-auto max-w-lg px-3 py-12 sm:px-4 sm:py-20">
	<div class="text-center">
		<Heart size={28} class="mx-auto text-[var(--accent)]" />
		<h1 class="mt-4 text-2xl font-bold text-[var(--text)] sm:text-3xl">Compare taste</h1>
		<p class="mt-2 text-sm text-[var(--text-muted)]">
			See how compatible your listening is with anyone else on teal.fm. No sign-in needed for
			either side — just two public handles or DIDs.
		</p>
	</div>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			compare();
		}}
		class="mt-8 space-y-3"
	>
		<label class="block">
			<span class="text-xs text-[var(--text-dim)]">First listener</span>
			<input
				type="text"
				bind:value={handleA}
				placeholder="ewancroft.uk or did:plc:..."
				autocomplete="off"
				spellcheck="false"
				class="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none"
			/>
		</label>

		<div class="flex items-center justify-center">
			<Heart size={14} class="text-[var(--text-dim)]" />
		</div>

		<label class="block">
			<span class="text-xs text-[var(--text-dim)]">Second listener</span>
			<input
				type="text"
				bind:value={handleB}
				placeholder="another.handle or did:plc:..."
				autocomplete="off"
				spellcheck="false"
				class="mt-1 block w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent)] focus:outline-none"
			/>
		</label>

		<button
			type="submit"
			disabled={!handleA.trim() || !handleB.trim()}
			class="mt-2 w-full rounded bg-[var(--accent-dim)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
		>
			Compare
		</button>
	</form>

	<div class="mt-6 text-center">
		<a href="/" class="text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)]">← Back to profile lookup</a>
	</div>
</div>
