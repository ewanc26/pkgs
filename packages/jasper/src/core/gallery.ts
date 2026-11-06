/**
 * Gallery metadata for an Instagram post.
 *
 * Grain treats a gallery as one post, so an imported Instagram post becomes
 * one gallery: the caption is the description and a shortened, single-line
 * form of it is the title. The date is the post's own timestamp.
 */

/** Longest title we send; Grain has no published limit, so keep it readable. */
export const GALLERY_TITLE_MAX = 80;

/** Collapse whitespace and trim, so a multi-line caption becomes one line. */
function single_line(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Title for the gallery made from this post.
 *
 * Uses the caption when there is one, whitespace-collapsed and shortened with
 * an ellipsis at GALLERY_TITLE_MAX. A post without a caption gets a dated
 * title so the gallery is still identifiable in Grain.
 */
export function galleryTitleForPost(
  caption: string | undefined,
  createdAt: Date,
): string {
  const text = single_line(caption || "");
  if (text.length === 0) {
    return `Instagram post — ${createdAt.toISOString().slice(0, 10)}`;
  }
  if (text.length <= GALLERY_TITLE_MAX) {
    return text;
  }
  return `${text.slice(0, GALLERY_TITLE_MAX - 1).trimEnd()}…`;
}

/**
 * Description for the gallery made from this post.
 *
 * The full caption, when the title is not already all of it. Undefined for a
 * post without a caption so the record keeps the field out.
 */
export function galleryDescriptionForPost(
  caption: string | undefined,
): string | undefined {
  const text = (caption || "").trim();
  if (text.length === 0) {
    return undefined;
  }
  return text;
}
