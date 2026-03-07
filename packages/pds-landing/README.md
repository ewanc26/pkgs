# pds-landing

Static landing page for [pds.ewancroft.uk](https://pds.ewancroft.uk) — a personal ATProto PDS.

Displays live PDS status by querying `/xrpc/_health` and
`/xrpc/com.atproto.server.describeServer` on load.

## Build

```sh
nix build
```

Output is a directory of static files suitable for serving directly with Caddy
or any other file server.

## Usage in nix-config

Referenced via git subtree at `modules/server/pds-landing`. To pull upstream
changes into nix-config:

```sh
git subtree pull --prefix modules/server/pds-landing pkgs pds-landing-split --squash
```
