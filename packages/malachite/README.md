<p align="center">
  <img src="assets/logo/Malachite.svg" alt="Malachite" width="120" />
</p>

# malachite

Import your music listening history to AT Protocol as `fm.teal.feed.play` records, from Last.fm, Spotify, Apple Music, YouTube Music, or ListenBrainz. Web interface at [malachite.croft.click](https://malachite.croft.click).

Full documentation at **[docs.ewancroft.uk](https://docs.ewancroft.uk/projects/malachite)**.

## Deduplication & sync guarantees

Malachite treats two play records as the same listen using a single shared key
(`@ewanc26/croft-click-core`): the **normalized artist**, **normalized track**,
and a **canonical timestamp**. Normalization is case-insensitive,
punctuation-insensitive, and applies Unicode **NFKC** equivalence first, so
`Dagames`/`DAGames`, `jack stauber's`/`jack stauber's` (curly vs straight
apostrophe), and `Bru-C`/`Bru-C` (non-breaking vs regular hyphen) all collapse
onto one key **without** rewriting the casing of the stored record.

Timestamps are parsed and re-emitted as canonical ISO 8601, so the same instant
scrobbled as `2026-07-17T11:39:14Z` and `2026-07-17T11:39:14.000Z` hashes to one
record key and publishes a byte-identical `playedTime`.

Beyond exact keys, the sync and cleanup paths also fold together records that
share artist + track within a **±60 second** window — the conservative
"cross-source overlap / double-fire" tolerance (a deliberate replay of a short
track after the window is preserved as a real listen). This window is
configurable via the `windowMs`/`--dedup-window` option.

The historical `deduplicate` mode (`--mode deduplicate`) is **dry-run first**:
it fetches your repo via CAR, builds a reviewable plan that keeps the richest
copy of each duplicate cluster (MusicBrainz IDs, ISRC, duration preferred) and
marks the rest for deletion, then prompts for confirmation before deleting
anything with `com.atproto.repo.deleteRecord`.

## Related projects

Part of the [croft.click](https://croft.click) toolkit — free, browser-based tools for moving your data onto the AT Protocol:

- [Opal](https://opal.croft.click) — Convert Twitter, Mastodon, Threads, and Nostr posts to Bluesky.
- [Jasper](https://jasper.croft.click) — Import Instagram photos, stories, and videos to Grain or Spark.
- [Bismuth](https://bismuth.croft.click) — Convert ATProto richtext-block documents to Markdown.
- [Tourmaline](https://tourmaline.croft.click) — Analyse your Teal.fm scrobbles and find your listener archetype.

## Support

This is free and open source, built and maintained in my spare time. If it's useful to you, a [one-off tip on Ko-fi](https://ko-fi.com/ewancroft) or a [monthly sponsorship](https://github.com/sponsors/ewanc26) helps keep it maintained. A star on the repo or a mention to someone who'd use it helps just as much.

## Trademark

“AT Protocol”, “atproto”, and “atprotocol” are trademarks of Bluesky Social PBC.
This project is independent and is not affiliated with or endorsed by Bluesky
Social PBC; the terms are used only to describe compatibility. See the
[AT Protocol trademark policy](https://atproto.com/about/trademarks/atproto-trademark-policy)
and this repository's [TRADEMARKS.md](../../TRADEMARKS.md).

## Licence

AGPL-3.0-only.
