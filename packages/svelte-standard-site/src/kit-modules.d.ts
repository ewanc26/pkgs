// SvelteKit 3 no longer ships types for this deprecated module. The library keeps
// importing it so that it still works for SvelteKit 2 consumers.
declare module '$env/dynamic/public' {
	export const env: Record<string, string | undefined>;
}
