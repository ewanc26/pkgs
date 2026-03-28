export type GitHubSponsorshipAction =
	| 'created'
	| 'cancelled'
	| 'edited'
	| 'tier_changed'
	| 'pending_cancellation'
	| 'pending_tier_change';

/**
 * GitHub Sponsors webhook payload.
 * Sent as application/json with an X-Hub-Signature-256 header.
 *
 * @see https://docs.github.com/en/webhooks/webhook-events-and-payloads#sponsorship
 */
export interface GitHubSponsorshipWebhookPayload {
	action: GitHubSponsorshipAction;
	sponsorship: {
		node_id: string;
		created_at: string;
		privacy_level: 'public' | 'private';
		tier: {
			node_id: string;
			created_at: string;
			name: string;
			description: string;
			monthly_price_in_cents: number;
			monthly_price_in_dollars: number;
			is_one_time: boolean;
			is_custom_amount: boolean;
		};
		sponsorable: {
			login: string;
			name: string | null;
		};
		sponsor: {
			login: string;
			name: string | null;
		};
	};
	/** Present on tier_changed and pending_tier_change actions */
	changes?: {
		tier?: {
			from: {
				node_id: string;
				created_at: string;
				name: string;
				description: string;
				monthly_price_in_cents: number;
				monthly_price_in_dollars: number;
				is_one_time: boolean;
				is_custom_amount: boolean;
			};
		};
	};
	/** Present on pending_cancellation and pending_tier_change — effective date */
	effective_date?: string;
	sender: {
		login: string;
	};
}

/** An aggregated sponsor record, derived from one or more sponsorship events. */
export interface GitHubSponsor {
	/** GitHub username */
	login: string;
	/** Display name, if known */
	name?: string;
	/** Most recent tier name */
	tierName: string;
	/** Most recent monthly amount in USD */
	monthlyUsd: number;
	/** Whether the sponsorship is currently active */
	isActive: boolean;
}

export interface GitHubSponsorsProps {
	sponsors: GitHubSponsor[];
	heading?: string;
	description?: string;
	/** If true, only show active sponsors */
	activeOnly?: boolean;
	loading?: boolean;
	error?: string | null;
}
