import type { AggregatedData } from "./aggregator";
import type { RemarkableDay } from "$lib/types";
import { detectMonthlySpikes } from "./zscore";

function formatDate(d: string): string {
  const date = new Date(d + "T00:00:00Z");
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMonth(yyyyMM: string): string {
  const date = new Date(yyyyMM + "-01T00:00:00Z");
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/**
 * Derive notable moments from aggregated listening data.
 *
 * - biggest:   single day with the most scrobbles
 * - discovery: day when the most new-to-you artists appeared
 * - peak:      month with the highest scrobble count
 * - unusual:   months where an artist's plays spiked statistically (z-score ≥ 2.0)
 */
export function buildRemarkableDays(data: AggregatedData): RemarkableDay[] {
  const days: RemarkableDay[] = [];

  // ─── Biggest single day ───
  let biggestDate = "";
  let biggestCount = 0;
  for (const [date, count] of data.dailyScrobbles) {
    if (count > biggestCount) {
      biggestCount = count;
      biggestDate = date;
    }
  }
  if (biggestDate) {
    days.push({
      date: biggestDate,
      type: "biggest",
      title: "Peak listening day",
      detail: `${biggestCount.toLocaleString()} scrobbles — ${formatDate(biggestDate)}`,
      count: biggestCount,
    });
  }

  // ─── Discovery day (most first-ever artist listens on one day) ───
  const discoveryByDay = new Map<string, number>();
  for (const [_artist, date] of data.artistFirstListen) {
    discoveryByDay.set(date, (discoveryByDay.get(date) ?? 0) + 1);
  }
  let discoveryDate = "";
  let discoveryCount = 0;
  for (const [date, count] of discoveryByDay) {
    if (count > discoveryCount) {
      discoveryCount = count;
      discoveryDate = date;
    }
  }
  if (discoveryDate && discoveryCount >= 3) {
    days.push({
      date: discoveryDate,
      type: "discovery",
      title: "Discovery day",
      detail: `First heard ${discoveryCount} new artists — ${formatDate(discoveryDate)}`,
      count: discoveryCount,
    });
  }

  // ─── Peak month ───
  let peakMonth = "";
  let peakMonthCount = 0;
  for (const [month, count] of data.monthlyScrobbles) {
    if (count > peakMonthCount) {
      peakMonthCount = count;
      peakMonth = month;
    }
  }
  if (peakMonth) {
    days.push({
      date: peakMonth + "-01",
      type: "genre",
      title: "Peak month",
      detail: `${peakMonthCount.toLocaleString()} scrobbles in ${formatMonth(peakMonth)}`,
      count: peakMonthCount,
    });
  }

  // ─── Z-score spikes: statistically unusual artist months ───
  const spikes = detectMonthlySpikes(data.monthlyArtistPlays);
  for (const spike of spikes.slice(0, 3)) {
    const z = spike.z.toFixed(1);
    days.push({
      date: spike.month + "-01",
      type: "unusual",
      title: `${spike.artistName} spike`,
      detail: `${spike.plays.toLocaleString()} plays in ${formatMonth(spike.month)} — ${z}σ above average`,
      count: spike.plays,
    });
  }

  return days.sort((a, b) => a.date.localeCompare(b.date));
}
