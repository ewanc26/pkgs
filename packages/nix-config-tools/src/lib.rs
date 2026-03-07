pub use std::env;
pub use std::fs::{self, File};
pub use std::io::{self, Write};
pub use std::path::{Path, PathBuf};
pub use std::process::{Command, Stdio};

pub fn git_root() -> PathBuf {
    if let Ok(root) = env::var("PRJ_ROOT") { return PathBuf::from(root); }
    let output = Command::new("git").args(["rev-parse", "--show-toplevel"]).output().ok();
    if let Some(out) = output {
        let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if out.status.success() && !path.contains("/nix/store") { return PathBuf::from(path); }
    }
    PathBuf::from(env::var("HOME").unwrap_or_default()).join(".config/nix-config")
}

pub fn get_timestamp() -> String {
    let out = Command::new("date").arg("+%Y-%m-%d %H:%M:%S").output().expect("date fail");
    String::from_utf8_lossy(&out.stdout).trim().to_string()
}

pub fn get_hostname() -> String {
    let out = Command::new("hostname").arg("-s").output().expect("hostname fail");
    String::from_utf8_lossy(&out.stdout).trim().to_string()
}

pub fn capture_nix_to_file(cmd_args: &[&str], out_path: &Path) -> bool {
    let output = Command::new("nix").args(cmd_args).output();
    match output {
        Ok(out) if out.status.success() && !out.stdout.is_empty() => {
            if let Ok(mut file) = File::create(out_path) {
                return file.write_all(&out.stdout).is_ok();
            }
            false
        }
        _ => false,
    }
}

pub fn git_sync(rel_path: &str, msg_prefix: &str) {
    let root = git_root();
    let timestamp = get_timestamp();
    let host = get_hostname();
    let msg = format!("{}: {} updates from {} [{}]", msg_prefix, rel_path, host, timestamp);

    let _ = Command::new("git").current_dir(&root).args(["add", rel_path]).status();
    
    let has_changes = Command::new("git")
        .current_dir(&root)
        .args(["diff", "--cached", "--quiet"])
        .status()
        .map(|s| !s.success())
        .unwrap_or(false);

    if has_changes {
        println!("📝 Committing: {}", msg);
        let _ = Command::new("git").current_dir(&root).args(["commit", "-m", &msg]).status();
        println!("🚀 Pushing to origin...");
        let _ = Command::new("git").current_dir(&root).args(["push"]).status();
    } else {
        println!("ℹ️ No changes detected for {}.", rel_path);
    }
}
