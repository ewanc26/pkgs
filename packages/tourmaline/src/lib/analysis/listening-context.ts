/**
 * Qualitative framing for a listener's stats — "where do I sit?" context
 * for diversity, obscurity, and listening pace.
 *
 * IMPORTANT SCOPE NOTE: tourmaline is a stateless app (no database — see
 * README) with no way to track a live distribution of other listeners'
 * stats to compute a genuine percentile against. Rather than fabricate
 * cross-user tracking or invent precise-sounding statistics, this module
 * frames each score against its own documented scale (diversity/obscurity
 * are already 0-100 by construction) plus one externally-referenced
 * band — average daily listening time — sourced from commonly-cited
 * industry listening-time surveys (roughly 1.5-2.5 hours/day) and
 * presented as an illustrative range, not a precise benchmark.
 */
import type { ListenerProfile } from "$lib/types";

export interface ContextEntry {
  label: string;
  tier: string;
  detail: string;
}

function diversityTier(score: number): ContextEntry {
  if (score >= 80) {
    return {
      label: "Diversity",
      tier: "Highly diverse",
      detail: "Listening is spread thin across many artists — no single act dominates.",
    };
  }
  if (score >= 55) {
    return {
      label: "Diversity",
      tier: "Balanced",
      detail: "A healthy mix of go-to favourites and wider exploration.",
    };
  }
  if (score >= 30) {
    return {
      label: "Diversity",
      tier: "Focused",
      detail: "A relatively small core of artists accounts for most listening.",
    };
  }
  return {
    label: "Diversity",
    tier: "Highly focused",
    detail: "Listening concentrates heavily on a handful of favourites on repeat.",
  };
}

function obscurityTier(score: number): ContextEntry {
  if (score >= 75) {
    return {
      label: "Obscurity",
      tier: "Deep cuts",
      detail: "Mostly artists with small global listener counts — off the mainstream radar.",
    };
  }
  if (score >= 50) {
    return {
      label: "Obscurity",
      tier: "Off the beaten path",
      detail: "A lean toward lesser-known artists over chart mainstays.",
    };
  }
  if (score >= 25) {
    return {
      label: "Obscurity",
      tier: "Mixed",
      detail: "A blend of well-known names and more niche picks.",
    };
  }
  return {
    label: "Obscurity",
    tier: "Mainstream-leaning",
    detail: "Mostly artists with large, well-established audiences.",
  };
}

/** Roughly-cited industry range for average daily music listening time. */
const AVG_DAILY_MINUTES_LOW = 90;
const AVG_DAILY_MINUTES_HIGH = 150;

function paceTier(avgMinutesPerActiveDay: number): ContextEntry {
  if (avgMinutesPerActiveDay >= AVG_DAILY_MINUTES_HIGH * 1.5) {
    return {
      label: "Listening pace",
      tier: "Well above typical",
      detail: `~${Math.round(avgMinutesPerActiveDay)} min on an average listening day — well past the commonly-cited ${AVG_DAILY_MINUTES_LOW}-${AVG_DAILY_MINUTES_HIGH} min/day range for a typical listener.`,
    };
  }
  if (avgMinutesPerActiveDay >= AVG_DAILY_MINUTES_HIGH) {
    return {
      label: "Listening pace",
      tier: "Above typical",
      detail: `~${Math.round(avgMinutesPerActiveDay)} min on an average listening day, above the commonly-cited ${AVG_DAILY_MINUTES_LOW}-${AVG_DAILY_MINUTES_HIGH} min/day range.`,
    };
  }
  if (avgMinutesPerActiveDay >= AVG_DAILY_MINUTES_LOW) {
    return {
      label: "Listening pace",
      tier: "Typical range",
      detail: `~${Math.round(avgMinutesPerActiveDay)} min on an average listening day, in the commonly-cited ${AVG_DAILY_MINUTES_LOW}-${AVG_DAILY_MINUTES_HIGH} min/day range.`,
    };
  }
  return {
    label: "Listening pace",
    tier: "Below typical",
    detail: `~${Math.round(avgMinutesPerActiveDay)} min on an average listening day, below the commonly-cited ${AVG_DAILY_MINUTES_LOW}-${AVG_DAILY_MINUTES_HIGH} min/day range.`,
  };
}

export function buildListeningContext(profile: ListenerProfile): ContextEntry[] {
  const entries: ContextEntry[] = [diversityTier(profile.diversityScore), obscurityTier(profile.obscurityIndex)];

  const activeDays = profile.dailyScrobbles.filter((d) => d.count > 0).length;
  if (activeDays > 0 && profile.totalMinutes > 0) {
    entries.push(paceTier(profile.totalMinutes / activeDays));
  }

  return entries;
}
