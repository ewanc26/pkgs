import { a2 as spread_props, h as head } from "../../../chunks/renderer.js";
import { I as Icon } from "../../../chunks/Icon.js";
function Check($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [["path", { "d": "M20 6 9 17l-5-5" }]];
    Icon($$renderer2, spread_props([
      { name: "check" },
      /**
       * @component @name Check
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/check
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function X($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M18 6 6 18" }],
      ["path", { "d": "m6 6 12 12" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "x" },
      /**
       * @component @name X
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTggNiA2IDE4IiAvPgogIDxwYXRoIGQ9Im02IDYgMTIgMTIiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/x
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function _page($$renderer) {
  head("cwls5q", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>About — Opal</title>`);
    });
    $$renderer2.push(`<meta name="description" content="How Opal works, supported platforms, privacy details, OAuth scope, and licence information."/> <link rel="canonical" href="https://opal.croft.click/about"/> <meta property="og:type" content="website"/> <meta property="og:url" content="https://opal.croft.click/about"/> <meta property="og:title" content="About — Opal"/> <meta property="og:description" content="How Opal works, supported platforms, privacy details, OAuth scope, and licence information."/> <meta name="twitter:card" content="summary"/> <meta name="twitter:title" content="About — Opal"/> <meta name="twitter:description" content="How Opal works, supported platforms, privacy details, OAuth scope, and licence information."/>`);
  });
  $$renderer.push(`<main class="svelte-cwls5q"><h1 class="svelte-cwls5q">About Opal</h1> <p class="svelte-cwls5q">Opal converts your microblog posts from Twitter, Mastodon, Threads, and Nostr to <a href="https://bsky.social" target="_blank" rel="noopener" class="svelte-cwls5q">Bluesky</a> while preserving original timestamps.</p> <h2 class="svelte-cwls5q">How it works</h2> <ol class="steps-list svelte-cwls5q"><li class="svelte-cwls5q"><span class="step-num svelte-cwls5q">1</span> <div><strong class="svelte-cwls5q">Choose a platform</strong> <p class="svelte-cwls5q">Pick Twitter, Mastodon, Threads, or Nostr.</p></div></li> <li class="svelte-cwls5q"><span class="step-num svelte-cwls5q">2</span> <div><strong class="svelte-cwls5q">Authenticate</strong> <p class="svelte-cwls5q">Sign in with your AT Protocol identity via OAuth. Nothing is stored.</p></div></li> <li class="svelte-cwls5q"><span class="step-num svelte-cwls5q">3</span> <div><strong class="svelte-cwls5q">Upload your export</strong> <p class="svelte-cwls5q">Drop in your archive file — everything is processed locally in your browser.</p></div></li> <li class="svelte-cwls5q"><span class="step-num svelte-cwls5q">4</span> <div><strong class="svelte-cwls5q">Import</strong> <p class="svelte-cwls5q">Opal publishes your posts to your PDS with automatic rate-limit handling.</p></div></li></ol> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">Privacy &amp; data</h2> <div class="card svelte-cwls5q"><div class="pill pill-good svelte-cwls5q">No tracking</div> <div class="pill pill-good svelte-cwls5q">No accounts</div> <div class="pill pill-good svelte-cwls5q">No server storage</div></div> <p class="svelte-cwls5q">Opal runs entirely in your browser. Your export files are parsed locally — they are
			never uploaded to any server run by this project.</p> <p class="svelte-cwls5q">The only network requests made are:</p> <ul class="svelte-cwls5q"><li class="svelte-cwls5q"><strong class="svelte-cwls5q">Your PDS</strong> — Opal authenticates directly with your Personal Data
				Server and publishes records there on your behalf, exactly as any other ATProto client
				would. Your app password is used only for this request and is never stored or logged.</li> <li class="svelte-cwls5q"><strong class="svelte-cwls5q">Google Fonts</strong> — the layout loads Inter and JetBrains Mono via Google
				Fonts. If you prefer not to make this request, you can self-host the fonts or use a
				content-blocking extension.</li></ul> <p class="svelte-cwls5q">No cookies, no local storage, no fingerprinting.</p></section> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">Supported platforms</h2> <h3>Twitter / X</h3> <p class="svelte-cwls5q">Import your tweet archive from Twitter's data export file. Supports tweets, retweets,
			and quote tweets with facets.</p> <h3>Mastodon</h3> <p class="svelte-cwls5q">Convert your ActivityPub outbox or CSV export from any Mastodon instance. Handles
			content warnings, media attachments, and poll metadata.</p> <h3>Threads</h3> <p class="svelte-cwls5q">Bring over your Threads posts from Meta's data export. Supports text posts and
			media attachments.</p> <h3>Nostr</h3> <p class="svelte-cwls5q">Convert your Nostr text notes (kind 1 events) to Bluesky posts.</p> <h3>What's converted</h3> <ul class="check-list svelte-cwls5q"><li class="svelte-cwls5q">`);
  Check($$renderer, { size: 16 });
  $$renderer.push(`<!----> Posts with original timestamps</li> <li class="svelte-cwls5q">`);
  Check($$renderer, { size: 16 });
  $$renderer.push(`<!----> Links, mentions, and hashtags as facets</li> <li class="svelte-cwls5q">`);
  Check($$renderer, { size: 16 });
  $$renderer.push(`<!----> Media attachments (images)</li> <li class="svelte-cwls5q">`);
  Check($$renderer, { size: 16 });
  $$renderer.push(`<!----> Reply threads (where resolvable)</li> <li class="svelte-cwls5q">`);
  Check($$renderer, { size: 16 });
  $$renderer.push(`<!----> Content warnings (Mastodon)</li></ul> <p class="not-imported svelte-cwls5q">`);
  X($$renderer, { size: 16 });
  $$renderer.push(`<!----> <strong class="svelte-cwls5q">Not converted:</strong> Videos, polls, DMs, bookmarks, and
			circle-only posts.</p></section> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">OAuth scope</h2> <p class="svelte-cwls5q">Opal requests minimal permissions to publish posts:</p> <code class="svelte-cwls5q">atproto transition:generic</code> <p class="svelte-cwls5q">This allows reading your profile and writing records to your repository. Your Bluesky
			profile is read directly from your PDS.</p></section> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">CLI / Local usage</h2> <p class="svelte-cwls5q">Opal also ships as a Node.js command-line tool. This is useful if you prefer to
			run imports locally, need full control over batch settings, or want to automate things
			with scripts.</p> <h3>Prerequisites</h3> <ul class="svelte-cwls5q"><li class="svelte-cwls5q"><a href="https://nodejs.org" target="_blank" rel="noopener" class="svelte-cwls5q">Node.js</a> v18 or later</li> <li class="svelte-cwls5q"><a href="https://pnpm.io" target="_blank" rel="noopener" class="svelte-cwls5q">pnpm</a> (recommended) — or npm / yarn</li></ul> <h3>Install &amp; build</h3> <div class="code-block svelte-cwls5q"><pre class="svelte-cwls5q"><code class="svelte-cwls5q"># Clone the repository
git clone https://github.com/ewanc26/pkgs.git
cd pkgs/packages/opal

# Install dependencies
pnpm install

# Build
pnpm build</code></pre></div> <h3>Usage</h3> <div class="code-block svelte-cwls5q"><pre class="svelte-cwls5q"><code class="svelte-cwls5q"># Interactive mode
pnpm start

# Import from Twitter archive
pnpm start -i tweets.js -h alice.bsky.social -p xxxx-xxxx-xxxx-xxxx -y

# Import from Mastodon outbox
pnpm start -i outbox.json -m mastodon -h alice.bsky.social -p xxxx-xxxx-xxxx-xxxx -y

# Sync (skip already-imported records)
pnpm start -i tweets.js -m sync -h alice.bsky.social -p xxxx-xxxx-xxxx-xxxx -y

# Preview without publishing
pnpm start -i tweets.js --dry-run</code></pre></div> <h3>Key flags</h3> <div class="flag-table svelte-cwls5q"><div class="flag-row flag-row--header svelte-cwls5q"><span class="svelte-cwls5q">Flag</span><span class="svelte-cwls5q">Description</span></div> <div class="flag-row svelte-cwls5q"><code class="svelte-cwls5q">-i &lt;path></code><span class="svelte-cwls5q">Input file or directory</span></div> <div class="flag-row svelte-cwls5q"><code class="svelte-cwls5q">-h &lt;handle></code><span class="svelte-cwls5q">ATProto handle or DID</span></div> <div class="flag-row svelte-cwls5q"><code class="svelte-cwls5q">-p &lt;password></code><span class="svelte-cwls5q">App password (not your main password)</span></div> <div class="flag-row svelte-cwls5q"><code class="svelte-cwls5q">-m &lt;mode></code><span class="svelte-cwls5q"><code class="svelte-cwls5q">twitter</code> · <code class="svelte-cwls5q">mastodon</code> · <code class="svelte-cwls5q">threads</code> · <code class="svelte-cwls5q">nostr</code> · <code class="svelte-cwls5q">sync</code></span></div> <div class="flag-row svelte-cwls5q"><code class="svelte-cwls5q">-y</code><span class="svelte-cwls5q">Skip confirmation prompts</span></div> <div class="flag-row svelte-cwls5q"><code class="svelte-cwls5q">--dry-run</code><span class="svelte-cwls5q">Preview without writing records</span></div> <div class="flag-row svelte-cwls5q"><code class="svelte-cwls5q">-v</code><span class="svelte-cwls5q">Verbose / debug output</span></div> <div class="flag-row svelte-cwls5q"><code class="svelte-cwls5q">-q</code><span class="svelte-cwls5q">Quiet mode (warnings &amp; errors only)</span></div></div> <p class="svelte-cwls5q">Full documentation is available at <a href="https://docs.ewancroft.uk/projects/opal" target="_blank" rel="noopener" class="svelte-cwls5q">docs.ewancroft.uk/projects/opal</a>.</p></section> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">Rate limits &amp; PDS safety</h2> <p class="svelte-cwls5q">ATProto PDS instances enforce rate limits on write operations. Exceeding them can
			temporarily affect all users on a shared PDS. Opal protects against this by:</p> <ul class="svelte-cwls5q"><li class="svelte-cwls5q">Reading the <code class="svelte-cwls5q">ratelimit-*</code> headers from each response</li> <li class="svelte-cwls5q">Maintaining a 15% headroom buffer before the quota ceiling</li> <li class="svelte-cwls5q">Automatically adjusting batch size (up to 200 records) in real time</li> <li class="svelte-cwls5q">Pausing immediately when the abort signal fires if you press Cancel</li></ul></section> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">Licence</h2> <p class="svelte-cwls5q">Opal is free software released under the <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener" class="svelte-cwls5q">GNU Affero General Public License v3.0</a> (AGPL-3.0-only).</p> <p class="svelte-cwls5q">In short: you are free to use, modify, and redistribute this software, but any modified
			version you run as a network service must also be released under the same licence with
			its source code made available.</p> <p class="svelte-cwls5q">The full licence text is included in the <a href="https://github.com/ewanc26/pkgs/tree/main/packages/opal/LICENCE" target="_blank" rel="noopener" class="svelte-cwls5q">repository</a>.</p></section> <section class="svelte-cwls5q"><h2 class="svelte-cwls5q">Credits</h2> <h3>Created by</h3> <div class="person-card svelte-cwls5q"><div class="person-info svelte-cwls5q"><span class="person-name svelte-cwls5q">Ewan Croft</span> <span class="person-role svelte-cwls5q">Author &amp; maintainer</span></div> <div class="person-links svelte-cwls5q"><a href="https://github.com/ewanc26" target="_blank" rel="noopener" class="svelte-cwls5q">GitHub</a> <a href="https://ko-fi.com/ewancroft" target="_blank" rel="noopener" class="svelte-cwls5q">Ko-fi</a> <a href="https://ewancroft.uk" target="_blank" rel="noopener" class="svelte-cwls5q">Website</a></div></div> <h3>Contributors</h3> <p class="contrib-note svelte-cwls5q">Contributions via <a href="https://github.com/ewanc26/pkgs/tree/main/packages/opal" target="_blank" rel="noopener" class="svelte-cwls5q">GitHub</a> are always welcome. The full contributor list is maintained there.</p> <h3>Dependencies</h3> <ul class="deps svelte-cwls5q"><li class="svelte-cwls5q"><a href="https://github.com/bluesky-social/atproto" target="_blank" rel="noopener" class="svelte-cwls5q">@atproto/api</a> — ATProto client</li> <li class="svelte-cwls5q"><a href="https://svelte.dev" target="_blank" rel="noopener" class="svelte-cwls5q">Svelte / SvelteKit</a> — UI framework</li> <li class="svelte-cwls5q"><a href="https://lucide.dev" target="_blank" rel="noopener" class="svelte-cwls5q">Lucide</a> — icons</li> <li class="svelte-cwls5q"><a href="https://tailwindcss.com" target="_blank" rel="noopener" class="svelte-cwls5q">Tailwind CSS</a> — utility styles</li> <li class="svelte-cwls5q"><a href="https://bsky.social" target="_blank" rel="noopener" class="svelte-cwls5q">Bluesky</a> — the <code class="svelte-cwls5q">app.bsky.*</code> lexicon this tool publishes to</li></ul></section> <footer class="svelte-cwls5q"><a href="https://github.com/ewanc26/pkgs/tree/main/packages/opal" target="_blank" rel="noopener" class="svelte-cwls5q">↗ View on GitHub</a> <span class="sep svelte-cwls5q">·</span> <a href="https://ko-fi.com/ewancroft" target="_blank" rel="noopener" class="svelte-cwls5q">♥ Support Opal</a></footer></main>`);
}
export {
  _page as default
};
