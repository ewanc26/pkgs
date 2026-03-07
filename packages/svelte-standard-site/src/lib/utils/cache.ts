/**
 * Simple in-memory cache with TTL support
 */

interface CacheEntry<T> {
	value: T;
	expires: number;
}

class Cache {
	private store = new Map<string, CacheEntry<any>>();
	private defaultTTL = 5 * 60 * 1000; // 5 minutes

	get<T>(key: string): T | null {
		const entry = this.store.get(key);
		if (!entry) return null;

		if (Date.now() > entry.expires) {
			this.store.delete(key);
			return null;
		}

		return entry.value;
	}

	set<T>(key: string, value: T, ttl?: number): void {
		this.store.set(key, {
			value,
			expires: Date.now() + (ttl ?? this.defaultTTL)
		});
	}

	delete(key: string): void {
		this.store.delete(key);
	}

	clear(): void {
		this.store.clear();
	}

	setDefaultTTL(ttl: number): void {
		this.defaultTTL = ttl;
	}
}

export const cache = new Cache();
