/**
 * Card-type registry for the /share page.
 *
 * Every shareable card type (personality, and later receipt/festival/story)
 * registers a renderer and a share function here. The /share page and the
 * "Share" buttons that launch it work against this registry rather than any
 * one card type directly, so adding a new card type is a matter of adding
 * an entry here — not touching the OAuth/posting page.
 */
import type { Agent } from "@atproto/api";
import type { PersonalityCardData } from "./personality-svg";
import { renderPersonalitySvg } from "./personality-svg";
import { sharePersonality, type ShareResult } from "./post";

export type ShareCardType = "personality";

/** sessionStorage envelope written by a card's "Share" button, read by /share. */
export interface ShareEnvelope {
  type: ShareCardType;
  data: unknown;
}

interface CardHandler<T> {
  render: (data: T) => string;
  share: (agent: Agent, data: T) => Promise<ShareResult>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers: Record<ShareCardType, CardHandler<any>> = {
  personality: { render: renderPersonalitySvg, share: sharePersonality },
};

export function renderCard(envelope: ShareEnvelope): string {
  return handlers[envelope.type].render(envelope.data);
}

export function shareCard(agent: Agent, envelope: ShareEnvelope): Promise<ShareResult> {
  return handlers[envelope.type].share(agent, envelope.data);
}

/** Convenience for a card's "Share" button: writes the envelope tourmaline/share reads. */
export function writeShareEnvelope(type: ShareCardType, data: unknown): void {
  sessionStorage.setItem("tourmaline:share", JSON.stringify({ type, data }));
}

export type { PersonalityCardData };
