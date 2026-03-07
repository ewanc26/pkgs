# Tangled Sync

**Tangled Sync** is a TypeScript project that automates the process of syncing GitHub repositories to Tangled and publishing ATProto records for each repository. It is designed to streamline your workflow if you want your GitHub projects mirrored on Tangled while also maintaining structured metadata in ATProto.

This tool is particularly useful for developers and organisations that want a decentralized or alternative hosting layer for their code repositories while keeping them discoverable via ATProto.

---

## Getting Started

### Configuration

Before running any scripts, you need to configure the project. Create a `src/.env` file based on `src/.env.example`:

```bash
cp src/.env.example src/.env
```

Then edit `src/.env` with your actual values:

* `BASE_DIR` – the local directory where GitHub repositories will be cloned.
* `GITHUB_USER` – your GitHub username or organisation.
* `ATPROTO_DID` – your ATProto DID (Decentralized Identifier).
* `BLUESKY_PDS` – the URL of your Bluesky PDS instance.
* `BLUESKY_USERNAME` – your Bluesky username.
* `BLUESKY_PASSWORD` – your Bluesky password.

Make sure this file is properly set up before proceeding.

---

### Installation

1. Clone this repository locally.
2. Navigate to the project directory.
3. Run:

```bash
npm install
```

This will install all dependencies required for syncing GitHub repositories and interacting with ATProto.

---

### Verify SSH Connection to Tangled

* If the Tangled remote does not exist for a repository, the script will attempt to create it on first run. This requires a working SSH key associated with your account.

Without proper SSH authentication, repository creation and pushing will fail.

---

### Testing AT Proto Connection

**Before running the full sync**, test your AT Proto connection:

```bash
npm run test-atproto
```

This will:
- Verify your Bluesky credentials
- Confirm your DID matches the configuration
- List any existing `sh.tangled.repo` records
- Validate the connection to the PDS

### Running the Sync Script

Once configuration, SSH verification, and AT Proto testing are complete, run:

```bash
npm run sync
```

What happens during the sync:

1. **Login to Bluesky:** The script authenticates using your credentials to allow publishing ATProto records.
2. **Clone GitHub Repositories:** All repositories under your configured GitHub user are cloned locally (excluding a repository with the same name as your username to avoid recursion).
3. **Ensure Tangled Remotes:** For each repository, a `tangled` remote is added if it doesn’t exist.
4. **Push to Tangled:** The script pushes the `main` branch to Tangled. If your `origin` remote’s push URL points to Tangled, it will reset it back to GitHub.
5. **Update README:** Each repository’s README is updated to include a link to its Tangled mirror, if it isn’t already present.
6. **Create ATProto Records:** Each repository gets a structured record published in ATProto under your DID, including metadata like description, creation date, and source URL.

---

### Notes & Best Practices

* **Directory Management:** The script ensures that your `BASE_DIR` exists and creates it if necessary.
* **Record Uniqueness:** ATProto records use a time-based, sortable ID (TID) to ensure uniqueness. Duplicate IDs are avoided automatically.
* **Error Handling:** If a repository cannot be pushed to Tangled, the script logs a warning but continues processing the remaining repositories.
* **Idempotency:** Running the script multiple times is safe; existing remotes and ATProto records are checked before creation to prevent duplicates.

---

### Example Workflow

```bash
# Run the sync script
npm run sync
```

After execution, you’ll see logs detailing which repositories were cloned, which remotes were added, which READMEs were updated, and which ATProto records were created.

This allows you to quickly confirm that all GitHub repositories have been mirrored and documented properly on Tangled.

---

### Contribution & Development

If you plan to contribute:

* Ensure Node.js v18+ and npm v9+ are installed.
* Test the script in a separate directory to avoid accidentally overwriting your production repositories.
* Use `console.log` statements to debug or track progress during development.
* Maintain proper `.env` configuration to avoid leaking credentials.

---

**Tangled Sync** bridges GitHub and Tangled efficiently, providing automatic mirroring, record management, and easy discoverability. Following these steps will ensure a smooth, automated workflow for syncing and publishing your repositories.

## ☕ Support

If you found this useful, consider [buying me a ko-fi](https://ko-fi.com/ewancroft)!
