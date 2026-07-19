<script lang="ts">
	import { onDestroy } from "svelte";
	import { coreProjects, extraProjects } from "$lib/data/projects";

	const W = 980;
	const H = 520;

	interface GNode {
		id: string;
		cx: number;
		cy: number;
		r: number;
		accent: string;
		logo?: string;
		label: string;
		href: string;
		type: "master" | "project" | "service";
		textNode?: string;
		dashed?: boolean;
	}

	interface GEdge {
		a: string;
		b: string;
		variant: "hub" | "service" | "shared" | "platform";
	}

	const ps = Object.fromEntries(
		[...coreProjects, ...extraProjects].map((p) => [p.slug, p]),
	);

	const nodes: GNode[] = [
		{
			id: "croft",
			cx: 490,
			cy: 260,
			r: 28,
			accent: "#fafaf9",
			logo: "/favicon.svg",
			label: "croft.click",
			href: "https://croft.click",
			type: "master",
		},

		{
			id: "jasper",
			cx: 337,
			cy: 175,
			r: 21,
			accent: ps.jasper.accent,
			logo: ps.jasper.logo,
			label: "Jasper",
			href: ps.jasper.url,
			type: "project",
		},
		{
			id: "opal",
			cx: 490,
			cy: 80,
			r: 21,
			accent: ps.opal.accent,
			logo: ps.opal.logo,
			label: "Opal",
			href: ps.opal.url,
			type: "project",
		},
		{
			id: "tourmaline",
			cx: 643,
			cy: 175,
			r: 21,
			accent: ps.tourmaline.accent,
			logo: ps.tourmaline.logo,
			label: "Tourmaline",
			href: ps.tourmaline.url,
			type: "project",
		},
		{
			id: "bismuth",
			cx: 643,
			cy: 345,
			r: 21,
			accent: ps.bismuth.accent,
			logo: ps.bismuth.logo,
			label: "Bismuth",
			href: ps.bismuth.url,
			type: "project",
		},
		{
			id: "devlog",
			cx: 490,
			cy: 440,
			r: 21,
			accent: ps.devlog.accent,
			logo: ps.devlog.logo,
			label: "Devlog",
			href: ps.devlog.url,
			type: "project",
		},
		{
			id: "malachite",
			cx: 337,
			cy: 345,
			r: 21,
			accent: ps.malachite.accent,
			logo: ps.malachite.logo,
			label: "Malachite",
			href: ps.malachite.url,
			type: "project",
		},
		{
			id: "hasharium",
			cx: 215,
			cy: 440,
			r: 21,
			accent: ps.hasharium.accent,
			logo: ps.hasharium.logo,
			label: "Hasharium",
			href: ps.hasharium.url,
			type: "project",
		},

		{
			id: "bluesky",
			cx: 600,
			cy: 28,
			r: 15,
			accent: "#0085ff",
			logo: "/bluesky.svg",
			label: "Bluesky",
			href: "https://bsky.app",
			type: "service",
		},
		{
			id: "grain",
			cx: 178,
			cy: 110,
			r: 15,
			accent: "#d97706",
			logo: "/grain.svg",
			label: "Grain",
			href: "https://grain.social",
			type: "service",
		},
		{
			id: "spark",
			cx: 210,
			cy: 50,
			r: 15,
			accent: "#f59e0b",
			logo: "/spark.svg",
			label: "Spark",
			href: "https://sprk.so",
			type: "service",
		},
		{
			id: "tealfm",
			cx: 805,
			cy: 255,
			r: 15,
			accent: "#2dd4bf",
			logo: undefined,
			label: "Teal.fm",
			href: "https://teal.fm",
			type: "service",
			textNode: "TL",
			dashed: true,
		},

		{
			id: "standardsite",
			cx: 780,
			cy: 420,
			r: 16,
			accent: "#e7e5e4",
			logo: "/standard-site.svg",
			label: "standard.site",
			href: "https://standard.site",
			type: "service",
		},

		{
			id: "leaflet",
			cx: 900,
			cy: 355,
			r: 14,
			accent: "#84cc16",
			logo: "/leaflet.svg",
			label: "Leaflet",
			href: "https://leaflet.pub",
			type: "service",
		},
		{
			id: "pckt",
			cx: 920,
			cy: 445,
			r: 14,
			accent: "#f97316",
			logo: "/pckt.svg",
			label: "Pckt",
			href: "https://pckt.blog",
			type: "service",
		},
		{
			id: "offprint",
			cx: 850,
			cy: 500,
			r: 14,
			accent: "#a78bfa",
			logo: "/offprint.svg",
			label: "Offprint",
			href: "https://offprint.app",
			type: "service",
		},
	];

	const edges: GEdge[] = [
		{ a: "croft", b: "jasper", variant: "hub" },
		{ a: "croft", b: "opal", variant: "hub" },
		{ a: "croft", b: "tourmaline", variant: "hub" },
		{ a: "croft", b: "bismuth", variant: "hub" },
		{ a: "croft", b: "devlog", variant: "hub" },
		{ a: "croft", b: "malachite", variant: "hub" },
		{ a: "croft", b: "hasharium", variant: "hub" },
		{ a: "jasper", b: "grain", variant: "service" },
		{ a: "jasper", b: "spark", variant: "service" },
		{ a: "opal", b: "bluesky", variant: "service" },
		{ a: "malachite", b: "tealfm", variant: "shared" },
		{ a: "tourmaline", b: "tealfm", variant: "shared" },

		{ a: "bismuth", b: "standardsite", variant: "service" },
		{ a: "devlog", b: "standardsite", variant: "service" },
		{ a: "standardsite", b: "leaflet", variant: "platform" },
		{ a: "standardsite", b: "pckt", variant: "platform" },
		{ a: "standardsite", b: "offprint", variant: "platform" },
	];

	const nm = new Map(nodes.map((n) => [n.id, n]));
	const firstNodeId = nodes[0]?.id ?? null;

	let camX = 0;
	let camY = 0;
	const zoom = 1;
	let viewBox = `${camX} ${camY} ${W / zoom} ${H / zoom}`;

	let focusedNodeId: string | null = firstNodeId;

	let svgEl: SVGSVGElement | null = null;

	let isPanning = false;
	let panPointerId: number | null = null;
	let panStart = { x: 0, y: 0 };
	let camStart = { x: 0, y: 0 };

	let animFrame: number | null = null;

	$: viewBox = `${camX} ${camY} ${W / zoom} ${H / zoom}`;

	onDestroy(() => {
		if (animFrame !== null) cancelAnimationFrame(animFrame);
	});

	function ep(aid: string, bid: string) {
		const a = nm.get(aid)!;
		const b = nm.get(bid)!;
		const dx = b.cx - a.cx;
		const dy = b.cy - a.cy;
		const len = Math.sqrt(dx * dx + dy * dy);
		const ux = dx / len;
		const uy = dy / len;
		return {
			x1: a.cx + a.r * ux,
			y1: a.cy + a.r * uy,
			x2: b.cx - b.r * ux,
			y2: b.cy - b.r * uy,
		};
	}

	function lp(n: GNode): { x: number; y: number; anchor: string } {
		if (n.id === "croft")
			return { x: n.cx, y: n.cy + n.r + 14, anchor: "middle" };

		const dx = n.cx - W / 2;
		const dy = n.cy - H / 2;
		const pad = n.r + 9;

		if (Math.abs(dx) > Math.abs(dy) * 1.2) {
			return dx > 0
				? { x: n.cx + pad, y: n.cy + 4, anchor: "start" }
				: { x: n.cx - pad, y: n.cy + 4, anchor: "end" };
		} else if (dy < 0) {
			if (n.cy - pad < 18)
				return { x: n.cx + pad, y: n.cy + 4, anchor: "start" };
			return { x: n.cx, y: n.cy - pad, anchor: "middle" };
		} else {
			return { x: n.cx, y: n.cy + pad + 7, anchor: "middle" };
		}
	}

	function edgeStroke(variant: GEdge["variant"]) {
		if (variant === "shared")
			return { color: "#2dd4bf", width: 1, opacity: 0.55, dash: "3 3" };
		if (variant === "hub")
			return {
				color: "#57534e",
				width: 1.5,
				opacity: 0.7,
				dash: undefined,
			};
		if (variant === "platform")
			return { color: "#57534e", width: 1, opacity: 0.35, dash: "2 4" };
		return { color: "#57534e", width: 1, opacity: 0.45, dash: "4 3" };
	}

	function getNode(id: string) {
		const node = nm.get(id);
		if (!node) throw new Error(`Unknown node: ${id}`);
		return node;
	}

	function centerOnNode(node: GNode, smooth = true) {
		const targetX = node.cx - W / (2 * zoom);
		const targetY = node.cy - H / (2 * zoom);

		if (!smooth) {
			camX = targetX;
			camY = targetY;
			return;
		}

		animateCamera(targetX, targetY);
	}

	function animateCamera(targetX: number, targetY: number) {
		if (animFrame !== null) cancelAnimationFrame(animFrame);

		const startX = camX;
		const startY = camY;
		const dx = targetX - startX;
		const dy = targetY - startY;
		const duration = 260;
		const startTime = performance.now();

		function step(now: number) {
			const p = Math.min((now - startTime) / duration, 1);
			const ease = 1 - Math.pow(1 - p, 3);

			camX = startX + dx * ease;
			camY = startY + dy * ease;

			if (p < 1) {
				animFrame = requestAnimationFrame(step);
			} else {
				animFrame = null;
			}
		}

		animFrame = requestAnimationFrame(step);
	}

	function setFocused(id: string, smooth = true) {
		focusedNodeId = id;
		centerOnNode(getNode(id), smooth);
	}

	function directionCandidates(
		current: GNode,
		direction: "up" | "down" | "left" | "right",
	) {
		return nodes.filter((n) => {
			if (n.id === current.id) return false;
			if (direction === "left") return n.cx < current.cx;
			if (direction === "right") return n.cx > current.cx;
			if (direction === "up") return n.cy < current.cy;
			return n.cy > current.cy;
		});
	}

	function pickNearest(
		current: GNode,
		direction: "up" | "down" | "left" | "right",
	) {
		const candidates = directionCandidates(current, direction);
		if (!candidates.length) return null;

		return candidates
			.map((n) => {
				const dx = n.cx - current.cx;
				const dy = n.cy - current.cy;
				const primary =
					direction === "left" || direction === "right"
						? Math.abs(dx)
						: Math.abs(dy);
				const secondary =
					direction === "left" || direction === "right"
						? Math.abs(dy)
						: Math.abs(dx);
				const score = primary * 2 + secondary;
				return { node: n, score };
			})
			.sort((a, b) => a.score - b.score)[0].node;
	}

	function focusById(id: string) {
		const el = document.querySelector<SVGAElement>(
			`[data-node-id="${id}"]`,
		);
		el?.focus();
		setFocused(id);
	}

	function handleKeydown(e: KeyboardEvent, id: string) {
		const current = getNode(id);

		switch (e.key) {
			case "ArrowLeft":
			case "ArrowRight":
			case "ArrowUp":
			case "ArrowDown": {
				e.preventDefault();
				const dir =
					e.key === "ArrowLeft"
						? "left"
						: e.key === "ArrowRight"
							? "right"
							: e.key === "ArrowUp"
								? "up"
								: "down";

				const next = pickNearest(current, dir);
				if (next) focusById(next.id);
				return;
			}

			case "Home":
				e.preventDefault();
				if (firstNodeId) focusById(firstNodeId);
				return;

			case "End":
				e.preventDefault();
				if (nodes.length) focusById(nodes[nodes.length - 1].id);
				return;

			case " ":
				e.preventDefault();
				window.open(current.href, "_blank", "noopener");
				return;

			default:
				return;
		}
	}

	function isInteractiveTarget(target: EventTarget | null) {
		return target instanceof Element && !!target.closest("a");
	}

	function onPointerDown(e: PointerEvent) {
		if (isInteractiveTarget(e.target)) return;

		isPanning = true;
		panPointerId = e.pointerId;
		panStart = { x: e.clientX, y: e.clientY };
		camStart = { x: camX, y: camY };

		svgEl?.setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isPanning || panPointerId !== e.pointerId) return;

		const dx = (e.clientX - panStart.x) / zoom;
		const dy = (e.clientY - panStart.y) / zoom;

		camX = camStart.x - dx;
		camY = camStart.y - dy;
	}

	function endPan(e: PointerEvent) {
		if (panPointerId !== e.pointerId) return;

		isPanning = false;

		try {
			svgEl?.releasePointerCapture(e.pointerId);
		} catch {
			// no-op
		}

		panPointerId = null;
	}
</script>

<div class="pairing-wrap">
	<p class="pairing-eyebrow">WORKS GREAT WITH</p>

	<div class="graph-container">
		<svg
			bind:this={svgEl}
			{viewBox}
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-labelledby="graphTitle graphDesc"
			class:panning={isPanning}
			on:pointerdown={onPointerDown}
			on:pointermove={onPointerMove}
			on:pointerup={endPan}
			on:pointercancel={endPan}
			on:pointerleave={endPan}
		>
			<title id="graphTitle">croft.click project relationship graph</title
			>
			<desc id="graphDesc">
				Interactive network of projects and services connected to
				croft.click. Use Tab to move through nodes, arrow keys to move
				spatially, and drag the background to pan.
			</desc>

			<defs>
				<filter
					id="node-glow"
					x="-60%"
					y="-60%"
					width="220%"
					height="220%"
				>
					<feGaussianBlur stdDeviation="4" result="blur" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>

				<filter
					id="node-glow-sm"
					x="-60%"
					y="-60%"
					width="220%"
					height="220%"
				>
					<feGaussianBlur stdDeviation="2.5" result="blur" />
					<feMerge>
						<feMergeNode in="blur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>

			{#each edges as edge}
				{@const pts = ep(edge.a, edge.b)}
				{@const s = edgeStroke(edge.variant)}
				<line
					x1={pts.x1}
					y1={pts.y1}
					x2={pts.x2}
					y2={pts.y2}
					stroke={s.color}
					stroke-width={s.width}
					stroke-opacity={s.opacity}
					stroke-dasharray={s.dash}
					aria-hidden="true"
					focusable="false"
				/>
			{/each}

			{#each nodes as node}
				{@const pos = lp(node)}
				{@const imgSize = node.r * 1.2}
				{@const imgOff = node.r * 0.6}

				<g>
					<a
						href={node.href}
						rel="noopener"
						target="_blank"
						data-node-id={node.id}
						tabindex={focusedNodeId === node.id ||
						(!focusedNodeId && node.id === firstNodeId)
							? 0
							: -1}
						aria-label={`Open ${node.label} ${node.type === "master" ? "site" : node.type} in a new tab`}
						on:focus={() => setFocused(node.id)}
						on:keydown={(e) => handleKeydown(e, node.id)}
					>
						<title>{node.label}</title>

						<circle
							cx={node.cx}
							cy={node.cy}
							r={node.r}
							fill={node.accent}
							fill-opacity={node.type === "master" ? 0.22 : 0.18}
							stroke={node.accent}
							stroke-width={node.type === "master" ? 2 : 1.5}
							stroke-dasharray={node.dashed ? "3 2" : undefined}
							filter={`url(#${node.type === "master" ? "node-glow" : "node-glow-sm"})`}
							class="node-circle"
							aria-hidden="true"
							focusable="false"
						/>

						{#if focusedNodeId === node.id}
							<circle
								cx={node.cx}
								cy={node.cy}
								r={node.r + 6}
								fill="none"
								stroke={node.accent}
								stroke-width="1"
								opacity="0.7"
								aria-hidden="true"
								focusable="false"
							/>
						{/if}

						{#if node.logo}
							<image
								href={node.logo}
								x={node.cx - imgOff}
								y={node.cy - imgOff}
								width={imgSize}
								height={imgSize}
								aria-hidden="true"
								focusable="false"
							/>
						{/if}

						{#if node.textNode}
							<text
								x={node.cx}
								y={node.cy + 3}
								text-anchor="middle"
								font-family="JetBrains Mono, monospace"
								font-size="8"
								fill={node.accent}
								letter-spacing="0.06em"
								aria-hidden="true"
								focusable="false"
							>
								{node.textNode}
							</text>
						{/if}
					</a>

					<text
						x={pos.x}
						y={pos.y}
						text-anchor={pos.anchor}
						font-family="JetBrains Mono, monospace"
						font-size={node.type === "service"
							? 9
							: node.type === "master"
								? 10
								: 11}
						fill={node.type === "project"
							? "#c4bfba"
							: node.type === "master"
								? "#fafaf9"
								: "#78716c"}
						letter-spacing="0.08em"
						aria-hidden="true"
						focusable="false"
					>
						{node.label}
					</text>
				</g>
			{/each}
		</svg>
	</div>
</div>

<style>
	.pairing-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		max-width: 72rem;
		margin-bottom: 3rem;
	}

	.pairing-eyebrow {
		font-family: "JetBrains Mono", monospace;
		font-size: 0.7rem;
		letter-spacing: 0.18em;
		color: var(--muted);
		margin: 0 0 0.75rem;
	}

	.graph-container {
		width: 100%;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 0.75rem;
		overflow: hidden;
		user-select: none;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		touch-action: none;
	}

	svg.panning {
		cursor: grabbing;
	}

	svg:not(.panning) {
		cursor: grab;
	}

	svg a {
		cursor: pointer;
	}

	svg a .node-circle {
		transition:
			fill-opacity 0.15s,
			stroke-opacity 0.15s,
			stroke-width 0.15s;
	}

	svg a:hover .node-circle {
		fill-opacity: 0.32;
		stroke-opacity: 0.9;
	}

	svg a:focus .node-circle,
	svg a:focus-visible .node-circle {
		fill-opacity: 0.35;
		stroke-opacity: 1;
		stroke-width: 2.5px;
		outline: none;
	}
</style>
