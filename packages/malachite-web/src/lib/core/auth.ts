/**
 * ATProto authentication — web layer.
 * Re-exports the shared core logic (including did:web support) from
 * @ewanc26/malachite. No browser-specific additions needed here.
 */
export { resolveIdentity, login } from '@ewanc26/malachite/core';
export type { ResolvedIdentity } from '@ewanc26/malachite/core';
