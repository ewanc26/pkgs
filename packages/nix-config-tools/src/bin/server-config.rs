/// server-config — interactive configurator for the NixOS server settings.
///
/// Reads defaults from modules/options.nix and host overrides from
/// hosts/server/default.nix, then writes any changes back as
/// `myConfig.X.Y = value;` override attributes in the host file.
///
/// modules/options.nix is never modified — it is the canonical default source.
///
/// Usage:
///   nix run .#server-config           # interactive (full menu)
///   nix run .#server-config -- --show  # print current config and exit
use console::Style;
use dialoguer::{theme::ColorfulTheme, Confirm, Input, MultiSelect, Select};
use regex::Regex;
use tools_common::*;

// ── helpers ──────────────────────────────────────────────────────────────────

fn theme() -> ColorfulTheme { ColorfulTheme::default() }

fn read_file(path: &Path) -> String {
    fs::read_to_string(path).unwrap_or_else(|e| {
        eprintln!("❌  Cannot read {}: {}", path.display(), e);
        std::process::exit(1);
    })
}

fn write_file(path: &Path, content: &str) {
    fs::write(path, content).unwrap_or_else(|e| {
        eprintln!("❌  Cannot write {}: {}", path.display(), e);
        std::process::exit(1);
    });
}

fn strip_nix_string(s: &str) -> String {
    s.trim().trim_matches('"').to_string()
}

// ── options.nix readers ───────────────────────────────────────────────────────
//
// modules/options.nix structure (4-space top-level sections, 6-space keys):
//
//     forgejo = {
//       hostname = mkOption {
//         type = str;
//         default = "git.ewancroft.uk";
//       };
//     };
//
// For doubly-nested sections (server.storage.srv, server.cockpit) the
// indentation is 6/8/10 spaces.

/// Extract the `default = ` value for a key inside a top-level section.
/// `section` = "forgejo", `key` = "hostname" → returns `"git.ewancroft.uk"`
fn opts_get(src: &str, section: &str, key: &str) -> Option<String> {
    let sec_marker = format!("\n    {section} = {{");
    let sec_start  = src.find(&sec_marker)? + sec_marker.len();
    let rest       = &src[sec_start..];

    // Key at 6-space indent inside the section
    let key_marker = format!("\n      {key} = mkOption {{");
    let key_rel    = rest.find(&key_marker)?;
    let after_key  = &rest[key_rel..];

    // The mkOption block closes at the next `      };`
    let block_end  = after_key.find("\n      };")?;
    let block      = &after_key[..block_end];

    let dp         = block.find("default = ")?;
    let after_def  = &block[dp + "default = ".len()..];
    let end        = after_def.find(';')?;
    Some(after_def[..end].trim().to_string())
}

/// Like opts_get but for keys one level deeper (e.g. server.storage.srv.device).
/// `outer` = "server", `inner_block` = "storage.srv", `key` = "device"
fn opts_get_nested(src: &str, outer: &str, inner_block: &str, key: &str) -> Option<String> {
    let outer_marker  = format!("\n    {outer} = {{");
    let outer_start   = src.find(&outer_marker)? + outer_marker.len();
    let outer_rest    = &src[outer_start..];

    let inner_marker  = format!("\n      {inner_block} = {{");
    let inner_rel     = outer_rest.find(&inner_marker)?;
    let after_inner   = &outer_rest[inner_rel..];

    // Key at 8-space indent
    let key_marker    = format!("\n        {key} = mkOption {{");
    let key_rel       = after_inner.find(&key_marker)?;
    let after_key     = &after_inner[key_rel..];

    let block_end     = after_key.find("\n        };")?;
    let block         = &after_key[..block_end];

    let dp            = block.find("default = ")?;
    let after_def     = &block[dp + "default = ".len()..];
    let end           = after_def.find(';')?;
    Some(after_def[..end].trim().to_string())
}

// ── host file readers/writers ─────────────────────────────────────────────────
//
// hosts/server/default.nix contains overrides like:
//   myConfig.services.forgejo.enable = true;
//   myConfig.forgejo.hostname = "git.ewancroft.uk";
//
// If no override is present the options.nix default applies.

/// Read a `myConfig.<dotted_path> = value;` line from the host file.
fn host_get(src: &str, dotted_path: &str) -> Option<String> {
    let pattern = format!("myConfig.{dotted_path} = ");
    let pos     = src.find(&pattern)?;
    let after   = &src[pos + pattern.len()..];
    let end     = after.find(';')?;
    Some(after[..end].trim().to_string())
}

/// Add or update a `myConfig.<dotted_path> = <value>;` line in the host file.
/// Inserts before `system.stateVersion` if the line doesn't exist yet.
fn host_set(src: &mut String, dotted_path: &str, value: &str) {
    let search   = format!("myConfig.{dotted_path} = ");
    let new_line = format!("  myConfig.{dotted_path} = {value};");

    if let Some(pos) = src.find(&search) {
        let line_start = src[..pos].rfind('\n').map(|i| i + 1).unwrap_or(0);
        let line_end   = src[pos..].find('\n').map(|i| pos + i).unwrap_or(src.len());
        src.replace_range(line_start..line_end, &new_line);
    } else {
        // Insert before `  system.stateVersion` to keep the file tidy
        let anchor = "  system.stateVersion";
        if let Some(pos) = src.find(anchor) {
            src.insert_str(pos, &format!("{new_line}\n\n  "));
        } else {
            // Fall back: insert before the closing `}`
            if let Some(pos) = src.rfind('}') {
                src.insert_str(pos, &format!("  {new_line}\n"));
            }
        }
    }
}

/// Resolve the effective value: host override → options.nix default → fallback.
fn resolve_str(
    opts: &str, host: &str,
    section: &str, key: &str, dotted_path: &str,
    fallback: &str,
) -> String {
    if let Some(v) = host_get(host, dotted_path) {
        return strip_nix_string(&v);
    }
    if let Some(v) = opts_get(opts, section, key) {
        return strip_nix_string(&v);
    }
    fallback.to_string()
}

fn resolve_u16(
    opts: &str, host: &str,
    section: &str, key: &str, dotted_path: &str,
    fallback: u16,
) -> u16 {
    let s = resolve_str(opts, host, section, key, dotted_path, "");
    s.parse().unwrap_or(fallback)
}

fn resolve_bool(
    opts: &str, host: &str,
    dotted_path: &str,
    fallback: bool,
) -> bool {
    if let Some(v) = host_get(host, dotted_path) {
        return v.trim() == "true";
    }
    fallback
}

// ── config structs ────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
struct ServiceToggles {
    forgejo:    bool,
    pds:        bool,
    matrix:     bool,
    cloudflare: bool,
}

#[derive(Debug, Clone)]
struct StorageConfig {
    device:  String,
    fs_type: String,
}

#[derive(Debug, Clone)]
struct CockpitConfig {
    enable: bool,
    port:   u16,
}

#[derive(Debug, Clone)]
struct ForgejoConfig {
    hostname:             String,
    port:                 u16,
    caddy_port:           u16,
    app_name:             String,
    disable_registration: bool,
}

#[derive(Debug, Clone)]
struct MatrixConfig {
    hostname:    String,
    server_name: String,
    port:        u16,
    caddy_port:  u16,
}

#[derive(Debug, Clone)]
struct PdsConfig {
    hostname:    String,
    port:        u16,
    caddy_port:  u16,
    admin_email: String,
}

#[derive(Debug, Clone)]
struct CloudflareConfig {
    tunnel_id: String,
}

// ── readers ───────────────────────────────────────────────────────────────────

fn read_services(host_src: &str) -> ServiceToggles {
    ServiceToggles {
        forgejo:    host_get(host_src, "services.forgejo.enable").map(|v| v == "true").unwrap_or(false),
        pds:        host_get(host_src, "services.pds.enable").map(|v| v == "true").unwrap_or(false),
        matrix:     host_get(host_src, "services.matrix.enable").map(|v| v == "true").unwrap_or(false),
        cloudflare: host_get(host_src, "services.cloudflare.enable").map(|v| v == "true").unwrap_or(false),
    }
}

fn read_storage(opts_src: &str, host_src: &str) -> StorageConfig {
    StorageConfig {
        device: {
            host_get(host_src, "server.storage.srv.device")
                .map(|v| strip_nix_string(&v))
                .or_else(|| opts_get_nested(opts_src, "server", "storage.srv", "device").map(|v| strip_nix_string(&v)))
                .unwrap_or_else(|| "/dev/sdb".to_string())
        },
        fs_type: {
            host_get(host_src, "server.storage.srv.fsType")
                .map(|v| strip_nix_string(&v))
                .or_else(|| opts_get_nested(opts_src, "server", "storage.srv", "fsType").map(|v| strip_nix_string(&v)))
                .unwrap_or_else(|| "ext4".to_string())
        },
    }
}

fn read_cockpit(opts_src: &str, host_src: &str) -> CockpitConfig {
    let enable = host_get(host_src, "server.cockpit.enable")
        .map(|v| v == "true")
        .or_else(|| opts_get_nested(opts_src, "server", "cockpit", "enable").map(|v| v == "true"))
        .unwrap_or(true);
    let port = host_get(host_src, "server.cockpit.port")
        .and_then(|v| v.trim().parse().ok())
        .or_else(|| opts_get_nested(opts_src, "server", "cockpit", "port").and_then(|v| v.trim().parse().ok()))
        .unwrap_or(9090);
    CockpitConfig { enable, port }
}

fn read_forgejo(opts_src: &str, host_src: &str) -> ForgejoConfig {
    ForgejoConfig {
        hostname:             resolve_str(opts_src, host_src, "forgejo", "hostname",             "forgejo.hostname",             "git.ewancroft.uk"),
        port:                 resolve_u16(opts_src, host_src, "forgejo", "port",                 "forgejo.port",                 3001),
        caddy_port:           resolve_u16(opts_src, host_src, "forgejo", "caddyPort",            "forgejo.caddyPort",            3002),
        app_name:             resolve_str(opts_src, host_src, "forgejo", "appName",              "forgejo.appName",              "Ewan's Git"),
        disable_registration: {
            host_get(host_src, "forgejo.disableRegistration").map(|v| v == "true")
                .or_else(|| opts_get(opts_src, "forgejo", "disableRegistration").map(|v| v == "true"))
                .unwrap_or(true)
        },
    }
}

fn read_matrix(opts_src: &str, host_src: &str) -> MatrixConfig {
    MatrixConfig {
        hostname:    resolve_str(opts_src, host_src, "matrix", "hostname",   "matrix.hostname",   "matrix.ewancroft.uk"),
        server_name: resolve_str(opts_src, host_src, "matrix", "serverName", "matrix.serverName", "ewancroft.uk"),
        port:        resolve_u16(opts_src, host_src, "matrix", "port",       "matrix.port",       8008),
        caddy_port:  resolve_u16(opts_src, host_src, "matrix", "caddyPort",  "matrix.caddyPort",  8448),
    }
}

fn read_pds(opts_src: &str, host_src: &str) -> PdsConfig {
    PdsConfig {
        hostname:    resolve_str(opts_src, host_src, "pds", "hostname",   "pds.hostname",   "pds.ewancroft.uk"),
        port:        resolve_u16(opts_src, host_src, "pds", "port",       "pds.port",       3000),
        caddy_port:  resolve_u16(opts_src, host_src, "pds", "caddyPort",  "pds.caddyPort",  2020),
        admin_email: resolve_str(opts_src, host_src, "pds", "adminEmail", "pds.adminEmail", "pds@ewancroft.uk"),
    }
}

fn read_cloudflare(opts_src: &str, host_src: &str) -> CloudflareConfig {
    CloudflareConfig {
        tunnel_id: resolve_str(opts_src, host_src, "cloudflare", "tunnelId", "cloudflare.tunnelId", "<unset>"),
    }
}

// ── writers ───────────────────────────────────────────────────────────────────
// All writes go to hosts/server/default.nix as myConfig.X.Y = value; overrides.

fn write_services(host_src: &mut String, s: &ServiceToggles) {
    host_set(host_src, "services.forgejo.enable",    &s.forgejo.to_string());
    host_set(host_src, "services.pds.enable",        &s.pds.to_string());
    host_set(host_src, "services.matrix.enable",     &s.matrix.to_string());
    host_set(host_src, "services.cloudflare.enable", &s.cloudflare.to_string());
}

fn write_storage(host_src: &mut String, st: &StorageConfig) {
    host_set(host_src, "server.storage.srv.device",  &format!("\"{}\"", st.device));
    host_set(host_src, "server.storage.srv.fsType",  &format!("\"{}\"", st.fs_type));
}

fn write_cockpit(host_src: &mut String, c: &CockpitConfig) {
    host_set(host_src, "server.cockpit.enable", &c.enable.to_string());
    host_set(host_src, "server.cockpit.port",   &c.port.to_string());
}

fn write_forgejo(host_src: &mut String, f: &ForgejoConfig) {
    host_set(host_src, "forgejo.hostname",             &format!("\"{}\"", f.hostname));
    host_set(host_src, "forgejo.port",                 &f.port.to_string());
    host_set(host_src, "forgejo.caddyPort",            &f.caddy_port.to_string());
    host_set(host_src, "forgejo.appName",              &format!("\"{}\"", f.app_name));
    host_set(host_src, "forgejo.disableRegistration",  &f.disable_registration.to_string());
}

fn write_matrix(host_src: &mut String, m: &MatrixConfig) {
    host_set(host_src, "matrix.hostname",    &format!("\"{}\"", m.hostname));
    host_set(host_src, "matrix.serverName",  &format!("\"{}\"", m.server_name));
    host_set(host_src, "matrix.port",        &m.port.to_string());
    host_set(host_src, "matrix.caddyPort",   &m.caddy_port.to_string());
}

fn write_pds(host_src: &mut String, p: &PdsConfig) {
    host_set(host_src, "pds.hostname",    &format!("\"{}\"", p.hostname));
    host_set(host_src, "pds.port",        &p.port.to_string());
    host_set(host_src, "pds.caddyPort",   &p.caddy_port.to_string());
    host_set(host_src, "pds.adminEmail",  &format!("\"{}\"", p.admin_email));
}

fn write_cloudflare(host_src: &mut String, c: &CloudflareConfig) {
    host_set(host_src, "cloudflare.tunnelId", &format!("\"{}\"", c.tunnel_id));
}

// ── display ───────────────────────────────────────────────────────────────────

fn bool_str(b: bool) -> &'static str { if b { "enabled" } else { "disabled" } }

fn print_summary(
    svc: &ServiceToggles, st: &StorageConfig, ck: &CockpitConfig,
    fg: &ForgejoConfig, mx: &MatrixConfig, pd: &PdsConfig, cf: &CloudflareConfig,
) {
    let h1 = Style::new().bold().cyan();
    let kv = |k: &str, v: &str| println!("    {:<28} {}", format!("{k}:"), v);

    println!("\n{}", h1.apply_to("  ── Service toggles ──────────────────────"));
    kv("forgejo",    bool_str(svc.forgejo));
    kv("pds",        bool_str(svc.pds));
    kv("matrix",     bool_str(svc.matrix));
    kv("cloudflare", bool_str(svc.cloudflare));

    println!("\n{}", h1.apply_to("  ── /srv storage ──────────────────────────"));
    kv("device",  &st.device);
    kv("fsType",  &st.fs_type);

    println!("\n{}", h1.apply_to("  ── Cockpit dashboard ─────────────────────"));
    kv("enable", bool_str(ck.enable));
    kv("port",   &ck.port.to_string());

    println!("\n{}", h1.apply_to("  ── Forgejo ───────────────────────────────"));
    kv("hostname",             &fg.hostname);
    kv("port",                 &fg.port.to_string());
    kv("caddyPort",            &fg.caddy_port.to_string());
    kv("appName",              &fg.app_name);
    kv("disableRegistration",  bool_str(fg.disable_registration));

    println!("\n{}", h1.apply_to("  ── Matrix Synapse ────────────────────────"));
    kv("hostname",   &mx.hostname);
    kv("serverName", &mx.server_name);
    kv("port",       &mx.port.to_string());
    kv("caddyPort",  &mx.caddy_port.to_string());

    println!("\n{}", h1.apply_to("  ── Bluesky PDS ───────────────────────────"));
    kv("hostname",   &pd.hostname);
    kv("port",       &pd.port.to_string());
    kv("caddyPort",  &pd.caddy_port.to_string());
    kv("adminEmail", &pd.admin_email);

    println!("\n{}", h1.apply_to("  ── Cloudflare Tunnel ─────────────────────"));
    kv("tunnelId", &cf.tunnel_id);

    println!();
}

// ── interactive sections ──────────────────────────────────────────────────────

fn edit_services(svc: &mut ServiceToggles) {
    let names    = ["forgejo", "pds (Bluesky ATProto)", "matrix", "cloudflare tunnel"];
    let defaults = vec![svc.forgejo, svc.pds, svc.matrix, svc.cloudflare];
    let selected = MultiSelect::with_theme(&theme())
        .with_prompt("Select services to ENABLE (space = toggle, enter = confirm)")
        .items(&names)
        .defaults(&defaults)
        .interact()
        .unwrap();
    svc.forgejo    = selected.contains(&0);
    svc.pds        = selected.contains(&1);
    svc.matrix     = selected.contains(&2);
    svc.cloudflare = selected.contains(&3);
}

fn edit_storage(st: &mut StorageConfig) {
    st.device = Input::with_theme(&theme())
        .with_prompt("/srv block device  (e.g. /dev/sdb, /dev/nvme0n1p2)")
        .with_initial_text(&st.device)
        .interact_text().unwrap();

    let fs_opts = ["ext4", "xfs", "btrfs"];
    let idx = fs_opts.iter().position(|&f| f == st.fs_type).unwrap_or(0);
    let sel = Select::with_theme(&theme())
        .with_prompt("Filesystem type")
        .items(&fs_opts)
        .default(idx)
        .interact().unwrap();
    st.fs_type = fs_opts[sel].to_string();
}

fn edit_cockpit(ck: &mut CockpitConfig) {
    ck.enable = Confirm::with_theme(&theme())
        .with_prompt("Enable Cockpit dashboard?")
        .default(ck.enable)
        .interact().unwrap();
    if ck.enable {
        let p: String = Input::with_theme(&theme())
            .with_prompt("Cockpit port  (Tailscale-only access)")
            .with_initial_text(&ck.port.to_string())
            .interact_text().unwrap();
        ck.port = p.trim().parse().unwrap_or(ck.port);
    }
}

fn edit_forgejo(fg: &mut ForgejoConfig) {
    fg.hostname = Input::with_theme(&theme())
        .with_prompt("Forgejo public hostname")
        .with_initial_text(&fg.hostname)
        .interact_text().unwrap();
    fg.app_name = Input::with_theme(&theme())
        .with_prompt("Forgejo display name")
        .with_initial_text(&fg.app_name)
        .interact_text().unwrap();
    let p: String = Input::with_theme(&theme())
        .with_prompt("Forgejo internal port")
        .with_initial_text(&fg.port.to_string())
        .interact_text().unwrap();
    fg.port = p.trim().parse().unwrap_or(fg.port);
    let cp: String = Input::with_theme(&theme())
        .with_prompt("Caddy internal port (tunnel → Caddy → Forgejo)")
        .with_initial_text(&fg.caddy_port.to_string())
        .interact_text().unwrap();
    fg.caddy_port = cp.trim().parse().unwrap_or(fg.caddy_port);
    fg.disable_registration = Confirm::with_theme(&theme())
        .with_prompt("Disable public registration?")
        .default(fg.disable_registration)
        .interact().unwrap();
}

fn edit_matrix(mx: &mut MatrixConfig) {
    mx.hostname = Input::with_theme(&theme())
        .with_prompt("Matrix public hostname")
        .with_initial_text(&mx.hostname)
        .interact_text().unwrap();
    mx.server_name = Input::with_theme(&theme())
        .with_prompt("Matrix server name  (used in @user:domain IDs)")
        .with_initial_text(&mx.server_name)
        .interact_text().unwrap();
    let p: String = Input::with_theme(&theme())
        .with_prompt("Synapse internal port")
        .with_initial_text(&mx.port.to_string())
        .interact_text().unwrap();
    mx.port = p.trim().parse().unwrap_or(mx.port);
    let cp: String = Input::with_theme(&theme())
        .with_prompt("Caddy internal port")
        .with_initial_text(&mx.caddy_port.to_string())
        .interact_text().unwrap();
    mx.caddy_port = cp.trim().parse().unwrap_or(mx.caddy_port);
}

fn edit_pds(pd: &mut PdsConfig) {
    pd.hostname = Input::with_theme(&theme())
        .with_prompt("PDS public hostname")
        .with_initial_text(&pd.hostname)
        .interact_text().unwrap();
    pd.admin_email = Input::with_theme(&theme())
        .with_prompt("PDS admin email")
        .with_initial_text(&pd.admin_email)
        .interact_text().unwrap();
    let p: String = Input::with_theme(&theme())
        .with_prompt("PDS internal port")
        .with_initial_text(&pd.port.to_string())
        .interact_text().unwrap();
    pd.port = p.trim().parse().unwrap_or(pd.port);
    let cp: String = Input::with_theme(&theme())
        .with_prompt("Caddy internal port")
        .with_initial_text(&pd.caddy_port.to_string())
        .interact_text().unwrap();
    pd.caddy_port = cp.trim().parse().unwrap_or(pd.caddy_port);
}

fn edit_cloudflare(cf: &mut CloudflareConfig) {
    cf.tunnel_id = Input::with_theme(&theme())
        .with_prompt("Cloudflare tunnel UUID  (from: cloudflared tunnel create server)")
        .with_initial_text(&cf.tunnel_id)
        .interact_text().unwrap();
}

// ── main ─────────────────────────────────────────────────────────────────────

fn main() {
    let args: Vec<String> = env::args().collect();
    let show_only = args.iter().any(|a| a == "--show");

    let root          = git_root();
    let opts_path     = root.join("modules/options.nix");
    let host_path     = root.join("hosts/server/default.nix");

    let opts_src      = read_file(&opts_path);
    let mut host_src  = read_file(&host_path);

    let mut svc = read_services(&host_src);
    let mut st  = read_storage(&opts_src, &host_src);
    let mut ck  = read_cockpit(&opts_src, &host_src);
    let mut fg  = read_forgejo(&opts_src, &host_src);
    let mut mx  = read_matrix(&opts_src,  &host_src);
    let mut pd  = read_pds(&opts_src,     &host_src);
    let mut cf  = read_cloudflare(&opts_src, &host_src);

    let title = Style::new().bold().green();
    println!("\n{}", title.apply_to("  🖥️   Server configurator"));
    println!("  Options : {}", opts_path.display());
    println!("  Host    : {}\n", host_path.display());
    println!("  (defaults from modules/options.nix; overrides written to hosts/server/default.nix)\n");

    if show_only {
        print_summary(&svc, &st, &ck, &fg, &mx, &pd, &cf);
        return;
    }

    let menu_items = [
        "Service toggles    (forgejo / pds / matrix / cloudflare)",
        "/srv storage        (block device, filesystem)",
        "Cockpit dashboard   (enable, port)",
        "Forgejo             (hostname, ports, app name, registration)",
        "Matrix Synapse      (hostname, server name, ports)",
        "Bluesky PDS         (hostname, ports, admin email)",
        "Cloudflare Tunnel   (tunnel UUID)",
        "── Show current config",
        "── Save and exit",
        "── Exit without saving",
    ];

    loop {
        let choice = Select::with_theme(&theme())
            .with_prompt("What do you want to configure?")
            .items(&menu_items)
            .default(0)
            .interact()
            .unwrap();

        match choice {
            0 => edit_services(&mut svc),
            1 => edit_storage(&mut st),
            2 => edit_cockpit(&mut ck),
            3 => edit_forgejo(&mut fg),
            4 => edit_matrix(&mut mx),
            5 => edit_pds(&mut pd),
            6 => edit_cloudflare(&mut cf),
            7 => print_summary(&svc, &st, &ck, &fg, &mx, &pd, &cf),
            8 => {
                write_services(&mut host_src, &svc);
                write_storage(&mut host_src, &st);
                write_cockpit(&mut host_src, &ck);
                write_forgejo(&mut host_src, &fg);
                write_matrix(&mut host_src, &mx);
                write_pds(&mut host_src, &pd);
                write_cloudflare(&mut host_src, &cf);

                write_file(&host_path, &host_src);
                println!("\n✅  Saved to {}.", host_path.display());
                println!("    modules/options.nix was NOT modified — it is the default source.");
                println!("    Run `nrs` or `sudo nixos-rebuild switch --flake .#server` to apply.\n");

                if Confirm::with_theme(&theme())
                    .with_prompt("Run nixos-rebuild switch now?")
                    .default(false)
                    .interact()
                    .unwrap()
                {
                    let status = Command::new("sudo")
                        .args(["nixos-rebuild", "switch", "--flake",
                               &format!("{}#server", root.display())])
                        .status();
                    match status {
                        Ok(s) if s.success() => println!("✅  Rebuild succeeded."),
                        Ok(s) => eprintln!("❌  Rebuild exited with status {s}"),
                        Err(e) => eprintln!("❌  Could not run nixos-rebuild: {e}"),
                    }
                }
                break;
            }
            9 => { println!("Exiting without saving."); break; }
            _ => {}
        }
    }
}
