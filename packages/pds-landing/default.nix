{
  lib,
  stdenv,
  nodejs_22,
  pnpm_10,
  fetchPnpmDeps,
}:

stdenv.mkDerivation (finalAttrs: {
  pname = "pds-landing";
  version = (builtins.fromJSON (builtins.readFile ./package.json)).version;

  # Build from the monorepo root so pnpm workspace deps (@ewanc26/ui) resolve.
  src = lib.cleanSource ../..;

  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs) pname version src;
    fetcherVersion = 2;
    # Run `nix build` and replace with the hash from the error output.
    hash = "sha256-V4gAO78dCsBE829NM3WfFKOYYSrs4IvbuqpHiL7b8+0=";
  };

  nativeBuildInputs = [
    nodejs_22
    pnpm_10.configHook
  ];

  buildPhase = ''
    runHook preBuild

    # Build the UI library first (workspace dep of pds-landing).
    pnpm --filter @ewanc26/ui build

    # Build the SvelteKit static site.  Only run vite build — the prepack
    # step (svelte-package / publint) is for npm publishing, not needed here.
    pnpm --filter @ewanc26/pds-landing exec vite build

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    cp -r packages/pds-landing/build $out
    runHook postInstall
  '';

  meta = {
    description = "ATProto PDS landing page — SvelteKit static build";
    license = lib.licenses.agpl3Only;
  };
})
