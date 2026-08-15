/**
 * Card-type registry for the /share page.
 *
 * Every shareable card type (personality, and later receipt/festival/story)
 * registers a renderer and a share function here. The /share page and the
 * "Share" buttons that launch it work against this registry rather than any
 * one card type directly, so adding a new card type is a matter of adding
 * an entry here — not touching the OAuth/posting page.
 */
import type { Client } from '@atproto/lex';
import type { PersonalityCardData } from "./personality-svg";
import { renderPersonalitySvg } from "./personality-svg";
import type { ReceiptCardData } from "./receipt-svg";
import { renderReceiptSvg } from "./receipt-svg";
import type { FestivalCardData } from "./festival-svg";
import { renderFestivalSvg } from "./festival-svg";
import type { StoryCardData } from "./story-svg";
import { renderStorySvg } from "./story-svg";
import { sharePersonality, shareReceipt, shareFestival, shareStory, type ShareResult } from "./post";

export type ShareCardType = "personality" | "receipt" | "festival" | "story";

/** sessionStorage envelope written by a card's "Share" button, read by /share. */
export interface ShareEnvelope {
  type: ShareCardType;
  data: unknown;
}

interface CardHandler<T> {
  render: (data: T) => string;
  share: (client: Client, data: T) => Promise<ShareResult>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers: Record<ShareCardType, CardHandler<any>> = {
  personality: { render: renderPersonalitySvg, share: sharePersonality },
  receipt: { render: renderReceiptSvg, share: shareReceipt },
  festival: { render: renderFestivalSvg, share: shareFestival },
  story: { render: renderStorySvg, share: shareStory },
};

export function renderCard(envelope: ShareEnvelope): string {
  return handlers[envelope.type].render(envelope.data);
}

export function shareCard(client: Client, envelope: ShareEnvelope): Promise<ShareResult> {
  return handlers[envelope.type].share(client, envelope.data);
}

/** Convenience for a card's "Share" button: writes the envelope tourmaline/share reads. */
export function writeShareEnvelope(type: ShareCardType, data: unknown): void {
  sessionStorage.setItem("tourmaline:share", JSON.stringify({ type, data }));
}

export type { PersonalityCardData, ReceiptCardData, FestivalCardData, StoryCardData };
