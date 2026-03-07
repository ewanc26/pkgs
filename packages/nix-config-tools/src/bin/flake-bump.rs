/// flake-bump — show how stale each flake input is, with selective update.
///
/// Usage:
///   flake-bump                   show staleness table
///   flake-bump --update <name>   bump one input and commit flake.lock
///   flake-bump --update-all      bump everything and commit flake.lock
use tools_common::{self, *};

struct InputRow {
    name:      String,
    type_:     String,
    location:  String,  // "owner/repo (branch)" or URL fragment
    rev:       String,
    age_days:  i64,
}

fn current_unix_time() -> i64 {
    let out = Command::new("date").arg("+%s").output().expect("date failed");
    String::from_utf8_lossy(&out.stdout).trim().parse().unwrap_or(0)
}

/// Run jq against the lock file and parse each non-root node into an InputRow.
fn parse_lock(lock_path: &Path) -> Vec<InputRow> {
    // Extract: name, type, owner, repo, rev, lastModified, ref/branch
    let prog = concat!(
        ".nodes | to_entries[] ",
        "| select(.key != \"root\") ",
        "| select(.value.locked != null) ",
        "| [ .key,",
        "   (.value.locked.type    // \"?\"),",
        "   (.value.locked.owner   // \"-\"),",
        "   (.value.locked.repo    // \"-\"),",
        "   (.value.locked.rev[0:8] // \"-\"),",
        "   ((.value.locked.lastModified // 0) | tostring),",
        "   (.value.original.ref // .value.original.rev // \"-\")",
        "] | @tsv"
    );

    let out = Command::new("jq")
        .args(["-r", prog, lock_path.to_str().unwrap()])
        .output()
        .expect("jq failed — is it installed?");

    if !out.status.success() {
        eprintln!("❌ jq error:\n{}", String::from_utf8_lossy(&out.stderr));
        return vec![];
    }

    let now = current_unix_time();
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .filter_map(|line| {
            let c: Vec<&str> = line.splitn(7, '\t').collect();
            if c.len() < 7 { return None; }
            let ts: i64 = c[5].parse().unwrap_or(0);
            let age_days = if ts > 0 { (now - ts) / 86400 } else { -1 };
            let location = if c[1] == "github" {
                format!("{}/{} ({})", c[2], c[3], c[6])
            } else {
                c[3].to_string()
            };
            Some(InputRow {
                name:     c[0].to_string(),
                type_:    c[1].to_string(),
                location,
                rev:      c[4].to_string(),
                age_days,
            })
        })
        .collect()
}

fn run_update(repo_root: &Path, input: Option<&str>) {
    let mut cmd = Command::new("nix");
    cmd.current_dir(repo_root).arg("flake");

    match input {
        Some(name) => {
            println!("🔄 Updating input: {name}");
            cmd.args(["update", name]);
        }
        None => {
            println!("🔄 Updating all inputs…");
            cmd.arg("update");
        }
    }

    let ok = cmd.status().map(|s| s.success()).unwrap_or(false);
    if ok {
        println!("✅ Done. Run `nrs` to apply.");
        git_sync("flake.lock", "flake");
    } else {
        eprintln!("❌ Update failed.");
        std::process::exit(1);
    }
}

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let repo_root = git_root();
    let lock_path = repo_root.join("flake.lock");

    if !lock_path.exists() {
        eprintln!("❌ flake.lock not found at {}", lock_path.display());
        std::process::exit(1);
    }

    // ── --update-all ────────────────────────────────────────────────────────
    if args.iter().any(|a| a == "--update-all") {
        run_update(&repo_root, None);
        return Ok(());
    }

    // ── --update <name> ─────────────────────────────────────────────────────
    if let Some(pos) = args.iter().position(|a| a == "--update") {
        let name = args.get(pos + 1).map(String::as_str).unwrap_or_else(|| {
            eprintln!("Usage: flake-bump --update <input-name>");
            std::process::exit(1);
        });
        run_update(&repo_root, Some(name));
        return Ok(());
    }

    // ── staleness table ─────────────────────────────────────────────────────
    let rows = parse_lock(&lock_path);
    if rows.is_empty() {
        eprintln!("No inputs found in flake.lock");
        return Ok(());
    }

    println!("📦 Flake input staleness  ({})\n", lock_path.display());

    // column widths
    let w_name = rows.iter().map(|r| r.name.len()).max().unwrap_or(10).max(5);
    let w_loc  = rows.iter().map(|r| r.location.len()).max().unwrap_or(20).min(45).max(8);

    println!("{:<w_name$}  {:<8}  {:<w_loc$}  {:<8}  {}",
        "INPUT", "TYPE", "SOURCE", "REV", "AGE",
        w_name = w_name, w_loc = w_loc);
    println!("{}", "─".repeat(w_name + w_loc + 40));

    let mut stale: Vec<String> = vec![];

    for r in &rows {
        let age_str = if r.age_days < 0 {
            "   ?".to_string()
        } else {
            format!("{:>3}d", r.age_days)
        };

        let badge = if r.age_days < 0 || r.age_days > 90 {
            stale.push(r.name.clone());
            "⚠️ "
        } else if r.age_days > 30 {
            "🟡"
        } else {
            "✅"
        };

        let loc = if r.location.len() > w_loc {
            format!("{}…", &r.location[..w_loc.saturating_sub(1)])
        } else {
            r.location.clone()
        };

        println!("{:<w_name$}  {:<8}  {:<w_loc$}  {:<8}  {} {}",
            r.name, r.type_, loc, r.rev, badge, age_str,
            w_name = w_name, w_loc = w_loc);
    }

    println!();
    if stale.is_empty() {
        println!("✨ All inputs are fresh.");
    } else {
        println!("⚠️  Stale (>90d): {}", stale.join(", "));
        println!();
        println!("  Bump one : flake-bump --update <name>");
        println!("  Bump all : flake-bump --update-all");
    }

    Ok(())
}
