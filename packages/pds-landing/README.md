# pds-landing

Static landing page for [pds.ewancroft.uk](https://pds.ewancroft.uk) — a personal ATProto PDS.

Built with SvelteKit, Svelte 5, TypeScript, and Tailwind CSS v4.

Displays live PDS status by querying `/xrpc/_health` and
`/xrpc/com.atproto.server.describeServer` on load.

## Build

```sh
pnpm build
```

Output is in `build/` — a directory of static files suitable for serving with Caddy or any file server.

## Dev

```sh
pnpm dev
```
