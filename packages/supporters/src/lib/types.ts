export type KofiEventType = 'Donation' | 'Subscription' | 'Commission' | 'Shop Order';

/**
 * Ko-fi webhook payload — sent as application/x-www-form-urlencoded.
 * The `data` field is a JSON string containing this structure.
 *
 * @see https://ko-fi.com/manage/webhooks
 */
export interface KofiWebhookPayload {
	verification_token: string;
	message_id: string;
	timestamp: string;
	type: KofiEventType;
	is_public: boolean;
	from_name: string;
	message: string | null;
	amount: string;
	url: string;
	email: string;
	currency: string;
	is_subscription_payment: boolean;
	is_first_subscription_payment: boolean;
	kofi_transaction_id: string;
	shop_items: Array<{ direct_link_code: string }> | null;
	tier_name: string | null;
	shipping: unknown | null;
}

/** A persisted supporter record, derived from one or more webhook events. */
export interface KofiSupporter {
	/** Display name from the Ko-fi payment */
	name: string;
	/** All event types seen from this person (deduplicated) */
	types: KofiEventType[];
	/** All tier names seen from this person (deduplicated, non-null) */
	tiers: string[];
}

export interface KofiSupportersProps {
	supporters: KofiSupporter[];
	heading?: string;
	description?: string;
	/** If set, only show supporters who have at least one event of these types */
	filter?: KofiEventType[];
	loading?: boolean;
	error?: string | null;
}
