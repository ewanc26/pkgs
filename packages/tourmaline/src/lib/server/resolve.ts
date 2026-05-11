const SLINGSHOT_URL = 'https://slingshot.microcosm.blue';

interface DidDocument {
	id: string;
	alsoKnownAs?: string[];
	service?: Array<{ id: string; type: string; serviceEndpoint: string }>;
}

export interface IdentityResult {
	did: string;
	pdsUrl: string;
	handle?: string;
}

export interface ProfileRecord {
	displayName?: string;
	avatar?: string;
}

/** Extract the CID from an avatar/banner blob reference. */
function extractBlobCid(blob: unknown): string | null {
	if (!blob) return null;
	if (typeof blob === 'string') return blob;
	const obj = blob as Record<string, unknown>;
	if (obj.ref && typeof obj.ref === 'object' && (obj.ref as Record<string, unknown>).$link) {
		return (obj.ref as Record<string, unknown>).$link as string;
	}
	if (obj.cid) return obj.cid as string;
	return null;
}

export async function fetchBlueskyProfile(pdsUrl: string, did: string): Promise<ProfileRecord> {
	const url = `${pdsUrl}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(did)}&collection=app.bsky.actor.profile&rkey=self`;
	try {
		const res = await fetch(url);
		if (!res.ok) return {};
		const data = (await res.json()) as { value?: { displayName?: string; avatar?: unknown } };

		const avatarCid = extractBlobCid(data.value?.avatar);
		const avatar = avatarCid
			? `https://cdn.bsky.app/img/avatar/plain/${did}/${avatarCid}@jpeg`
			: undefined;

		return {
			displayName: data.value?.displayName,
			avatar
		};
	} catch {
		return {};
	}
}

export async function resolveIdentifier(identifier: string): Promise<IdentityResult> {
	let did: string;
	let handle: string | undefined;

	if (identifier.startsWith('did:')) {
		did = identifier;
	} else {
		const res = await fetch(
			`${SLINGSHOT_URL}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(identifier)}`
		);
		if (!res.ok) throw new Error(`Failed to resolve handle "${identifier}": ${res.status}`);
		const data = (await res.json()) as { did: string };
		did = data.did;
		handle = identifier;
	}

	const doc = await resolveDidDocument(did);

	if (!handle) {
		handle = doc.alsoKnownAs?.find((h) => h.startsWith('at://'))?.replace('at://', '');
	}

	const pdsService = doc.service?.find((s) => s.id === '#atproto_pds');
	const pdsUrl = pdsService?.serviceEndpoint;

	if (!pdsUrl) throw new Error('No PDS endpoint found in DID document');

	return { did, pdsUrl, handle };
}

async function resolveDidDocument(did: string): Promise<DidDocument> {
	if (did.startsWith('did:plc:')) {
		const res = await fetch(`https://plc.directory/${did}`);
		if (!res.ok) throw new Error(`Failed to resolve DID: ${res.status}`);
		return await res.json();
	}

	if (did.startsWith('did:web:')) {
		const domain = did.replace('did:web:', '');
		const res = await fetch(`https://${domain}/.well-known/did.json`);
		if (!res.ok) throw new Error(`Failed to resolve DID: ${res.status}`);
		return await res.json();
	}

	throw new Error(`Unsupported DID method: ${did}`);
}
