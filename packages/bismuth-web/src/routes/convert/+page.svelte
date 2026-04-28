<script lang="ts">
	import {
		documentToMarkdown,
		contentToMarkdown,
		pcktContentToMarkdown,
		offprintContentToMarkdown
	} from '$lib/convert';
	import { ArrowLeft, Copy, Download, Upload, FileJson } from '@lucide/svelte';

	let inputJson = $state('');
	let output = $state('');
	let error = $state('');
	let detectedType = $state('');
	let frontmatter = $state(false);
	let isDragging = $state(false);

	function detectType(data: Record<string, unknown>): string {
		const type = data['$type'] as string | undefined;
		if (type === 'site.standard.document') return 'document';
		if (type === 'pub.leaflet.content') return 'leaflet';
		if (type === 'blog.pckt.content') return 'pckt';
		if (type === 'app.offprint.content') return 'offprint';
		return '';
	}

	async function convert() {
		error = '';
		output = '';
		detectedType = '';

		if (!inputJson.trim()) {
			error = 'Paste or upload a JSON document first.';
			return;
		}

		let data: Record<string, unknown>;
		try {
			data = JSON.parse(inputJson);
		} catch {
			error = 'Invalid JSON — check your input and try again.';
			return;
		}

		const type = detectType(data);
		if (!type) {
			error =
				'Unrecognised content type. Expected $type to be one of: site.standard.document, pub.leaflet.content, blog.pckt.content, app.offprint.content.';
			return;
		}

		detectedType = type;

		try {
			let md: string;
			switch (type) {
				case 'document':
					md = documentToMarkdown(data as any, { frontmatter });
					break;
				case 'leaflet':
					md = contentToMarkdown(data as any, { frontmatter });
					break;
				case 'pckt':
					md = await pcktContentToMarkdown(data as any, undefined, { frontmatter });
					break;
				case 'offprint':
					md = offprintContentToMarkdown(data as any, { frontmatter });
					break;
				default:
					md = '';
			}
			output = md;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Conversion failed.';
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(output);
		} catch {
			// Fallback
			const ta = document.createElement('textarea');
			ta.value = output;
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
		}
	}

	function downloadMd() {
		const blob = new Blob([output], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'document.md';
		a.click();
		URL.revokeObjectURL(url);
	}

	function handleFileUpload(file: File) {
		const reader = new FileReader();
		reader.onload = () => {
			inputJson = reader.result as string;
			convert();
		};
		reader.readAsText(file);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files[0];
		if (file && file.type === 'application/json') {
			handleFileUpload(file);
		}
	}

	function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) handleFileUpload(file);
	}
</script>

<svelte:head>
	<title>Convert — Bismuth</title>
</svelte:head>

<main>
	<a href="/" class="back-btn"><ArrowLeft size={14} /> Back</a>

	<div class="card-section">
		<h2 class="section-title">Convert document</h2>
		<p class="section-sub">Paste JSON or upload a file. Bismuth detects the content type automatically.</p>

		<div class="form">
			<!-- Input -->
			<div class="field">
				<label class="field-label"><FileJson size={14} /> JSON input</label>
				<div
					class="drop-zone"
					class:dragging={isDragging}
					ondragover={(e) => { e.preventDefault(); isDragging = true; }}
					ondragleave={() => { isDragging = false; }}
					ondrop={handleDrop}
				>
					<textarea
						bind:value={inputJson}
						placeholder='Paste your ATProto document JSON here, or drag & drop a .json file...'
						spellcheck="false"
					></textarea>
					<div class="drop-overlay" class:visible={isDragging}>
						<Upload size={24} />
						<span>Drop .json file</span>
					</div>
				</div>
				<div class="upload-row">
					<label class="upload-btn">
						<Upload size={14} /> Upload file
						<input type="file" accept=".json,application/json" onchange={handleFileInput} hidden />
					</label>
				</div>
			</div>

			<!-- Options -->
			<div class="toggle-row">
				<input type="checkbox" id="frontmatter" bind:checked={frontmatter} />
				<label for="frontmatter">Include YAML front matter</label>
			</div>

			<!-- Convert -->
			<button class="btn-primary" onclick={convert}>
				Convert to Markdown
			</button>
		</div>

		{#if error}
			<div class="alert alert-error" style="margin-top: 1rem;">{error}</div>
		{/if}

		{#if output}
			<div class="output-section">
				<div class="output-header">
					{#if detectedType}
						<span class="type-badge">{detectedType}</span>
					{/if}
					<div class="output-actions">
						<button class="btn-icon" onclick={copyToClipboard} title="Copy to clipboard">
							<Copy size={15} />
						</button>
						<button class="btn-icon" onclick={downloadMd} title="Download .md">
							<Download size={15} />
						</button>
					</div>
				</div>
				<div class="output-area">{output}</div>
			</div>
		{/if}
	</div>
</main>

<style>
	main {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		max-width: 48rem;
		margin: 0 auto;
	}

	/* ── drop zone ─────────────────────────────────────────────────────────── */
	.drop-zone {
		position: relative;
	}

	.drop-overlay {
		position: absolute;
		inset: 0;
		background: rgba(196, 181, 253, 0.08);
		border: 2px dashed var(--accent);
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		color: var(--accent);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.15s;
	}

	.drop-overlay.visible {
		opacity: 1;
	}

	.upload-row {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.upload-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: var(--muted);
		cursor: pointer;
		font-family: 'JetBrains Mono', monospace;
		transition: color 0.15s;
	}

	.upload-btn:hover {
		color: var(--text);
	}

	/* ── output ─────────────────────────────────────────────────────────────── */
	.output-section {
		margin-top: 1.5rem;
	}

	.output-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.type-badge {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		color: var(--accent);
		background: var(--accent-glow);
		border: 1px solid rgba(196, 181, 253, 0.3);
		border-radius: 4px;
		padding: 2px 8px;
	}

	.output-actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-icon {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 0.4rem;
		color: var(--muted);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			border-color 0.15s,
			color 0.15s;
	}

	.btn-icon:hover {
		border-color: var(--accent);
		color: var(--accent);
	}
</style>
