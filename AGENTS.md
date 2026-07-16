# AGENTS.md

Guidance for `pkgs`, the canonical monorepo for Ewan's TypeScript/Svelte libraries and apps, AT Protocol importers, Rust/Nix utilities, and one Python/Ollama tool. Several former standalone repositories point here; make maintained fixes here rather than reviving archived copies.

## Workspace map

- pnpm owns every `packages/*/package.json` from the root workspace and lockfile. Node 24 is the declared root runtime. `workspace:*` dependencies define the internal build graph; import packages through their declared exports, not another package's source path.
- Core libraries: `atproto` (public identity/record fetching), `croft-click-core` (shared importer/auth/CAR/rate-limit logic), `tid`, `utils`, `noise`/`noise-avatar`, `og`, and `bismuth`/`opal` converters. Their `exports`, CJS/ESM balance, browser safety, and serialized outputs are public API.
- Svelte libraries: `ui`, `landing-ui`, `pds-landing`, `supporters`, and `svelte-standard-site`. Preserve Svelte 5/Kit and Tailwind peer boundaries, package CSS exports, SSR safety, component props/events, and `publint`-verified packaging.
- Browser/static apps: `croft-click`, `bismuth-web`, `jasper-web`, `malachite-web`, `opal-web`, and `tourmaline`. OAuth metadata/redirects, client storage, server-only environment values, prerender/SSR choices, and Vercel configuration are part of each app's runtime contract.
- Write-capable tools: `jasper` imports Instagram media to Grain/Spark, `malachite` imports listening histories and removes duplicates, `opal` imports microblogs, and `tangled-sync` clones/pushes Git repositories, edits READMEs, and writes `sh.tangled.repo` records. Dry-run and read-only checks must cover all side effects.
- `nix-config-tools` is the sole Cargo workspace member and is exposed by the root flake. Its update/config commands can rewrite and commit another repository. `llm-analyser` is standalone Python; its own `AGENTS.md` applies. `wafrn-theme` is a directly exported CSS file.
- Some package READMEs intentionally defer to `docs.ewancroft.uk`; source, manifest, and exported entrypoints remain authoritative when docs drift. The root README currently omits newer packages such as Jasper, Opal, Croft Click, landing UI, and OG, so it is not a complete workspace inventory.

## Cross-package invariants

- Treat DIDs, handles, DID documents, PDS/AppView endpoints, CAR data, AT URIs, record values, facets, CIDs, blobs, pagination cursors, and third-party archive files as untrusted. DIDs are stable repository identity; handles are mutable presentation/resolution input.
- Preserve AT Protocol collection NSIDs, record shapes, TID ordering, UTF-8 byte facet offsets, strong-ref CIDs, thread/reply topology, original timestamps, pagination, and PDS-specific resolution. A successful request count is not proof that a multi-record import was complete.
- Importers must keep parsing/conversion separate from publication. Dry-run may parse, resolve, and report but must never upload blobs, create/apply/delete records, update caches as success, or mutate input. Cancellation, retry, rate limiting, resume state, and partial-result reporting must remain honest and idempotent.
- OAuth scopes, client IDs, redirect URIs, metadata JSON, and deployment origins must change together. App passwords, OAuth sessions, API keys, Vercel Blob tokens, Git/SSH credentials, uploaded histories, `.docx` contents, and local caches/state must not enter logs, bundles, fixtures, or commits.
- `svelte-standard-site` renders remote rich text, Markdown, embeds, iframes, images, native comments, and themes. Maintain sanitization/URL-scheme boundaries, SSR-safe DOM use, publication verification, and separation between Bluesky reply comments and `site.standard.*` native comments.
- `supporters` processes Ko-fi/GitHub webhook events and stores them in AT Protocol. Verify webhook signatures before writes, make event ingestion replay-safe, avoid exposing donor payloads, and use only synthetic events in scripts/tests.
- `tourmaline` resolves public repositories, paginates Teal scrobbles, calls rate-limited MusicBrainz/Last.fm/Deezer APIs, caches enrichment in warm-process memory, and can publish share posts. Bound user-selected ranges/pages and upstream responses; never expose the Last.fm key client-side.
- `og` is not actually zero-native-dependency at runtime: it uses `@resvg/resvg-js`, Node crypto/Buffer, optional Vercel Blob reads/writes, and generated bundled fonts. Test the actual target runtime and keep cache keys sensitive to every rendering input.

## Working conventions

- Read the target package README, manifest, exported entrypoint, configuration, and affected implementation/tests before editing. Update dependents when changing a workspace API. Do not assume the root aggregate scripts exercise packages that lack the corresponding script.
- Use pnpm only and preserve `pnpm-lock.yaml`; do not add npm/Yarn locks. Dependency updates must be intentional, especially the root `allowBuilds`/`onlyBuiltDependencies` and minimum-release-age exceptions.
- Use filtered commands while iterating, for example `pnpm --filter @ewanc26/bismuth test` and `pnpm --filter @ewanc26/svelte-standard-site check`. Then run the affected dependency closure and relevant root `pnpm check`, `pnpm typecheck`, `pnpm test`, and `pnpm build` commands.
- Test exported packages with `pnpm pack --dry-run`/`publint` where applicable and inspect `dist` declarations, ESM/CJS imports, subpath exports, CSS/assets, and browser bundling. Formatting is package-specific; `format` mutates files while `lint` checks them.
- For Rust run `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, and relevant `nix build`/`nix flake check`. Do not exercise `flake-bump --update*` or interactive `server-config` against a real config as validation.
- The root `py:check` masks failures with `|| echo`; run `python3 -m py_compile packages/llm-analyser/main.py` directly and use disposable documents/model state for behavioural checks.
- Never run `publish:all`, package publication, forced Tangled sync, Git pushes, record writes/deletes, webhook imports, destructive cleanups, or live OAuth/import flows without explicit authorization. Never commit `.env`, tokens, histories/uploads, Ollama outputs, caches/databases, `dist/`, `.svelte-kit/`, Vercel/Nix results, or the untracked `scripts/cleanup-macos.sh` unless it is explicitly in scope.
