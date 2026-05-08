import { h as head, a as attr, e as escape_html, a4 as ensure_array_like, a7 as attr_class, a8 as stringify } from "../../../chunks/renderer.js";
import "@atproto/oauth-client-browser";
import "@atproto/api";
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
        $$renderer2.push(`<!--]--> <div class="step-actions svelte-1kumcmu"><button class="btn-secondary svelte-1kumcmu">← Back</button></div></section>`);
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
        $$renderer2.push(`<!--]--> <div class="step-actions svelte-1kumcmu"><button class="btn-secondary svelte-1kumcmu">← Back</button></div></section>`);
      } else if (step === 3) {
        $$renderer2.push("<!--[3-->");
        $$renderer2.push(`<section class="step svelte-1kumcmu"><h2 class="svelte-1kumcmu">Review posts</h2> `);
        {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <div class="step-actions svelte-1kumcmu"><button class="btn-secondary svelte-1kumcmu">← Back</button> <button class="btn-primary svelte-1kumcmu">Import ${escape_html(selectedPosts.size)} posts</button></div></section>`);
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
    $$renderer2.push(`<!----></div> <footer class="svelte-1kumcmu"><a href="/" class="svelte-1kumcmu">← Home</a> <span class="sep svelte-1kumcmu">·</span> <a href="https://github.com/ewanc26/pkgs/tree/main/packages/opal" target="_blank" rel="noopener" class="svelte-1kumcmu">↗ GitHub</a></footer></main>`);
  });
}
export {
  _page as default
};
