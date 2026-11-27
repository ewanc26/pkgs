<p align="center">
  <img src="assets/logo/Jasper.svg" alt="Jasper" width="120" />
</p>

# Jasper

Import Instagram photos to AT Protocol platforms — [Grain.social](https://grain.social) or [Spark](https://sprk.so) — while preserving original timestamps. Web interface at [jasper.croft.click](https://jasper.croft.click).

Full documentation at **[docs.ewancroft.uk](https://docs.ewancroft.uk/projects/jasper)**.

## Related projects

Part of the [croft.click](https://croft.click) toolkit — free, browser-based tools for moving your data onto the AT Protocol:

- [Malachite](https://malachite.croft.click) — Import Last.fm and Spotify listening history into Teal.
- [Opal](https://opal.croft.click) — Convert Twitter, Mastodon, Threads, and Nostr posts to Bluesky.
- [Bismuth](https://bismuth.croft.click) — Convert ATProto richtext-block documents to Markdown.
- [Tourmaline](https://tourmaline.croft.click) — Analyse your Teal.fm scrobbles and find your listener archetype.

## Support

This is free and open source, built and maintained in my spare time. If it's useful to you, a [one-off tip on Ko-fi](https://ko-fi.com/ewancroft), a [recurring donation on Liberapay](https://liberapay.com/ewanc26/) or a [monthly sponsorship](https://github.com/sponsors/ewanc26) helps keep it maintained. A star on the repo or a mention to someone who'd use it helps just as much.

## Trademark

“AT Protocol”, “atproto”, and “atprotocol” are trademarks of Bluesky Social PBC.
This project is independent and is not affiliated with or endorsed by Bluesky
Social PBC; the terms are used only to describe compatibility. See the
[AT Protocol trademark policy](https://atproto.com/about/trademarks/atproto-trademark-policy)
and this repository's [TRADEMARKS.md](../../TRADEMARKS.md).

## Licence

AGPL-3.0-only.

## Updating

`jasper self-update` installs the newest version from npm or GitHub, whichever is
higher; add `--check` to only look. `jasper` also prints a notice when an update is
available; set `EWANC26_NO_UPDATE_CHECK` to turn that off. See
[`@ewanc26/self-update`](../self-update/README.md).

## Terminal interface

Run `jasper` in a terminal for menus, prompts, per-post progress and a countdown
during rate-limit waits. Ctrl+C finishes the current post, saves, and tells you how
to resume.

Pipes, CI, `--non-interactive` and `--no-tui` keep the plain output. The interface
needs Node 22 or later.
