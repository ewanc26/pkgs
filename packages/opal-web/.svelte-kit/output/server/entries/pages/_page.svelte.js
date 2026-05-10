import { a2 as spread_props, a as attr, e as escape_html, a3 as ensure_array_like, h as head } from "../../chunks/renderer.js";
/* empty css                                                     */
import { I as Icon, E as External_link } from "../../chunks/external-link.js";
import { H as Heart } from "../../chunks/heart.js";
function Arrow_right_left($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "m16 3 4 4-4 4" }],
      ["path", { "d": "M20 7H4" }],
      ["path", { "d": "m8 21-4-4 4-4" }],
      ["path", { "d": "M4 17h16" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "arrow-right-left" },
      /**
       * @component @name ArrowRightLeft
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTYgMyA0IDQtNCA0IiAvPgogIDxwYXRoIGQ9Ik0yMCA3SDQiIC8+CiAgPHBhdGggZD0ibTggMjEtNC00IDQtNCIgLz4KICA8cGF0aCBkPSJNNCAxN2gxNiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/arrow-right-left
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
function Arrow_right($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M5 12h14" }],
      ["path", { "d": "m12 5 7 7-7 7" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "arrow-right" },
      /**
       * @component @name ArrowRight
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KICA8cGF0aCBkPSJtMTIgNSA3IDctNyA3IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/arrow-right
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
function At_sign($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["circle", { "cx": "12", "cy": "12", "r": "4" }],
      ["path", { "d": "M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "at-sign" },
      /**
       * @component @name AtSign
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0IiAvPgogIDxwYXRoIGQ9Ik0xNiA4djVhMyAzIDAgMCAwIDYgMHYtMWExMCAxMCAwIDEgMC00IDgiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/at-sign
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
function Coffee($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M10 2v2" }],
      ["path", { "d": "M14 2v2" }],
      [
        "path",
        {
          "d": "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"
        }
      ],
      ["path", { "d": "M6 2v2" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "coffee" },
      /**
       * @component @name Coffee
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTAgMnYyIiAvPgogIDxwYXRoIGQ9Ik0xNCAydjIiIC8+CiAgPHBhdGggZD0iTTE2IDhhMSAxIDAgMCAxIDEgMXY4YTQgNCAwIDAgMS00IDRIN2E0IDQgMCAwIDEtNC00VjlhMSAxIDAgMCAxIDEtMWgxNGE0IDQgMCAxIDEgMCA4aC0xIiAvPgogIDxwYXRoIGQ9Ik02IDJ2MiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/coffee
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
function Github($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
        }
      ],
      ["path", { "d": "M9 18c-4.51 2-5-2-7-2" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "github" },
      /**
       * @component @name Github
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTUgMjJ2LTRhNC44IDQuOCAwIDAgMC0xLTMuNWMzIDAgNi0yIDYtNS41LjA4LTEuMjUtLjI3LTIuNDgtMS0zLjUuMjgtMS4xNS4yOC0yLjM1IDAtMy41IDAgMC0xIDAtMyAxLjUtMi42NC0uNS01LjM2LS41LTggMEM2IDIgNSAyIDUgMmMtLjMgMS4xNS0uMyAyLjM1IDAgMy41QTUuNDAzIDUuNDAzIDAgMCAwIDQgOWMwIDMuNSAzIDUuNSA2IDUuNS0uMzkuNDktLjY4IDEuMDUtLjg1IDEuNjUtLjE3LjYtLjIyIDEuMjMtLjE1IDEuODV2NCIgLz4KICA8cGF0aCBkPSJNOSAxOGMtNC41MSAyLTUtMi03LTIiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/github
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       * @deprecated Brand icons have been deprecated and are due to be removed, please refer to https://github.com/lucide-icons/lucide/issues/670. We recommend using https://simpleicons.org/?q=github instead. This icon will be removed in v1.0
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
function Message_circle($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
        }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "message-circle" },
      /**
       * @component @name MessageCircle
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMi45OTIgMTYuMzQyYTIgMiAwIDAgMSAuMDk0IDEuMTY3bC0xLjA2NSAzLjI5YTEgMSAwIDAgMCAxLjIzNiAxLjE2OGwzLjQxMy0uOTk4YTIgMiAwIDAgMSAxLjA5OS4wOTIgMTAgMTAgMCAxIDAtNC43NzctNC43MTkiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/message-circle
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
function Shield($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
        }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "shield" },
      /**
       * @component @name Shield
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgMTNjMCA1LTMuNSA3LjUtNy42NiA4Ljk1YTEgMSAwIDAgMS0uNjctLjAxQzcuNSAyMC41IDQgMTggNCAxM1Y2YTEgMSAwIDAgMSAxLTFjMiAwIDQuNS0xLjIgNi4yNC0yLjcyYTEuMTcgMS4xNyAwIDAgMSAxLjUyIDBDMTQuNTEgMy44MSAxNyA1IDE5IDVhMSAxIDAgMCAxIDEgMXoiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/shield
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
function Twitter($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"
        }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "twitter" },
      /**
       * @component @name Twitter
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjIgNHMtLjcgMi4xLTIgMy40YzEuNiAxMC05LjQgMTcuMy0xOCAxMS42IDIuMi4xIDQuNC0uNiA2LTJDMyAxNS41LjUgOS42IDMgNWMyLjIgMi42IDUuNiA0LjEgOSA0LS45LTQuMiA0LTYuNiA3LTMuOCAxLjEgMCAzLTEuMiAzLTEuMnoiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/twitter
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       * @deprecated Brand icons have been deprecated and are due to be removed, please refer to https://github.com/lucide-icons/lucide/issues/670. We recommend using https://simpleicons.org/?q=twitter instead. This icon will be removed in v1.0
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
function Zap($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"
        }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "zap" },
      /**
       * @component @name Zap
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNCAxNGExIDEgMCAwIDEtLjc4LTEuNjNsOS45LTEwLjJhLjUuNSAwIDAgMSAuODYuNDZsLTEuOTIgNi4wMkExIDEgMCAwIDAgMTMgMTBoN2ExIDEgMCAwIDEgLjc4IDEuNjNsLTkuOSAxMC4yYS41LjUgMCAwIDEtLjg2LS40NmwxLjkyLTYuMDJBMSAxIDAgMCAwIDExIDE0eiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/zap
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
function LandingPage($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      name,
      logo,
      logoAlt = name,
      eyebrow,
      heading,
      sub,
      ctaHref,
      ctaLabel,
      ctaSub,
      githubUrl,
      features,
      steps,
      aboutHref = "/about",
      children
    } = $$props;
    $$renderer2.push(`<main class="svelte-20nhzf"><section class="hero svelte-20nhzf"><div class="logo-wrap svelte-20nhzf"><img${attr("src", logo)}${attr("alt", logoAlt)}${attr("width", 120)}${attr("height", 120)}/></div> <p class="wordmark svelte-20nhzf">${escape_html(name)}</p> `);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="eyebrow svelte-20nhzf">${escape_html(eyebrow)}</p>`);
    }
    $$renderer2.push(`<!--]--> <h1 class="svelte-20nhzf">`);
    heading($$renderer2);
    $$renderer2.push(`<!----></h1> <p class="sub svelte-20nhzf">`);
    sub($$renderer2);
    $$renderer2.push(`<!----></p> <div class="hero-actions svelte-20nhzf"><a${attr("href", ctaHref)} class="btn-primary svelte-20nhzf">${escape_html(ctaLabel)} `);
    Arrow_right($$renderer2, { size: 16 });
    $$renderer2.push(`<!----></a> <a${attr("href", githubUrl)} target="_blank" rel="noopener" class="btn-ghost">`);
    Github($$renderer2, { size: 15 });
    $$renderer2.push(`<!----> View on GitHub</a> <a href="https://github.com/sponsors/ewanc26" target="_blank" rel="noopener" class="btn-ghost btn-sponsor-inline svelte-20nhzf">`);
    Heart($$renderer2, { size: 14 });
    $$renderer2.push(`<!----> Sponsor</a> <a href="https://ko-fi.com/ewancroft" target="_blank" rel="noopener" class="btn-ghost btn-kofi-inline svelte-20nhzf">`);
    Coffee($$renderer2, { size: 14 });
    $$renderer2.push(`<!----> Ko-fi</a></div></section> `);
    if (features.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<section class="features svelte-20nhzf"><!--[-->`);
      const each_array = ensure_array_like(features);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let feature = each_array[$$index];
        $$renderer2.push(`<div class="feature-card svelte-20nhzf"><span class="feature-icon svelte-20nhzf">`);
        if (typeof feature.icon === "string") {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<img${attr("src", feature.icon)}${attr("alt", feature.title)} width="20" height="20" class="feature-image svelte-20nhzf"/>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          if (feature.icon) {
            $$renderer2.push("<!--[-->");
            feature.icon($$renderer2, { size: 20 });
            $$renderer2.push("<!--]-->");
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push("<!--]-->");
          }
        }
        $$renderer2.push(`<!--]--></span> <h3 class="svelte-20nhzf">${escape_html(feature.title)}</h3> <p class="svelte-20nhzf">${escape_html(feature.description)}</p></div>`);
      }
      $$renderer2.push(`<!--]--></section>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (steps.length) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<section class="how svelte-20nhzf"><h2 class="svelte-20nhzf">How it works</h2> <ol class="steps-list svelte-20nhzf"><!--[-->`);
      const each_array_1 = ensure_array_like(steps);
      for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
        let step = each_array_1[i];
        $$renderer2.push(`<li class="svelte-20nhzf"><span class="step-num svelte-20nhzf">${escape_html(i + 1)}</span> <div><strong class="svelte-20nhzf">${escape_html(step.title)}</strong> <p class="svelte-20nhzf">${escape_html(step.description)}</p></div></li>`);
      }
      $$renderer2.push(`<!--]--></ol></section>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <section class="cta svelte-20nhzf"><h2 class="svelte-20nhzf">Ready?</h2> <p class="svelte-20nhzf">${escape_html(ctaSub)}</p> <a${attr("href", ctaHref)} class="btn-primary svelte-20nhzf">${escape_html(ctaLabel)} `);
    Arrow_right($$renderer2, { size: 16 });
    $$renderer2.push(`<!----></a></section> `);
    if (children) {
      $$renderer2.push("<!--[0-->");
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <footer class="svelte-20nhzf"><a${attr("href", aboutHref)} class="svelte-20nhzf">About &amp; privacy</a> <span class="sep svelte-20nhzf">·</span> <a${attr("href", githubUrl)} target="_blank" rel="noopener" class="inline-flex items-center gap-1 svelte-20nhzf">`);
    External_link($$renderer2, { size: 12 });
    $$renderer2.push(`<!----> GitHub</a> <span class="sep svelte-20nhzf">·</span> <a href="https://ko-fi.com/ewancroft" target="_blank" rel="noopener" class="inline-flex items-center gap-1 svelte-20nhzf">`);
    Heart($$renderer2, { size: 12 });
    $$renderer2.push(`<!----> Support</a></footer></main>`);
  });
}
const bluesky = "data:image/svg+xml,%3csvg%20width='64'%20height='64'%20viewBox='0%200%2064%2064'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M14.6366%207.81116C21.8491%2013.3459%2029.607%2024.5681%2032.4553%2030.5905C35.3038%2024.5685%2043.0612%2013.3458%2050.2739%207.81116C55.4781%203.81752%2063.9102%200.727462%2063.9102%2010.5602C63.9102%2012.5239%2062.8087%2027.0565%2062.1627%2029.4158C59.9171%2037.6184%2051.7344%2039.7106%2044.4557%2038.4443C57.1787%2040.6577%2060.4153%2047.9893%2053.4255%2055.3209C40.1504%2069.2451%2034.3454%2051.8273%2032.8572%2047.3642C32.4543%2046.1554%2032.4558%2046.1554%2032.0529%2047.3642C30.5654%2051.8273%2024.7605%2069.2455%2011.4847%2055.3209C4.49475%2047.9893%207.73124%2040.6573%2020.4544%2038.4443C13.1755%2039.7106%204.99271%2037.6184%202.74748%2029.4158C2.10144%2027.0563%201%2012.5237%201%2010.5602C1%200.727462%209.43267%203.81752%2014.6366%207.81116Z'%20fill='%230A7AFF'/%3e%3c/svg%3e";
function _page($$renderer) {
  head("1uha8ag", $$renderer, ($$renderer2) => {
    $$renderer2.title(($$renderer3) => {
      $$renderer3.push(`<title>Opal — Convert your microblog posts to Bluesky</title>`);
    });
    $$renderer2.push(`<meta name="description" content="Convert your microblog posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts. Free, open-source, runs in your browser."/> <link rel="canonical" href="https://opal.croft.click"/> <meta property="og:type" content="website"/> <meta property="og:url" content="https://opal.croft.click"/> <meta property="og:title" content="Opal — Convert your microblog posts to Bluesky"/> <meta property="og:description" content="Convert your microblog posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts. Free, open-source, runs in your browser."/> <meta name="twitter:card" content="summary"/> <meta name="twitter:title" content="Opal — Convert your microblog posts to Bluesky"/> <meta name="twitter:description" content="Convert your microblog posts from Twitter, Mastodon, Threads, and Nostr to AT Protocol Bluesky posts. Free, open-source, runs in your browser."/>`);
  });
  {
    let heading = function($$renderer2) {
      $$renderer2.push(`<!---->Bring your microblog posts<br/>to the open web.`);
    }, sub = function($$renderer2) {
      $$renderer2.push(`<!---->Opal converts your posts from Twitter, Mastodon, Threads, and Nostr into <a href="https://bsky.social" target="_blank" rel="noopener">Bluesky</a> posts — so your words stay with you, not the platforms.`);
    };
    LandingPage($$renderer, {
      name: "opal",
      logo: "/logo/Opal.svg",
      logoAlt: "The Opal sigil: a pentagram with opalescent play-of-colour fire",
      eyebrow: "Open source · Runs in your browser",
      ctaHref: "/import",
      ctaLabel: "Start converting",
      ctaSub: "No account needed. No data leaves your browser except to your own PDS.",
      githubUrl: "https://github.com/ewanc26/pkgs/tree/main/packages/opal",
      features: [
        {
          icon: Twitter,
          title: "Twitter/X",
          description: "Import your tweet archive from Twitter's data export file."
        },
        {
          icon: Message_circle,
          title: "Mastodon",
          description: "Convert your ActivityPub outbox or CSV export from any Mastodon instance."
        },
        {
          icon: At_sign,
          title: "Threads",
          description: "Bring over your Threads posts from Meta's data export."
        },
        {
          icon: Zap,
          title: "Nostr",
          description: "Convert your Nostr text notes (kind 1 events) to Bluesky posts."
        },
        {
          icon: Arrow_right_left,
          title: "Facets",
          description: "Links, mentions, and hashtags are converted to ATProto facets where possible."
        },
        {
          icon: bluesky,
          title: "Bluesky",
          description: "Publish imported posts to ATProto Bluesky with full facet support."
        },
        {
          icon: Shield,
          title: "Private",
          description: "Everything runs in your browser. No data is sent anywhere except your own PDS."
        }
      ],
      steps: [
        {
          title: "Choose a platform",
          description: "Pick Twitter, Mastodon, Threads, or Nostr."
        },
        {
          title: "Sign in with ATProto",
          description: "Use your Bluesky handle and an app password. Nothing is stored."
        },
        {
          title: "Upload your export",
          description: "Drop in your archive file — everything is processed locally in your browser."
        },
        {
          title: "Import",
          description: "Opal publishes your posts to your PDS with automatic rate-limit handling."
        }
      ],
      heading,
      sub
    });
  }
}
export {
  _page as default
};
