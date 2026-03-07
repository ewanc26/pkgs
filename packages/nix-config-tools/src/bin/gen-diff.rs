/// gen-diff — show what changed between nix-darwin / NixOS generations.
///
/// Usage:
///   gen-diff                   diff last two generations
///   gen-diff --list            list all generations with dates
///   gen-diff --from N --to M   diff specific generation numbers
use tools_common::{self, *};

const PROFILES_DIR: &str = "/nix/var/nix/profiles";

struct Gen {
    number: u32,
    path:   PathBuf,
}

fn find_generations() -> Vec<Gen> {
    let dir = PathBuf::from(PROFILES_DIR);
    let mut gens: Vec<Gen> = fs::read_dir(&dir)
        .unwrap_or_else(|_| {
            eprintln!("❌ Cannot read {PROFILES_DIR} — are you on a Nix system?");
            std::process::exit(1);
        })
        .flatten()
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            // Match "system-N-link"
            let n_str = name.strip_prefix("system-")?.strip_suffix("-link")?;
            let n: u32 = n_str.parse().ok()?;
            Some(Gen { number: n, path: e.path() })
        })
        .collect();

    gens.sort_by_key(|g| g.number);
    gens
}

/// Return the mtime of a path as "YYYY-MM-DD HH:MM".
/// Uses `date -r <path>` which works on both macOS and Linux (GNU).
fn path_date(path: &Path) -> String {
    let out = Command::new("date")
        .args(["-r", path.to_str().unwrap_or(""), "+%Y-%m-%d %H:%M"])
        .output();
    match out {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        _ => "?".to_string(),
    }
}

fn diff_gens(from: &Gen, to: &Gen) {
    println!("🔍 Generation diff\n");
    println!("  From : gen {:>3}  ({})", from.number, path_date(&from.path));
    println!("  To   : gen {:>3}  ({})\n", to.number, path_date(&to.path));
    println!("{}", "─".repeat(60));

    // nix store diff-closures prints a human-readable package diff
    let diff = Command::new("nix")
        .args([
            "store", "diff-closures",
            from.path.to_str().unwrap(),
            to.path.to_str().unwrap(),
        ])
        .output()
        .expect("nix not found");

    let stdout = String::from_utf8_lossy(&diff.stdout);
    let stderr = String::from_utf8_lossy(&diff.stderr);

    if stdout.trim().is_empty() && stderr.trim().is_empty() {
        println!("\n✨ No package changes between these generations.");
    } else {
        if !stdout.is_empty() { print!("{stdout}"); }
        if !stderr.is_empty() { eprint!("{stderr}"); }
    }
}

fn list_gens(gens: &[Gen]) {
    println!("📋 System generations\n");
    println!("  {:<6}  {:<17}  PATH", "GEN", "BUILT");
    println!("  {}", "─".repeat(70));

    // Resolve current symlink to highlight it
    let current = fs::read_link(PathBuf::from(PROFILES_DIR).join("system"))
        .unwrap_or_default();

    for g in gens.iter().rev() {  // newest first
        let date = path_date(&g.path);
        let real  = fs::read_link(&g.path).unwrap_or_default();
        let marker = if real == current { " ← current" } else { "" };
        println!("  {:<6}  {:<17}  {}{}",
            g.number, date, g.path.display(), marker);
    }
}

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let gens = find_generations();

    if gens.is_empty() {
        eprintln!("❌ No system generations found in {PROFILES_DIR}");
        std::process::exit(1);
    }

    // ── --list ───────────────────────────────────────────────────────────────
    if args.iter().any(|a| a == "--list") {
        list_gens(&gens);
        return Ok(());
    }

    // ── parse optional --from N --to M ────────────────────────────────────
    let parse_flag = |flag: &str| -> Option<u32> {
        args.windows(2)
            .find(|w| w[0] == flag)
            .and_then(|w| w[1].parse().ok())
    };

    let find_gen = |n: u32| -> Option<&Gen> { gens.iter().find(|g| g.number == n) };

    let from = match parse_flag("--from") {
        Some(n) => find_gen(n).unwrap_or_else(|| {
            eprintln!("❌ Generation {n} not found");
            std::process::exit(1);
        }),
        None if gens.len() >= 2 => &gens[gens.len() - 2],
        _ => {
            eprintln!("ℹ️  Only one generation exists — nothing to diff.");
            list_gens(&gens);
            return Ok(());
        }
    };

    let to = match parse_flag("--to") {
        Some(n) => find_gen(n).unwrap_or_else(|| {
            eprintln!("❌ Generation {n} not found");
            std::process::exit(1);
        }),
        None => gens.last().unwrap(),
    };

    if from.number == to.number {
        eprintln!("⚠️  --from and --to are the same generation ({})", from.number);
        std::process::exit(1);
    }

    diff_gens(from, to);

    println!("\n💡 Tips");
    println!("  List all generations : gen-diff --list");
    println!("  Specific range       : gen-diff --from N --to M");
    println!("  Roll back            : sudo nix-env --rollback --profile {PROFILES_DIR}/system");

    Ok(())
}
