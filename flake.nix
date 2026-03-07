{
  description = "Ewan's personal package monorepo — TypeScript and Rust packages";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in {
      packages = forAllSystems (system:
        let pkgs = nixpkgs.legacyPackages.${system}; in
        {
          # Nix config management tools (flake-bump, health-check, gen-diff, server-config)
          # src points at the repo root so Cargo can find the workspace manifest.
          nix-config-tools = pkgs.rustPlatform.buildRustPackage {
            pname = "nix-config-tools";
            version = "0.1.0";
            src = ./.;
            cargoLock.lockFile = ./Cargo.lock;
            cargoBuildFlags = [ "--package" "nix-config-tools" ];
            cargoTestFlags  = [ "--package" "nix-config-tools" ];
          };

          default = self.packages.${system}.nix-config-tools;
        }
      );

      apps = forAllSystems (system:
        let pkg = self.packages.${system}.nix-config-tools; in
        {
          # Show staleness of each flake input and bump selectively.
          # Usage: nix run .#flake-bump [-- --update <input> | --update-all]
          flake-bump    = { type = "app"; program = "${pkg}/bin/flake-bump"; };

          # Diff packages between nix generations.
          # Usage: nix run .#gen-diff [-- --list | --from N --to M]
          gen-diff      = { type = "app"; program = "${pkg}/bin/gen-diff"; };

          # Pre-rebuild preflight: daemon, lock, eval, git, age key, disk space.
          # Usage: nix run .#health-check
          health-check  = { type = "app"; program = "${pkg}/bin/health-check"; };

          # Interactive server configurator: service toggles, storage device,
          # Cockpit, Forgejo, Matrix, PDS, Cloudflare settings.
          # Usage: nix run .#server-config
          #        nix run .#server-config -- --show  (read-only summary)
          server-config = { type = "app"; program = "${pkg}/bin/server-config"; };

          default = self.apps.${system}.flake-bump;
        }
      );
    };
}
