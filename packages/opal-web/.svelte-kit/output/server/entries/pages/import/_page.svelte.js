import { a2 as spread_props, h as head, a as attr, e as escape_html, a3 as ensure_array_like, a4 as attr_class, a5 as stringify } from "../../../chunks/renderer.js";
import "@atproto/oauth-client-browser";
import "@atproto/api";
import { I as Icon, E as External_link } from "../../../chunks/external-link.js";
function Arrow_left($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "m12 19-7-7 7-7" }],
      ["path", { "d": "M19 12H5" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "arrow-left" },
      /**
       * @component @name ArrowLeft
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTIgMTktNy03IDctNyIgLz4KICA8cGF0aCBkPSJNMTkgMTJINSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/arrow-left
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
(() => {
  const buf = new Uint8Array(1);
  (globalThis.crypto ?? globalThis.webcrypto).getRandomValues(buf);
  return buf[0] % 32;
})();
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const KEY_STEP = "opal:step";
    const KEY_PLATFORM = "opal:platform";
    const _initStep = Number(sessionStorage.getItem(KEY_STEP)) || 0;
    const _initPlatform = sessionStorage.getItem(KEY_PLATFORM);
    let step = _initStep;
    let platform = _initPlatform;
    let handle = "";
    let selectedPosts = /* @__PURE__ */ new Set();
    let logs = [];
    head("1kumcmu", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Opal — Convert to Bluesky</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Convert your microblog posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts."/> <link rel="canonical" href="https://opal.croft.click/import"/> <meta name="robots" content="noindex"/>`);
    });
    $$renderer2.push(`<main class="svelte-1kumcmu"><header class="svelte-1kumcmu"><img src="/logo/Opal.svg" alt="Opal"${attr("width", 48)}${attr("height", 48)} class="logo-img svelte-1kumcmu"/> <p class="tagline svelte-1kumcmu">Convert microblog posts to Bluesky — own your words, not the platforms'</p></header> <div class="step-viewport svelte-1kumcmu"><!---->`);
    {
      $$renderer2.push(`<div class="step-slide svelte-1kumcmu">`);
      if (step === 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<section class="step svelte-1kumcmu"><h2 class="svelte-1kumcmu">Choose a platform</h2> <p class="step-desc svelte-1kumcmu">Where are your posts coming from?</p> <div class="platform-grid svelte-1kumcmu"><button class="platform-btn svelte-1kumcmu"><span class="platform-name svelte-1kumcmu">Twitter / X</span> <span class="platform-desc svelte-1kumcmu">tweets.js archive</span></button> <button class="platform-btn svelte-1kumcmu"><span class="platform-name svelte-1kumcmu">Mastodon</span> <span class="platform-desc svelte-1kumcmu">outbox.json export</span></button> <button class="platform-btn svelte-1kumcmu"><span class="platform-name svelte-1kumcmu">Threads</span> <span class="platform-desc svelte-1kumcmu">JSON export</span></button> <button class="platform-btn svelte-1kumcmu"><span class="platform-name svelte-1kumcmu">Nostr</span> <span class="platform-desc svelte-1kumcmu">event JSON array</span></button></div></section>`);
      } else if (step === 1) {
        $$renderer2.push("<!--[1-->");
        $$renderer2.push(`<section class="step svelte-1kumcmu"><h2 class="svelte-1kumcmu">Sign in with ATProto</h2> <p class="step-desc svelte-1kumcmu">Enter your Bluesky handle to authenticate. Nothing is stored.</p> <div class="auth-form svelte-1kumcmu"><input type="text"${attr("value", handle)} placeholder="you.bsky.social" class="handle-input svelte-1kumcmu"/> <button class="btn-primary svelte-1kumcmu"${attr("disabled", !handle.trim(), true)}>Sign in</button></div> `);
        {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <div class="step-actions svelte-1kumcmu"><button class="btn-secondary inline-flex items-center gap-1 svelte-1kumcmu">`);
        Arrow_left($$renderer2, { size: 13 });
        $$renderer2.push(`<!----> Back</button></div></section>`);
      } else if (step === 2) {
        $$renderer2.push("<!--[2-->");
        $$renderer2.push(`<section class="step svelte-1kumcmu"><h2 class="svelte-1kumcmu">Upload your export</h2> <p class="step-desc svelte-1kumcmu">`);
        if (platform === "twitter") {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`Upload your <code>tweets.js</code> file from the Twitter data export.`);
        } else if (platform === "mastodon") {
          $$renderer2.push("<!--[1-->");
          $$renderer2.push(`Upload your <code>outbox.json</code> from the Mastodon export.`);
        } else if (platform === "threads") {
          $$renderer2.push("<!--[2-->");
          $$renderer2.push(`Upload your Threads JSON export file.`);
        } else if (platform === "nostr") {
          $$renderer2.push("<!--[3-->");
          $$renderer2.push(`Upload your Nostr events JSON file.`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></p> <div class="file-drop svelte-1kumcmu"><input type="file" accept=".json,.js,.csv"/></div> `);
        {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <div class="step-actions svelte-1kumcmu"><button class="btn-secondary inline-flex items-center gap-1 svelte-1kumcmu">`);
        Arrow_left($$renderer2, { size: 13 });
        $$renderer2.push(`<!----> Back</button></div></section>`);
      } else if (step === 3) {
        $$renderer2.push("<!--[3-->");
        $$renderer2.push(`<section class="step svelte-1kumcmu"><h2 class="svelte-1kumcmu">Review posts</h2> `);
        {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <div class="step-actions svelte-1kumcmu"><button class="btn-secondary inline-flex items-center gap-1 svelte-1kumcmu">`);
        Arrow_left($$renderer2, { size: 13 });
        $$renderer2.push(`<!----> Back</button> <button class="btn-primary svelte-1kumcmu">Import ${escape_html(selectedPosts.size)} posts</button></div></section>`);
      } else if (step === 4) {
        $$renderer2.push("<!--[4-->");
        $$renderer2.push(`<section class="step svelte-1kumcmu"><h2 class="svelte-1kumcmu">${escape_html("Done")}</h2> `);
        {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <div class="log-list svelte-1kumcmu"><!--[-->`);
        const each_array_1 = ensure_array_like(logs);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let log = each_array_1[$$index_1];
          $$renderer2.push(`<p${attr_class(`log-${stringify(log.level)}`, "svelte-1kumcmu")}>${escape_html(log.message)}</p>`);
        }
        $$renderer2.push(`<!--]--></div> `);
        {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <div class="step-actions svelte-1kumcmu">`);
        {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<button class="btn-primary svelte-1kumcmu">Start over</button>`);
        }
        $$renderer2.push(`<!--]--></div></section>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!----></div> <footer class="svelte-1kumcmu"><a href="/" class="inline-flex items-center gap-1 svelte-1kumcmu">`);
    Arrow_left($$renderer2, { size: 13 });
    $$renderer2.push(`<!----> Home</a> <span class="sep svelte-1kumcmu">·</span> <a href="/about" class="svelte-1kumcmu">About &amp; privacy</a> <span class="sep svelte-1kumcmu">·</span> <a href="https://github.com/ewanc26/pkgs/tree/main/packages/opal" target="_blank" rel="noopener" class="inline-flex items-center gap-1 svelte-1kumcmu">`);
    External_link($$renderer2, { size: 13 });
    $$renderer2.push(`<!----> GitHub</a></footer></main>`);
  });
}
export {
  _page as default
};
