#!/usr/bin/env python3

import subprocess
import re
import argparse
import json
from collections import defaultdict, Counter

IMPACT_THRESHOLD = 800
FILE_THRESHOLD = 15


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()


def get_tags():
    tags = run(["git", "tag", "--sort=creatordate"]).splitlines()
    return [t for t in tags if t.strip()]


def get_log(range_spec=None, path=None):
    cmd = [
        "git", "log",
        "--reverse",
        "-p",
        "--pretty=format:<<<COMMIT>>>%n%H%n%an%n%aI%n%B%n<<<END>>>"
    ]

    if range_spec:
        cmd.insert(2, range_spec)

    if path:
        cmd.extend(["--", path])

    return run(cmd)


def classify(message):
    msg = message.lower()
    if "fix" in msg:
        return "fix"
    if "refactor" in msg:
        return "refactor"
    if "feat" in msg or "feature" in msg:
        return "feature"
    if "doc" in msg:
        return "docs"
    return "chore"


def extract_stats(diff):
    added = len(re.findall(r'^\+(?!\+\+)', diff, re.MULTILINE))
    removed = len(re.findall(r'^\-(?!\-\-)', diff, re.MULTILINE))
    files = re.findall(r'^diff --git a/([^ ]+) b/([^ \n]+)', diff, re.MULTILINE)
    file_list = list(set(f[1] for f in files))
    impact = added + removed
    return added, removed, file_list, impact


def parse_commits(raw):
    commits = []
    blocks = raw.split("<<<COMMIT>>>")[1:]

    for block in blocks:
        meta, diff = block.split("<<<END>>>", 1)
        lines = meta.strip().splitlines()

        if len(lines) < 3:
            continue

        commit_hash = lines[0]
        author = lines[1]
        date = lines[2]
        message = "\n".join(lines[3:]).strip()

        added, removed, files, impact = extract_stats(diff)
        ctype = classify(message)

        commits.append({
            "hash": commit_hash,
            "author": author,
            "date": date,
            "message": message,
            "files_changed": files,
            "lines_added": added,
            "lines_removed": removed,
            "impact": impact,
            "type": ctype,
            "risk": impact > IMPACT_THRESHOLD or len(files) > FILE_THRESHOLD
        })

    return commits


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", help="Limit to a specific folder/file")
    args = parser.parse_args()

    tags = get_tags()
    releases = defaultdict(list)

    if tags:
        previous = None
        for tag in tags:
            range_spec = f"{previous}..{tag}" if previous else tag
            raw = get_log(range_spec=range_spec, path=args.path)
            releases[tag] = parse_commits(raw)
            previous = tag

        raw = get_log(range_spec=f"{previous}..HEAD", path=args.path)
        releases["unreleased"] = parse_commits(raw)

    else:
        raw = get_log(path=args.path)
        releases["full_history"] = parse_commits(raw)

    summary_output = []
    summary_output.append("# Repository Internal Summary\n")

    all_commits_flat = []

    for release, commits in releases.items():
        if not commits:
            continue

        all_commits_flat.extend(commits)

        total_added = sum(c["lines_added"] for c in commits)
        total_removed = sum(c["lines_removed"] for c in commits)
        types = Counter(c["type"] for c in commits)
        top = sorted(commits, key=lambda x: x["impact"], reverse=True)[:5]

        summary_output.append(f"## {release}")
        summary_output.append(f"- Commits: {len(commits)}")
        summary_output.append(f"- Lines added: {total_added}")
        summary_output.append(f"- Lines removed: {total_removed}")
        summary_output.append("")

        summary_output.append("### Type Breakdown")
        for t, count in types.items():
            summary_output.append(f"- {t}: {count}")
        summary_output.append("")

        summary_output.append("### Top Impact Commits")
        for c in top:
            summary_output.append(
                f"- {c['message'].splitlines()[0]} "
                f"(+{c['lines_added']}/-{c['lines_removed']}, "
                f"{len(c['files_changed'])} files)"
            )
        summary_output.append("")

    with open("repo_internal_summary.md", "w", encoding="utf-8") as f:
        f.write("\n".join(summary_output))

    with open("repo_internal_summary.json", "w", encoding="utf-8") as f:
        json.dump(releases, f, indent=2)

    print("Generated:")
    print("  - repo_internal_summary.md")
    print("  - repo_internal_summary.json")


if __name__ == "__main__":
    main()