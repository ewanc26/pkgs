<script lang="ts">
	let uploading = false;
	let result: any = $state(null);
	let errorMsg = '';
	let showNotice = false;
	let noticeText = '';
	let noticeType = 'success';
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

<header>
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

<form class="form" on:submit|preventDefault={handleConvert}>
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
			<input type="checkbox" name="include-private" checked={false} />
			Include private/draft posts
		</label>
		<label class="option-item">
			<input type="checkbox" name="create-publication" checked={false} />
			Create publication record
		</label>
		<label class="option-item">
			<input type="text" name="publication-name" placeholder="Publication name" />
		</label>
		<label class="option-item">
			<input type="text" name="publication-description" placeholder="publication description" />
		</label>
		<label class="option-item">
			<input type="checkbox" name="upload-media" checked={false} />
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
    <button type="submit" class="btn btn-primary" disabled={uploading}>
      {#if uploading} Converting… {:else} Convert {/if}
    </button>
	<button type="button" class="btn btn-secondary" on:click={() => { result = null; errorMsg = ''; }}>Clear</button>
</form>

{#if result}
	<section class="result-section result">
		<h2>Results</h2>
		<p><strong>Converted: {result.documents?.length ?? 0}</strong></p>
		{#if result.skipped} <p>Skipped: {result.skipped}</p> {/if}
		{#if result.errors?.length} <p class="muted">Errors: {result.errors.length}</p> {/if}
		{#if result.warnings?.length} <p>Warnings: {result.warnings.length}</p> {/if}
		<button class="btn btn-secondary" on:click={downloadResult}>Download Documents as JSON</button>
	</section>
{/if}

<style>
	* {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	body {
		font-family: 'Inter', system-ui, -apple-system, sans-serif;
		background: #f8f9fa;
		color: #212529;
		line-height: 1.5;
	}

	.container {
		max-width: 960px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #dee2e6;
	}

	h1 {
		font-size: 1.75rem;
		font-weight: 600;
		color: #2c3e50;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: #6c757d;
		font-size: 0.95rem;
	}

	.section {
		margin: 2rem 0;
	}

	h2 {
		font-size: 1.1rem;
		font-weight: 600;
		color: #2c3e50;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		font-size: 0.875rem;
		margin-bottom: 0.375rem;
		color: #6c757d;
	}

	.form-group input,
	.form-group select,
	.form-group textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #dee2e6;
		border-radius: 6px;
		font-family: inherit;
		font-size: 0.95rem;
		background: white;
		color: #212529;
	}

	.form-group input[type="file"] {
		padding: 0;
	}

	.options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.option-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.option-item input {
		width: auto;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 500;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn:focus-visible {
		outline: 2px solid #2c3e50;
		outline-offset: 2px;
	}

	.btn-primary {
		background: #2c3e50;
		color: white;
	}

	.btn-primary:hover {
		background: #1a252f;
	}

	.btn-secondary {
		background: white;
		color: #212529;
		border: 1px solid #dee2e6;
	}

	.btn-secondary:hover {
		border-color: #b5c3d0;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.result-section {
		margin-top: 2rem;
		padding: 1.5rem;
		border-radius: 8px;
		background: white;
		border: 1px solid #dee2e6;
	}

	.result.error {
		border-color: #e74c3c;
		color: #e74c3c;
	}

	.result.success {
		border-color: #27ae60;
		color: #27ae60;
	}

	.notice {
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		color: #856404;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin: 1rem 0;
	}

	@media (max-width: 640px) {
		.container { padding: 1rem; }
		.options { grid-template-columns: 1fr; }
	}
</style>