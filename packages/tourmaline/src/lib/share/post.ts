/**
 * Creates a Bluesky post with a share card image attached.
 * Uses RichText for proper @mention resolution.
 *
 * `postCardImage` is the generic render→upload→post→log pipeline shared by
 * every card type; each card type's own module (e.g. personality below)
 * only needs to build the SVG, alt text, and post copy.
 */

import { Agent, RichText } from "@atproto/api";
import type { PersonalityCardData } from "./personality-svg";
import { renderPersonalitySvg } from "./personality-svg";
import type { ReceiptCardData } from "./receipt-svg";
import { renderReceiptSvg } from "./receipt-svg";
import type { FestivalCardData } from "./festival-svg";
import { renderFestivalSvg } from "./festival-svg";
import { svgToPng } from "./svg-to-png";

export interface ShareResult {
  uri: string;
  cid: string;
}

export interface PostCardImageOptions {
  svg: string;
  alt: string;
  postText: string;
  /** Extra fields merged into the click.croft.tools.tourmaline toolkit-use record. */
  toolkitExtra?: Record<string, unknown>;
}

export async function postCardImage(
  agent: Agent,
  opts: PostCardImageOptions,
): Promise<ShareResult> {
  // 1. Render SVG → PNG
  const pngBytes = await svgToPng(opts.svg);

  // Parse SVG dimensions for aspect ratio
  // Card heights can be non-integer (accumulated from fractional line-height
  // math) — match decimals too, or a card with a fractional viewBox silently
  // falls back to the wrong aspect ratio here.
  const viewBoxMatch = opts.svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const svgW = viewBoxMatch ? Math.round(parseFloat(viewBoxMatch[1])) : 600;
  const svgH = viewBoxMatch ? Math.round(parseFloat(viewBoxMatch[2])) : 620;

  // 2. Upload the image blob
  const { data: blobData } = await agent.uploadBlob(pngBytes, {
    encoding: "image/png",
  });

  // 3. Build rich text with @mention
  const rt = new RichText({ text: opts.postText });
  await rt.detectFacets(agent);

  // 4. Create the post
  const result = await agent.post({
    text: rt.text,
    facets: rt.facets,
    embed: {
      $type: "app.bsky.embed.images",
      images: [
        {
          alt: opts.alt,
          image: blobData.blob,
          aspectRatio: {
            width: svgW,
            height: svgH,
          },
        },
      ],
    },
    createdAt: new Date().toISOString(),
  });

  // 5. Log toolkit usage — best-effort, don't let it fail the share
  try {
    await agent.com.atproto.repo.createRecord({
      repo: agent.sessionManager.did ?? agent.did ?? "",
      collection: "click.croft.toolkit.use",
      record: {
        $type: "click.croft.toolkit.use",
        tool: {
          $type: "click.croft.tools.tourmaline",
          ...opts.toolkitExtra,
          sharedToBluesky: true,
        },
        createdAt: new Date().toISOString(),
      },
    });
  } catch {
    // non-fatal
  }

  return { uri: result.uri, cid: result.cid };
}

export async function sharePersonality(
  agent: Agent,
  card: PersonalityCardData,
): Promise<ShareResult> {
  const svg = renderPersonalitySvg(card);

  const genres = (card.genres ?? [])
    .slice(0, 5)
    .map((g) => g.name)
    .join(", ");
  const moods = Object.entries(card.mood ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .filter(([, v]) => v > 0)
    .map(([m]) => m.toLowerCase())
    .join(", ");
  const traits = card.traits
    .map((t) => `${t.label.toLowerCase()}: ${t.value}`)
    .join("; ");

  const alt = [
    `Personality profile for ${card.displayName ?? "this listener"}: ${card.archetype}.`,
    card.archetypeBlurb,
    genres ? `Top genres: ${genres}.` : "",
    moods ? `Mood: ${moods}.` : "",
    card.diversityScore != null ? `Diversity: ${card.diversityScore}/100.` : "",
    card.obscurityIndex != null ? `Obscurity: ${card.obscurityIndex}/100.` : "",
    traits ? traits : "",
  ]
    .filter(Boolean)
    .join(" ");

  return postCardImage(agent, {
    svg,
    alt,
    postText: `I'm a ${card.archetype}!\n\nfound out by using tourmaline by @ewancroft.uk`,
    toolkitExtra:
      card.totalScrobbles != null ? { scrobblesAnalyzed: card.totalScrobbles } : {},
  });
}

export async function shareReceipt(agent: Agent, card: ReceiptCardData): Promise<ShareResult> {
  const svg = renderReceiptSvg(card);

  const tracks = (Array.isArray(card.tracks) ? card.tracks : []).slice(0, 5);
  const trackList = tracks.map((t, i) => `${i + 1}. ${t.name} — ${t.artist}`).join("; ");

  const alt = [
    `Listening receipt for ${card.displayName ?? "this listener"} (${card.rangeLabel ?? "all time"}).`,
    trackList ? `Top tracks: ${trackList}.` : "",
    card.totalScrobbles != null ? `Total scrobbles: ${card.totalScrobbles}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return postCardImage(agent, {
    svg,
    alt,
    postText: `My listening receipt (${card.rangeLabel ?? "all time"}) 🧾\n\nvia tourmaline by @ewancroft.uk`,
    toolkitExtra:
      card.totalScrobbles != null ? { scrobblesAnalyzed: card.totalScrobbles } : {},
  });
}

export async function shareFestival(agent: Agent, card: FestivalCardData): Promise<ShareResult> {
  const svg = renderFestivalSvg(card);

  const artists = (Array.isArray(card.artists) ? card.artists : []).slice(0, 10);
  const alt = [
    `Festival-style lineup poster for ${card.displayName ?? "this listener"} (${card.rangeLabel ?? "all time"}).`,
    artists.length ? `Lineup, headliners first: ${artists.map((a) => a.name).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return postCardImage(agent, {
    svg,
    alt,
    postText: `My listening lineup (${card.rangeLabel ?? "all time"}) 🎪\n\nvia tourmaline by @ewancroft.uk`,
    toolkitExtra: {},
  });
}
