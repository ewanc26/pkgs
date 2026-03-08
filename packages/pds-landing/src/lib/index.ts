// ─── Utilities ────────────────────────────────────────────────────────────────
export { fetchPDSStatus } from './utils/fetchPDSStatus.js';
export type { PDSHealth, PDSDescription, PDSStatusResult } from './utils/fetchPDSStatus.js';

// ─── Primitive components ─────────────────────────────────────────────────────
export { default as TerminalCard } from './components/TerminalCard.svelte';
export { default as PromptLine } from './components/PromptLine.svelte';
export { default as Tagline } from './components/Tagline.svelte';
export { default as SectionLabel } from './components/SectionLabel.svelte';
export { default as Divider } from './components/Divider.svelte';
export { default as KVGrid } from './components/KVGrid.svelte';
export type { KVItem } from './components/KVGrid.svelte';
export { default as LinkList } from './components/LinkList.svelte';
export type { LinkItem } from './components/LinkList.svelte';

// ─── Smart / data-fetching components ────────────────────────────────────────
export { default as StatusGrid } from './components/StatusGrid.svelte';

// ─── Compound / section components ───────────────────────────────────────────
export { default as ContactSection } from './components/ContactSection.svelte';
export { default as PDSFooter } from './components/PDSFooter.svelte';

// ─── Full-page convenience component ─────────────────────────────────────────
export { default as PDSPage } from './components/PDSPage.svelte';
