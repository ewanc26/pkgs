<script lang="ts">
	import { LandingLayout } from '@ewanc26/landing-ui';
	import '@ewanc26/landing-ui/landing.css';

	let uploading = $state(false);
	let result = $state<any>(null);
	let errorMsg = $state('');
	let showNotice = $state(false);
	let noticeText = $state('');
	let noticeType = $state('success');
	let fileInput: HTMLInputElement | null = null;

	const handleConvert = async (e: Event) => {
		e.preventDefault();
		if (!fileInput?.files?.length) {
			showNotice = true;
			noticeText = 'Please select a Tumblr export ZIP file';
			noticeType = 'error';
			setTimeout(() => { showNotice = false; }, 5000);
			return;
		}
		if (!document.getElementById('site-url')?.value) {
			showNotice = true;
			noticeText = 'Please enter a Standard.site publication URL';
			noticeType = 'error';
			setTimeout(() => { showNotice = false; }, 5000);
			return;
		}

		uploading = true;
		errorMsg = '';
		result = null;

		const formData = new FormData();
		formData.append('input', fileInput.files[0]);
		formData.append('site', (document.getElementById('site-url') as HTMLInputElement).value);
		formData.append('include-private', String((document.getElementById('include-private') as HTMLInputElement)?.checked));
		formData.append('create-publication', String((document.getElementById('create-publication') as HTMLInputElement)?.checked));
		formData.append('publication-name', (document.getElementById('publication-name') as HTMLInputElement).value || '');
		formData.append('publication-description', (document.getElementById('publication-description') as HTMLInputElement).value || '');
		formData.append('upload-media', String((document.getElementById('upload-media') as HTMLInputElement)?.checked));
		formData.append('handle', (document.getElementById('handle') as HTMLInputElement).value || '');
		formData.append('password', (document.getElementById('password') as HTMLInputElement).value || '');
		formData.append('service', (document.getElementById('service') as HTMLInputElement).value || '');
		formData.append('max-media-bytes', (document.getElementById('max-media-bytes') as HTMLInputElement).value || '');

		try {
			const resp = await fetch('/api/convert', {
				method: 'POST',
				body: formData,
			});

			if (!resp.ok) {
				const err = await resp.json();
				throw new Error(err.message || 'Conversion failed');
			}

			result = await resp.json();
			showNotice = true;
			noticeText = `${result.documents?.length ?? 0} document(s) converted successfully`;
			noticeType = 'success';
			setTimeout(() => { showNotice = false; }, 5000);
		} catch (err) {
			errorMsg = err instanceof Error ? err.message : 'Conversion failed';
			showNotice = true;
			noticeText = errorMsg;
			noticeType = 'error';
			setTimeout(() => { showNotice = false; }, 5000);
		} finally {
			uploading = false;
		}
	};

	const downloadResult = () => {
		if (!result?.documents) return;
		const json = JSON.stringify(result.documents, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'rock-tumbl-documents.json';
		a.click();
		URL.revokeObjectURL(url);
	};
</script>

<LandingLayout
	name="rock-tumbl"
	logo="/favicon.svg"
	subtitle="Convert Tumblr blog exports into Standard.site documents"
	footerTagline="Free and open source — read the docs"
	footerSourceUrl="https://github.com/ewanc26/pkgs/tree/main/packages/rock-tumbl"
	webVersion="0.1.0"
	cliVersion="0.1.0"
	supportUrl="https://ewancroft.uk/support"
	directoryUrl="https://croft.click"
>
	<header class="converter-header">
		<h1>rock-tumbl</h1>
		<p class="subtitle">Convert Tumblr blog exports into Standard.site documents</p>
	</header>

	{#if showNotice}
		<div class="notice" aria-live="polite" role="alert">
			{noticeText}
		</div>
	{/if}

	{#if errorMsg}
		<div class="result error"><p>{errorMsg}</p></div>
	{/if}

	<fieldset class="form">
		<div class="form-group">
			<label for="tumblr-input">Tumblr Export ZIP</label>
			<input type="file" id="tumblr-input" name="input" accept=".zip,.zipx" bind:this={fileInput} required />
		</div>

		<div class="form-group">
			<label for="site-url">Standard.site Publication URL or AT URI</label>
			<input type="text" id="site-url" name="site" placeholder="https://myblog.example.com" required />
			<small class="muted">Use the publication URL or an AT URI pointing at a site.standard.publication record.</small>
		</div>

		<div class="options">
			<label class="option-item">
				<input type="checkbox" name="include-private" />
				Include private/draft posts
			</label>
			<label class="option-item">
				<input type="checkbox" name="create-publication" />
				Create publication record
			</label>
			<label class="option-item">
				<input type="text" name="publication-name" placeholder="Publication name" />
			</label>
			<label class="option-item">
				<input type="text" name="publication-description" placeholder="Publication description" />
			</label>
			<label class="option-item">
				<input type="checkbox" name="upload-media" />
				Upload referenced media
			</label>
			<label class="option-item">
				<input type="text" name="handle" placeholder="AT Protocol handle" />
				<span class="muted">(required for publishing)</span>
			</label>
			<label class="option-item">
				<input type="password" name="password" placeholder="App password" />
				<span class="muted">(required for publishing)</span>
			</label>
			<label class="option-item">
				<input type="text" name="service" placeholder="PDS URL" value="https://bsky.social" />
			</label>
			<label class="option-item">
				<input type="number" name="max-media-bytes" value="5368709120" min="1048576" />
				<span class="muted">Max media bytes per blob (default 5MB)</span>
			</label>
		</div>

		<button type="submit" class="btn btn-primary" disabled={uploading} on:click={handleConvert}>
			{#if uploading} Converting… {:else} Convert {/if}
		</button>
		<button type="button" class="btn btn-secondary" on:click={() => { result = null; errorMsg = ''; }}>Clear</button>
	</fieldset>

	{#if result}
		<fieldset class="result-section result">
			<h2>Results</h2>
			<p><strong>Converted: {result.documents?.length ?? 0}</strong></p>
			{#if result.skipped} <p>Skipped: {result.skipped}</p> {/if}
			{#if result.errors?.length} <p class="muted">Errors: {result.errors.length}</p> {/if}
			{#if result.warnings?.length} <p>Warnings: {result.warnings.length}</p> {/if}
			<button class="btn btn-secondary" on:click={downloadResult}>Download Documents as JSON</button>
		</fieldset>
	{/if}
</LandingLayout>

<style>
	@import '@ewanc26/landing-ui/landing.css';

	.converter-header {
		margin-bottom: 1.5rem;
		text-align: center;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}

	.converter-header h1 {
		font-size: clamp(1.5rem, 4vw, 2rem);
		font-weight: 600;
		color: var(--accent);
		margin-bottom: 0.5rem;
	}

	.converter-header .subtitle {
		color: var(--muted);
		font-size: 0.95rem;
		max-width: 480px;
		margin: 0 auto;
	}

	.result-section {
		margin-top: 2rem;
	}
</style>