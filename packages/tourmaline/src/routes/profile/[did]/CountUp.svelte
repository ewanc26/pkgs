<script lang="ts">
	/**
	 * Small reusable "count up from 0" number, used by the dataset detail
	 * modal's stat tiles. Re-runs whenever `value` changes (e.g. a new item
	 * is selected), so it's safe to mount once and swap props.
	 */
	let {
		value,
		duration = 700,
		formatter = (n: number) => Math.round(n).toLocaleString()
	}: {
		value: number;
		duration?: number;
		formatter?: (n: number) => string;
	} = $props();

	let display = $state(0);

	$effect(() => {
		const target = value;
		const start = performance.now();
		let raf: number;

		function tick(now: number) {
			const elapsed = now - start;
			const t = Math.min(1, duration <= 0 ? 1 : elapsed / duration);
			// ease-out cubic
			const eased = 1 - Math.pow(1 - t, 3);
			display = target * eased;
			if (t < 1) {
				raf = requestAnimationFrame(tick);
			} else {
				display = target;
			}
		}
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
</script>

{formatter(display)}
