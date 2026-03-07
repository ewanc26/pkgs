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
          nix-config-tools = pkgs.rustPlatform.buildRustPackage {
            pname = "nix-config-tools";
            version = "0.1.0";
            src = ./packages/nix-config-tools;
            cargoLock.lockFile = ./packages/nix-config-tools/Cargo.lock;
          };

          default = self.packages.${system}.nix-config-tools;
        }
      );

      apps = forAllSystems (system:
        let pkg = self.packages.${system}.nix-config-tools; in
        {
          flake-bump    = { type = "app"; program = "${pkg}/bin/flake-bump"; };
          gen-diff      = { type = "app"; program = "${pkg}/bin/gen-diff"; };
          health-check  = { type = "app"; program = "${pkg}/bin/health-check"; };
          server-config = { type = "app"; program = "${pkg}/bin/server-config"; };
          default = self.apps.${system}.flake-bump;
        }
      );
    };
}
