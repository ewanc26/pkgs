{
  description = "Ewan's personal PDS landing page";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-25.11";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in {
      packages = forAllSystems (system:
        let pkgs = nixpkgs.legacyPackages.${system}; in
        {
          default = pkgs.callPackage ./default.nix { };
        }
      );
    };
}
