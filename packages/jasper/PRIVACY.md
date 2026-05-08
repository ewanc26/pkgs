# Jasper Privacy Policy

**Last updated:** April 2026

## Summary

Jasper processes your Instagram export data **entirely on your local machine**. No data is sent to any third-party server except your chosen Grain account.

---

## Data Handling

### What Jasper Does With Your Data

1. **Reads** your Instagram export ZIP file or directory
2. **Extracts** photo files and metadata (captions, timestamps)
3. **Uploads** photos to your Grain account
4. **Creates** photo records with your original timestamps

### What Jasper Does NOT Do

- Send data to any third-party servers
- Store or transmit your Instagram data elsewhere
- Share your data with anyone

---

## Local Processing

All processing happens on your computer:

- **Parsing** — Instagram export is read and parsed locally
- **Image processing** — Photos are resized/converted locally using Sharp
- **Deduplication** — Existing posts are checked against your Grain account only

Your Instagram export files are never modified. They remain exactly as downloaded from Instagram.

---

## Data Storage

Jasper stores the following on your local machine:

| Location                   | Content              | Purpose                    |
| -------------------------- | -------------------- | -------------------------- |
| `~/.jasper/oauth.json`     | OAuth session tokens | Persistent login           |
| `~/.jasper/oauth-state/`   | OAuth state cache    | Authentication flow        |
| `~/.jasper/oauth-session/` | OAuth session data   | Authentication flow        |
| `~/.jasper/logs/`          | Debug log files      | Troubleshooting (optional) |

### File Permissions

Files in `~/.jasper/` are created with user-only permissions (mode `0600` for files, `0700` for directories) where supported.

### Deleting Stored Data

To remove all stored data:

```bash
rm -rf ~/.jasper
```

Or use the CLI:

```bash
jasper --logout  # Remove OAuth session
```

---

## Authentication

### OAuth (Recommended)

When you sign in via OAuth:

1. Your browser opens to your PDS (e.g., bsky.app)
2. You approve the login request
3. A session token is stored locally
4. No passwords are stored

The session token allows Jasper to post to your account without needing your password.

### App Password

If you use an app password:

- The password is **not stored** by default
- It's used only during the current session
- On subsequent runs, use OAuth instead

---

## What Gets Uploaded

When you import posts, Jasper uploads to your Grain account:

- **Photo images** — Resized if over 1MB
- **Timestamp** — Original creation date from Instagram
- **Caption** — Post caption (as alt text)

This data becomes part of your public AT Protocol data repository and is subject to Grain's privacy policy.

---

## Your Responsibilities

By using Jasper, you agree to:

1. **Own the content** — Ensure you have the right to post your Instagram photos
2. **Respect copyright** — Photos containing third-party content may require permission
3. **Comply with terms** — Follow Grain's terms of service

---

## Children's Privacy

Jasper is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.

---

## Security

### Recommendations

- Keep your Instagram export private — it contains personal data
- Delete your export after importing
- Use OAuth instead of app passwords
- Review imported posts on Grain after importing

### Reporting Issues

If you discover a security vulnerability, please report it via [GitHub Issues](https://github.com/ewanc26/pkgs/issues).

---

## Changes to This Policy

This policy may be updated. The "Last updated" date at the top indicates the most recent change.

---

## Contact

For privacy concerns:

- **GitHub Issues:** https://github.com/ewanc26/pkgs/issues
- **Project:** https://github.com/ewanc26/pkgs/tree/main/packages/jasper

---

## Open Source

Jasper is open source software. You can audit the code:

- **Repository:** https://github.com/ewanc26/pkgs
- **Package:** `packages/jasper/`
- **License:** AGPL-3.0-only
