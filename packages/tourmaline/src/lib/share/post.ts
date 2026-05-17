/**
 * Creates a Bluesky post with the personality card image attached.
 * Uses RichText for proper @mention resolution.
 */

import { Agent, RichText } from "@atproto/api";
import type { PersonalityCardData } from "./personality-svg";
import { renderPersonalitySvg } from "./personality-svg";
import { svgToPng } from "./svg-to-png";

export interface ShareResult {
  uri: string;
  cid: string;
}

export async function sharePersonality(
  agent: Agent,
  card: PersonalityCardData,
): Promise<ShareResult> {
  // 1. Render SVG → PNG
  const svg = renderPersonalitySvg(card);
  const pngBytes = await svgToPng(svg);

  // Parse SVG dimensions for aspect ratio
  const viewBoxMatch = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const svgW = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : 600;
  const svgH = viewBoxMatch ? parseInt(viewBoxMatch[2], 10) : 620;

  // 2. Upload the image blob
  const { data: blobData } = await agent.uploadBlob(pngBytes, {
    encoding: "image/png",
  });

  // 3. Build alt text describing the card content
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

  // 4. Build rich text with @mention
  const rt = new RichText({
    text: `I'm a ${card.archetype}!\n\nfound out by using tourmaline by @ewancroft.uk`,
  });
  await rt.detectFacets(agent);

  // 5. Create the post
  const result = await agent.post({
    text: rt.text,
    facets: rt.facets,
    embed: {
      $type: "app.bsky.embed.images",
      images: [
        {
          alt,
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

  return { uri: result.uri, cid: result.cid };
}
