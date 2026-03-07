/// health-check — pre-rebuild preflight for the nix config.
///
/// Exits 0 if all hard checks pass (warnings are non-fatal).
/// Run before `nrs` to catch problems early.
use tools_common::{self, *};

// ── result types ─────────────────────────────────────────────────────────────

#[derive(Debug, PartialEq)]
enum Status { Pass, Warn, Fail }

struct Check {
    name:   &'static str,
    status: Status,
    detail: String,
}

impl Check {
    fn pass(name: &'static str, detail: impl Into<String>) -> Self {
        Self { name, status: Status::Pass, detail: detail.into() }
    }
    fn warn(name: &'static str, detail: impl Into<String>) -> Self {
        Self { name, status: Status::Warn, detail: detail.into() }
    }
    fn fail(name: &'static str, detail: impl Into<String>) -> Self {
        Self { name, status: Status::Fail, detail: detail.into() }
    }
    fn icon(&self) -> &str {
        match self.status {
            Status::Pass => "✅",
            Status::Warn => "⚠️ ",
            Status::Fail => "❌",
        }
    }
}

// ── individual checks ────────────────────────────────────────────────────────

fn check_nix_daemon() -> Check {
    let ok = Command::new("nix")
        .args(["store", "ping"])
        .stdout(Stdio::null()).stderr(Stdio::null())
        .status().map(|s| s.success()).unwrap_or(false);
    if ok {
        Check::pass("Nix daemon", "responding")
    } else {
        Check::fail("Nix daemon", "not responding — try: sudo launchctl start org.nixos.nix-daemon")
    }
}

fn check_flake_lock(repo_root: &Path) -> Check {
    let lock = repo_root.join("flake.lock");
    if !lock.exists() {
        return Check::fail("flake.lock", "missing — run: nix flake update");
    }
    // Validate JSON with jq
    let ok = Command::new("jq")
        .args(["-e", ".nodes.root", lock.to_str().unwrap()])
        .stdout(Stdio::null()).stderr(Stdio::null())
        .status().map(|s| s.success()).unwrap_or(false);
    if ok {
        Check::pass("flake.lock", "present and valid JSON")
    } else {
        Check::fail("flake.lock", "present but invalid — run: nix flake update")
    }
}

fn check_config_build(repo_root: &Path, hostname: &str, is_darwin: bool) -> Check {
    // Construct the platform-specific toplevel attribute
    let (attr_set, platform_label) = if is_darwin {
        ("darwinConfigurations", "darwin-rebuild")
    } else {
        ("nixosConfigurations", "nixos-rebuild")
    };
    let attr = format!(".#{attr_set}.{hostname}.config.system.build.toplevel");

    // --dry-run evaluates the full derivation graph and reports what would be
    // built/fetched without actually building anything — ideal for a preflight.
    let out = Command::new("nix")
        .current_dir(repo_root)
        .args(["build", &attr, "--dry-run"])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output();

    match out {
        Ok(o) if o.status.success() => {
            // nix build --dry-run prints to stderr: "these derivations will be built:"
            let stderr = String::from_utf8_lossy(&o.stderr);
            let summary = if stderr.contains("will be built") || stderr.contains("will be fetched") {
                // Count lines that start with a store path to give a meaningful count
                let n = stderr.lines()
                    .filter(|l| l.trim_start().starts_with("/nix/store"))
                    .count();
                format!("evaluates cleanly ({n} derivation(s) would build)")
            } else {
                "evaluates cleanly (nothing to build)".into()
            };
            Check::pass(platform_label, summary)
        }
        Ok(o) => {
            let err = String::from_utf8_lossy(&o.stderr);
            // Surface the first meaningful error line
            let short = err
                .lines()
                .find(|l| l.trim_start().starts_with("error:"))
                .unwrap_or_else(|| err.lines().next().unwrap_or("unknown error"))
                .trim()
                .to_string();
            // Give a helpful hint if the hostname isn't in the config
            if err.contains("does not provide attribute") {
                Check::fail(
                    platform_label,
                    format!("host '{hostname}' not found in {attr_set} — add it to flake.nix"),
                )
            } else {
                Check::fail(platform_label, short)
            }
        }
        Err(e) => Check::fail(platform_label, format!("nix not found: {e}")),
    }
}

fn check_git_state(repo_root: &Path) -> Check {
    let out = Command::new("git")
        .current_dir(repo_root)
        .args(["status", "--porcelain"])
        .output();
    match out {
        Ok(o) if o.stdout.is_empty() => Check::pass("Git tree", "clean"),
        Ok(o) => {
            let n = String::from_utf8_lossy(&o.stdout).lines().count();
            Check::warn("Git tree",
                format!("{n} uncommitted change(s) — commit after rebuilding to keep history clean"))
        }
        _ => Check::warn("Git tree", "could not determine status"),
    }
}

fn check_age_key() -> Check {
    let home = env::var("HOME").unwrap_or_default();
    let path = PathBuf::from(&home).join(".config/age/keys.txt");
    if path.exists() {
        Check::pass("Age key", path.display().to_string())
    } else {
        Check::fail("Age key",
            format!("not found at {} — run: secrets-setup", path.display()))
    }
}

fn check_ssh_keys(repo_root: &Path) -> Check {
    let path = repo_root.join("modules/ssh-keys.nix");
    if !path.exists() {
        return Check::warn("SSH keys", "modules/ssh-keys.nix not found");
    }
    let content = match fs::read_to_string(&path) {
        Ok(c) => c,
        Err(e) => return Check::fail("SSH keys", format!("read error: {e}")),
    };
    let count = content.lines().filter(|l| l.contains("ssh-ed25519 AAAA")).count();
    if count > 0 {
        Check::pass("SSH keys", format!("{count} valid ed25519 key(s) in ssh-keys.nix"))
    } else {
        Check::warn("SSH keys", "no valid ed25519 keys found in modules/ssh-keys.nix")
    }
}

fn check_homebrew() -> Check {
    let out = Command::new("which").arg("brew").output();
    match out {
        Ok(o) if o.status.success() => {
            Check::pass("Homebrew", String::from_utf8_lossy(&o.stdout).trim().to_string())
        }
        _ => Check::fail("Homebrew", "not installed — required by modules/darwin/homebrew.nix"),
    }
}

fn check_disk_space() -> Check {
    // Warn if /nix/store partition has < 5 GB free
    let out = Command::new("df")
        .args(["-k", "/nix/store"])
        .output();
    if let Ok(o) = out {
        let text = String::from_utf8_lossy(&o.stdout);
        if let Some(line) = text.lines().nth(1) {
            let cols: Vec<&str> = line.split_whitespace().collect();
            // df -k: 1=blocks, 2=used, 3=available
            if let Some(avail_kb) = cols.get(3).and_then(|s| s.parse::<u64>().ok()) {
                let avail_gb = avail_kb / 1_048_576;
                return if avail_gb >= 5 {
                    Check::pass("Disk space", format!("{avail_gb} GB free on /nix/store"))
                } else {
                    Check::warn("Disk space",
                        format!("only {avail_gb} GB free — run: sudo nix-collect-garbage -d"))
                };
            }
        }
    }
    Check::warn("Disk space", "could not determine free space")
}

// ── main ─────────────────────────────────────────────────────────────────────

fn main() -> io::Result<()> {
    let repo_root = git_root();
    let is_darwin = cfg!(target_os = "macos");
    let hostname = get_hostname();

    println!("🏥  Nix config health check\n");
    println!("    Repo : {}", repo_root.display());
    println!("    Host : {}", hostname);
    println!("    OS   : {}\n", if is_darwin { "macOS (darwin)" } else { "NixOS (linux)" });

    let mut checks = vec![
        check_nix_daemon(),
        check_flake_lock(&repo_root),
        check_config_build(&repo_root, &hostname, is_darwin),
        check_git_state(&repo_root),
        check_age_key(),
        check_ssh_keys(&repo_root),
        check_disk_space(),
    ];

    if is_darwin {
        checks.push(check_homebrew());
    }

    // Print results
    let name_w = checks.iter().map(|c| c.name.len()).max().unwrap_or(10);
    for c in &checks {
        println!("  {}  {:<name_w$}  {}", c.icon(), c.name, c.detail, name_w = name_w);
    }

    // Summary
    let failures = checks.iter().filter(|c| c.status == Status::Fail).count();
    let warnings = checks.iter().filter(|c| c.status == Status::Warn).count();

    println!();
    if failures == 0 && warnings == 0 {
        println!("✨  All checks passed — safe to rebuild.");
    } else if failures == 0 {
        println!("⚠️   {} warning(s) — rebuild will probably work, but check above.", warnings);
    } else {
        eprintln!("❌  {} failure(s), {} warning(s) — fix before rebuilding.", failures, warnings);
        std::process::exit(1);
    }

    Ok(())
}
