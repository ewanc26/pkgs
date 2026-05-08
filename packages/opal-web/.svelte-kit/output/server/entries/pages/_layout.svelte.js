import { h as head, a as attr, e as escape_html } from "../../chunks/renderer.js";
/* empty css                                                     */
function LandingLayout($$renderer, $$props) {
  let {
    name,
    logo,
    logoAlt = name,
    footerTagline,
    footerSourceUrl,
    webVersion,
    cliVersion,
    children
  } = $$props;
  head("1335r9s", $$renderer, ($$renderer2) => {
    $$renderer2.push(`<link rel="preconnect" href="https://fonts.googleapis.com"/> <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/> <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet"/>`);
  });
  $$renderer.push(`<header class="svelte-1335r9s"><a href="/" class="brand svelte-1335r9s"><span class="logo-mark svelte-1335r9s"><img${attr("src", logo)}${attr("alt", logoAlt)}${attr("width", 22)}${attr("height", 22)}/></span> <span class="wordmark svelte-1335r9s">${escape_html(name)}</span></a> <div class="version-strip svelte-1335r9s"><span>web v${escape_html(webVersion)}</span> <span class="sep svelte-1335r9s">–</span> <span>cli v${escape_html(cliVersion)}</span></div></header> `);
  children($$renderer);
  $$renderer.push(`<!----> <footer class="svelte-1335r9s"><span>${escape_html(footerTagline)}</span> <span class="sep svelte-1335r9s">·</span> <a${attr("href", footerSourceUrl)} target="_blank" rel="noopener" class="svelte-1335r9s">source</a></footer>`);
}
function _layout($$renderer, $$props) {
  let { children } = $$props;
  const webVersion = "0.1.0";
  const cliVersion = "0.1.0";
  LandingLayout($$renderer, {
    name: "opal",
    logo: "/logo/Opal.svg",
    logoAlt: "Opal",
    footerTagline: "privacy-first analytics",
    footerSourceUrl: "https://github.com/ewanc26/pkgs/tree/main/packages/opal",
    webVersion,
    cliVersion,
    children: ($$renderer2) => {
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    }
  });
}
export {
  _layout as default
};
