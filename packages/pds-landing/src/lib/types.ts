export interface KVItem {
	key: string;
	value: string;
	/** Visual state applied to the value cell. */
	status?: 'ok' | 'warn' | 'err' | 'loading';
}

export interface LinkItem {
	href: string;
	label: string;
	/**
	 * Whether to open in a new tab.
	 * Defaults to `true` — set to `false` for internal navigation.
	 */
	external?: boolean;
}
