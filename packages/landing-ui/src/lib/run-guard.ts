/** Browser-side helpers for long-running imports. */

/** The part of a limiter wait the UI needs. */
export interface QuotaWait {
	/** Unix time in milliseconds at which the wait ends. */
	resumeAt: number;
	/** True when the server refused a request; false for a local headroom pause. */
	serverConfirmed: boolean;
}

/** A one-shot flag: a "Try now" click that the publisher consumes once. */
export function createRetryFlag(): { request: () => void; consume: () => boolean; clear: () => void } {
	let requested = false;
	return {
		request: () => {
			requested = true;
		},
		consume: () => {
			const was = requested;
			requested = false;
			return was;
		},
		clear: () => {
			requested = false;
		}
	};
}

/**
 * While an import runs, warn before the tab is closed and ask the screen to stay
 * on so the machine does not sleep mid-wait. Returns a cleanup function, so it
 * can be returned straight from a Svelte `$effect`.
 */
export function guardRun(): () => void {
	let released = false;
	let lock: { release: () => Promise<void> } | null = null;

	const warn = (event: BeforeUnloadEvent) => {
		event.preventDefault();
	};

	const keepAwake = async () => {
		if (released || document.visibilityState !== 'visible') return;
		try {
			const next = await (navigator as any).wakeLock?.request('screen');
			if (released) await next?.release();
			else lock = next ?? null;
		} catch {
			// Unsupported or refused (low battery): the import still runs.
		}
	};

	window.addEventListener('beforeunload', warn);
	// The browser drops the lock whenever the tab is hidden.
	document.addEventListener('visibilitychange', keepAwake);
	void keepAwake();

	return () => {
		released = true;
		window.removeEventListener('beforeunload', warn);
		document.removeEventListener('visibilitychange', keepAwake);
		void lock?.release().catch(() => {});
	};
}
