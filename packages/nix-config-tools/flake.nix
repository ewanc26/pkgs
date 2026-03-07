{
  description = "Nix config management tools";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in {
      packages = forAllSystems (system:
        let pkgs = nixpkgs.legacyPackages.${system}; in
        {
          default = pkgs.rustPlatform.buildRustPackage {
            pname = "nix-config-tools";
            version = "0.1.0";
            src = ./.;
            cargoLock.lockFile = ./Cargo.lock;
          };
        }
      );
      apps = forAllSystems (system:
        let pkg = self.packages.${system}.default; in
        {
          # Show staleness of each flake input and bump selectively.
          # Usage: nix run .#flake-bump [-- --update <input> | --update-all]
          flake-bump  = { type = "app"; program = "${pkg}/bin/flake-bump"; };

          # Diff packages between nix generations.
          # Usage: nix run .#gen-diff [-- --list | --from N --to M]
          gen-diff    = { type = "app"; program = "${pkg}/bin/gen-diff"; };

          # Pre-rebuild preflight: daemon, lock, eval, git, age key, disk space.
          # Usage: nix run .#health-check
          health-check = { type = "app"; program = "${pkg}/bin/health-check"; };

          # Interactive server configurator: service toggles, storage device,
          # Cockpit, Forgejo, Matrix, PDS, Cloudflare settings.
          # Usage: nix run .#server-config
          #        nix run .#server-config -- --show  (read-only summary)
          server-config = { type = "app"; program = "${pkg}/bin/server-config"; };
        }
      );
    };
}
