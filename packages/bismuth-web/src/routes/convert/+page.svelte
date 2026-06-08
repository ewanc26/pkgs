<script lang="ts">
	import {
		documentToMarkdown,
		contentToMarkdown,
		pcktContentToMarkdown,
		offprintContentToMarkdown,
		resolvePdsEndpoint,
		listDocuments,
	} from "$lib/convert";
	import {
		ArrowLeft,
		Copy,
		Download,
		Upload,
		RefreshCw,
		Globe,
		LogIn,
		LogOut,
	} from "@lucide/svelte";
	import type { StandardDocument } from "@ewanc26/bismuth";
	import { onMount } from "svelte";
	import { initOAuth, signInWithOAuth } from "$lib/core/oauth";
	import type { Agent } from "@atproto/api";

	type Mode = "convert" | "fetch";
	let mode = $state<Mode>("convert");

	// ── OAuth state ───────────────────────────────────────────────────────────
	let agent = $state<Agent | null>(null);
	let authHandle = $state("");
	let authLoading = $state(true);
	let authError = $state("");

	onMount(async () => {
		try {
			agent = await initOAuth();
		} catch (e: any) {
			console.warn("[bismuth] OAuth init failed:", e);
		} finally {
			authLoading = false;
		}
	});

	async function doLogin() {
		if (!authHandle.trim()) return;
		authError = "";
		try {
			await signInWithOAuth(authHandle.trim());
		} catch (e: any) {
			authError = e.message || "Sign-in failed";
		}
	}

	async function doLogout() {
		// BrowserOAuthClient handles session removal on init if no session is found,
		// but to manually log out we just need to clear the session from the client.
		// For now, simple reload works as we don't store the session across reloads 
		// unless BrowserOAuthClient.init() finds it.
		// Actually, we should probably have a proper logout in the oauth helper.
		// But clearing localStorage/sessionStorage works.
		localStorage.clear();
		sessionStorage.clear();
		window.location.reload();
	}

	async function logToolkitUse(count: number) {
		if (!agent) return;
		try {
			await agent.com.atproto.repo.createRecord({
				repo: agent.session?.did ?? agent.did ?? '',
				collection: 'click.croft.toolkit.use',
				record: {
					$type: 'click.croft.toolkit.use',
					tool: {
						$type: 'click.croft.tools.bismuth',
						documentsConverted: count
					},
					createdAt: new Date().toISOString()
				}
			});
		} catch (e) {
			console.warn("[bismuth] Failed to log toolkit usage:", e);
		}
	}

	// ── Convert state ─────────────────────────────────────────────────────────
	let inputJson = $state("");
	let output = $state("");
	let convertError = $state("");
	let detectedType = $state("");
	let frontmatter = $state(false);
	let sourceDid = $state("");
	let pageBreak = $state("");
	let isDragging = $state(false);
	let converting = $state(false);
	let copied = $state(false);

	function detectType(data: Record<string, unknown>): string {
		const type = data["$type"] as string | undefined;

		if (type === "site.standard.document") return "document";
		if (type === "pub.leaflet.content") return "leaflet";
		if (type === "blog.pckt.content") return "pckt";
		if (type === "app.offprint.content") return "offprint";

		return "";
	}

	async function convert() {
		convertError = "";
		output = "";
		detectedType = "";

		if (!inputJson.trim()) {
			convertError = "Paste or upload a JSON document first.";
			return;
		}

		let data: Record<string, unknown>;

		try {
			data = JSON.parse(inputJson);
		} catch {
			convertError = "Invalid JSON — check your input and try again.";
			return;
		}

		const type = detectType(data);

		if (!type) {
			convertError =
				"Unrecognised content type. Expected $type to be one of: site.standard.document, pub.leaflet.content, blog.pckt.content, app.offprint.content.";
			return;
		}

		detectedType = type;
		converting = true;

		try {
			const opts = {
				frontmatter,
				pageBreak: pageBreak.trim() || undefined,
			};

			let md = "";

			switch (type) {
				case "document":
					md = documentToMarkdown(data as any, opts);
					break;

				case "leaflet":
					md = contentToMarkdown(data as any, opts);
					break;

				case "pckt":
					md = await pcktContentToMarkdown(
						data as any,
						sourceDid.trim() || undefined,
						opts,
					);
					break;

				case "offprint":
					md = offprintContentToMarkdown(data as any, opts);
					break;
			}

			output = md;
			
			// Log use if signed in
			if (agent) {
				await logToolkitUse(1);
			}
		} catch (e: unknown) {
			convertError =
				e instanceof Error ? e.message : "Conversion failed.";
		} finally {
			converting = false;
		}
	}

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(output);
			copied = true;

			setTimeout(() => {
				copied = false;
			}, 1500);
		} catch {
			const ta = document.createElement("textarea");

			ta.value = output;
			document.body.appendChild(ta);
			ta.select();

			document.execCommand("copy");

			document.body.removeChild(ta);
		}
	}

	function triggerDownload(content: string, filename: string) {
		const blob = new Blob([content], {
			type: "text/markdown",
		});

		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");

		a.href = url;
		a.download = filename;
		a.click();

		URL.revokeObjectURL(url);
	}

	function downloadMd() {
		triggerDownload(output, "document.md");
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

		if (file && file.type === "application/json") {
			handleFileUpload(file);
		}
	}

	function handleFileInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];

		if (file) {
			handleFileUpload(file);
		}
	}

	// ── Fetch state ───────────────────────────────────────────────────────────
	interface FetchDocResult {
		rkey: string;
		title: string;
		markdown: string;
	}

	let fetchDid = $state("");
	let fetchRkey = $state("");
	let fetchPdsOverride = $state("");
	let fetchFrontmatter = $state(true);
	let fetchLoading = $state(false);
	let fetchError = $state("");
	let fetchResults = $state<FetchDocResult[]>([]);

	async function fetchDocs() {
		fetchError = "";
		fetchResults = [];

		if (!fetchDid.trim()) {
			fetchError = "--did is required.";
			return;
		}

		if (!fetchRkey.trim()) {
			fetchError = "--rkey is required.";
			return;
		}

		fetchLoading = true;

		try {
			const pds =
				fetchPdsOverride.trim() ||
				(await resolvePdsEndpoint(fetchDid.trim()));

			const docs = await listDocuments(
				pds,
				fetchDid.trim(),
				fetchRkey.trim(),
			);

			if (docs.length === 0) {
				fetchError = "No documents found for this publication.";
				return;
			}

			fetchResults = docs.map(({ rkey, doc }) => ({
				rkey,
				title: (doc as StandardDocument).title ?? rkey,
				markdown: documentToMarkdown(doc as StandardDocument, {
					frontmatter: fetchFrontmatter,
				}),
			}));

			// Log use if signed in
			if (agent) {
				await logToolkitUse(fetchResults.length);
			}
		} catch (e: unknown) {
			fetchError = e instanceof Error ? e.message : "Fetch failed.";
		} finally {
			fetchLoading = false;
		}
	}

	function downloadFetchResult(result: FetchDocResult) {
		triggerDownload(result.markdown, `${result.rkey}.md`);
	}

	async function downloadAll() {
		for (let i = 0; i < fetchResults.length; i++) {
			if (i > 0) {
				await new Promise((r) => setTimeout(r, 120));
			}

			downloadFetchResult(fetchResults[i]);
		}
	}
</script>

<svelte:head>
	<title>Convert — Bismuth</title>
</svelte:head>

<main>
	<div class="header-row">
		<a href="/" class="back-btn">
			<ArrowLeft size={14} />
			Back
		</a>

		<div class="auth-box">
			{#if authLoading}
				<div class="auth-loading">
					<RefreshCw size={12} class="spin" />
				</div>
			{:else if agent}
				<div class="auth-user">
					<span class="user-handle">{agent.session?.handle}</span>
					<button class="btn-ghost-icon" onclick={doLogout} title="Sign out">
						<LogOut size={14} />
					</button>
				</div>
			{:else}
				<div class="auth-login">
					<input
						type="text"
						bind:value={authHandle}
						placeholder="handle.bsky.social"
						class="auth-input"
						onkeydown={(e) => e.key === "Enter" && doLogin()}
					/>
					<button class="btn-auth" onclick={doLogin} title="Sign in to log usage">
						<LogIn size={14} />
					</button>
				</div>
			{/if}
		</div>
	</div>

	{#if authError}
		<div class="alert alert-error auth-alert">
			{authError}
		</div>
	{/if}

	<div class="mode-tabs">
		<button
			type="button"
			class="mode-tab"
			class:active={mode === "convert"}
			onclick={() => (mode = "convert")}
		>
			convert
		</button>

		<button
			type="button"
			class="mode-tab"
			class:active={mode === "fetch"}
			onclick={() => (mode = "fetch")}
		>
			<Globe size={13} />
			fetch
		</button>
	</div>

	{#if mode === "convert"}
		<div class="card-section">
			<h2 class="section-title">Convert document</h2>

			<p class="section-sub">
				Paste JSON or upload a file. Bismuth detects the content type
				automatically.
			</p>

			<div class="form">
				<fieldset class="field">
					<legend class="field-label"> JSON input </legend>

					<div
						class="drop-zone"
						role="group"
						aria-describedby="json-input-help"
						class:dragging={isDragging}
						ondragover={(e) => {
							e.preventDefault();
							isDragging = true;
						}}
						ondragleave={() => {
							isDragging = false;
						}}
						ondrop={handleDrop}
					>
						<textarea
							id="json-input"
							bind:value={inputJson}
							placeholder="Paste your ATProto document JSON here, or drag & drop a .json file..."
							spellcheck="false"
						></textarea>

						<div
							class="drop-overlay"
							class:visible={isDragging}
							aria-hidden="true"
						>
							<Upload size={24} />
							<span>Drop .json file</span>
						</div>
					</div>

					<p id="json-input-help" class="field-hint">
						Paste JSON here, drag in a .json file, or upload one
						below.
					</p>

					<div class="upload-row">
						<label class="upload-btn">
							<Upload size={14} />
							Upload file

							<input
								type="file"
								accept=".json,application/json"
								onchange={handleFileInput}
								hidden
							/>
						</label>
					</div>
				</fieldset>

				<div class="toggle-row">
					<input
						type="checkbox"
						id="frontmatter"
						bind:checked={frontmatter}
					/>

					<label for="frontmatter"> Include YAML front matter </label>
				</div>

				{#if detectedType === "pckt" || sourceDid}
					<div class="field">
						<label class="field-label" for="source-did">
							Source DID
						</label>

						<input
							id="source-did"
							class="text-input"
							type="text"
							bind:value={sourceDid}
							placeholder="did:plc:… — required for extended-mode Pckt blobs"
						/>
					</div>
				{#else}
					<button
						type="button"
						class="ghost-hint"
						onclick={() => (sourceDid = " ")}
						title="Required for blog.pckt.content documents that store content in blobs rather than inline"
					>
						+ source DID (Pckt blob mode)
					</button>
				{/if}

				<details class="advanced">
					<summary>Advanced</summary>

					<div class="field" style="margin-top: 0.75rem;">
						<label class="field-label" for="page-break">
							Page break separator
						</label>

						<input
							id="page-break"
							class="text-input"
							type="text"
							bind:value={pageBreak}
							placeholder={String.raw`\n\n---\n\n`}
						/>

						<span class="field-hint">
							Inserted between pages in multi-page Leaflet
							documents.
						</span>
					</div>
				</details>

				<button
					type="button"
					class="btn-primary"
					onclick={convert}
					disabled={converting}
				>
					{#if converting}
						<RefreshCw size={14} class="spin" />
						Converting…
					{:else}
						Convert to Markdown
					{/if}
				</button>
			</div>

			{#if convertError}
				<div class="alert alert-error" style="margin-top: 1rem;">
					{convertError}
				</div>
			{/if}

			{#if output}
				<div class="output-section">
					<div class="output-header">
						{#if detectedType}
							<span class="type-badge">
								{detectedType}
							</span>
						{/if}

						<div class="output-actions">
							<button
								type="button"
								class="btn-icon"
								onclick={copyToClipboard}
								title="Copy to clipboard"
							>
								{#if copied}
									<span class="copied-label">Copied</span>
								{:else}
									<Copy size={15} />
								{/if}
							</button>

							<button
								type="button"
								class="btn-icon"
								onclick={downloadMd}
								title="Download .md"
							>
								<Download size={15} />
							</button>
						</div>
					</div>

					<div class="output-area">
						{output}
					</div>
				</div>
			{/if}
		</div>
	{:else if mode === "fetch"}
		<div class="card-section">
			<h2 class="section-title">Fetch publication</h2>

			<p class="section-sub">
				Fetch all documents from a publication and convert them to Markdown.
			</p>

			<div class="form">
				<div class="field">
					<label class="field-label" for="fetch-did">Source DID</label>
					<input
						id="fetch-did"
						class="text-input"
						type="text"
						bind:value={fetchDid}
						placeholder="did:plc:…"
					/>
				</div>

				<div class="field">
					<label class="field-label" for="fetch-rkey">Publication Rkey</label>
					<input
						id="fetch-rkey"
						class="text-input"
						type="text"
						bind:value={fetchRkey}
						placeholder="rkey"
					/>
				</div>

				<div class="toggle-row">
					<input
						type="checkbox"
						id="fetch-frontmatter"
						bind:checked={fetchFrontmatter}
					/>
					<label for="fetch-frontmatter"> Include YAML front matter </label>
				</div>

				<div class="field">
					<label class="field-label" for="fetch-pds">PDS Endpoint (optional)</label>
					<input
						id="fetch-pds"
						class="text-input"
						type="text"
						bind:value={fetchPdsOverride}
						placeholder="https://bsky.social"
					/>
				</div>

				<button
					type="button"
					class="btn-primary"
					onclick={fetchDocs}
					disabled={fetchLoading}
				>
					{#if fetchLoading}
						<RefreshCw size={14} class="spin" />
						Fetching…
					{:else}
						Fetch documents
					{/if}
				</button>
			</div>

			{#if fetchError}
				<div class="alert alert-error" style="margin-top: 1rem;">
					{fetchError}
				</div>
			{/if}

			{#if fetchResults.length > 0}
				<div class="output-section">
					<div class="output-header">
						<span>Fetched {fetchResults.length} documents</span>
						<button class="btn-primary" onclick={downloadAll}>Download all</button>
					</div>

					<div class="results-list" style="margin-top: 1rem;">
						{#each fetchResults as result}
							<div class="result-item" style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
								<span>{result.rkey} — {result.title}</span>
								<button class="btn-icon" onclick={() => downloadFetchResult(result)}>
									<Download size={15} />
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</main>
