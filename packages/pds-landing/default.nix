{
  lib,
  stdenv,
  pkgs,
  tailwindcss_3,
}:

stdenv.mkDerivation {
  pname = "pds-landing";
  version = "1.0.0";

  src = lib.sourceByRegex ./. [
    "^(index\.html|script\.js|status\.js|utils\.js)$"
    "^styles(/.*)?$"
    "^assets(/.*)?$"
  ];

  nativeBuildInputs = [ tailwindcss_3 ];

  buildPhase = ''
    # Lay out source so Tailwind's content scanner finds all class names.
    mkdir -p src/styles
    cp index.html  src/index.html
    cp utils.js    src/utils.js
    cp status.js   src/status.js
    cp script.js   src/script.js
    cp styles/input.css src/styles/input.css

    cat > tailwind.config.js << 'EOF'
module.exports = { content: ['./src/**/*.{html,js}'], theme: { extend: {} } }
EOF
    tailwindcss \
      --config tailwind.config.js \
      --input src/styles/input.css \
      --output style.css \
      --minify
  '';

  installPhase = ''
    mkdir -p $out/assets

    cp src/index.html  $out/index.html
    cp src/utils.js    $out/utils.js
    cp src/status.js   $out/status.js
    cp src/script.js   $out/script.js
    cp style.css       $out/style.css

    cp assets/thumb.svg $out/assets/thumb.svg

    # Favicons / web-app manifest
    cp assets/icon/ms-icon-310x310.png   $out/favicon.ico
    cp assets/icon/ms-icon-310x310.png   $out/ms-icon-310x310.png
    cp assets/icon/ms-icon-150x150.png   $out/ms-icon-150x150.png
    cp assets/icon/ms-icon-144x144.png   $out/ms-icon-144x144.png
    cp assets/icon/ms-icon-70x70.png     $out/ms-icon-70x70.png
    cp assets/icon/manifest.json         $out/manifest.json
    cp assets/icon/favicon-256x256.png   $out/favicon-256x256.png
    cp assets/icon/favicon-96x96.png     $out/favicon-96x96.png
    cp assets/icon/favicon-32x32.png     $out/favicon-32x32.png
    cp assets/icon/favicon-16x16.png     $out/favicon-16x16.png
    cp assets/icon/browserconfig.xml     $out/browserconfig.xml
    cp assets/icon/apple-icon-180x180.png $out/apple-icon-180x180.png
    cp assets/icon/apple-icon-152x152.png $out/apple-icon-152x152.png
    cp assets/icon/apple-icon-144x144.png $out/apple-icon-144x144.png
    cp assets/icon/apple-icon-120x120.png $out/apple-icon-120x120.png
    cp assets/icon/apple-icon-114x114.png $out/apple-icon-114x114.png
    cp assets/icon/apple-icon-76x76.png   $out/apple-icon-76x76.png
    cp assets/icon/apple-icon-72x72.png   $out/apple-icon-72x72.png
    cp assets/icon/apple-icon-60x60.png   $out/apple-icon-60x60.png
    cp assets/icon/apple-icon-57x57.png   $out/apple-icon-57x57.png
    cp assets/icon/android-icon-192x192.png $out/android-icon-192x192.png
  '';

  meta = with lib; {
    description = "Ewan's personal PDS landing page";
    homepage = "https://pds.ewancroft.uk";
    license = licenses.agpl3Only;
    platforms = platforms.all;
  };
}
