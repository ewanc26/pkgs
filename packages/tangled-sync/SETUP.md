# Tangled Sync - Setup & Troubleshooting Guide

## Quick Setup Checklist

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
# Copy the example env file
cp src/.env.example src/.env

# Edit with your actual values
nano src/.env  # or use your preferred editor
```

**Required values:**
- `BASE_DIR`: Where to clone repos (e.g., `/Users/you/tangled-repos`)
- `GITHUB_USER`: Your GitHub username
- `ATPROTO_DID`: Your AT Proto DID (get from Bluesky settings)
- `BLUESKY_PDS`: Usually `https://bsky.social`
- `BLUESKY_USERNAME`: Your Bluesky handle (e.g., `you.bsky.social`)
- `BLUESKY_PASSWORD`: Use an **app password**, not your main password!

### 3. Get Your AT Proto DID

Your DID can be found by:
1. Go to https://bsky.app
2. Click your profile
3. Settings → Advanced → Account
4. Look for "DID" (starts with `did:plc:`)

Alternatively, visit: `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=YOUR_HANDLE.bsky.social`

### 4. Create an App Password

**IMPORTANT:** Do NOT use your main Bluesky password!

1. Go to https://bsky.app/settings
2. Navigate to "App Passwords"
3. Click "Add App Password"
4. Give it a name (e.g., "Tangled Sync")
5. Copy the generated password to your `.env` file

### 5. Test AT Proto Connection
```bash
npm run test-atproto
```

Expected output:
```
✓ Login successful!
  DID: did:plc:...
  Handle: you.bsky.social
  Email: your@email.com

✓ Found X existing Tangled repo records
```

### 6. Verify SSH to Tangled
```bash
ssh git@tangled.sh
```

You should see a message confirming your SSH key is configured.

### 7. Run the Sync
```bash
npm run sync
```

---

## Common Issues & Solutions

### Issue: "Missing Bluesky credentials"
**Solution:** Check that `src/.env` exists and contains `BLUESKY_USERNAME` and `BLUESKY_PASSWORD`

### Issue: "Login failed" or "Invalid credentials"
**Solution:** 
- Ensure you're using an **app password**, not your main password
- Check your username includes the full handle (e.g., `you.bsky.social`)
- Verify credentials are correct

### Issue: "DID mismatch"
**Solution:** 
- Run `npm run test-atproto` to see your actual DID
- Update `ATPROTO_DID` in `src/.env` to match

### Issue: "Could not push to Tangled"
**Solution:**
- Verify SSH key is added to Tangled: https://tangled.org/settings/keys
- Test SSH connection: `ssh git@tangled.sh`
- Ensure the repository exists on Tangled first

### Issue: "Failed to create ATProto record"
**Solution:**
- Check that the schema matches (required fields: `name`, `knot`, `createdAt`)
- Verify your app password has write permissions
- Check PDS is reachable: `curl https://bsky.social`

### Issue: Rate limiting from GitHub API
**Solution:**
- GitHub has a rate limit of 60 requests/hour for unauthenticated requests
- Consider adding GitHub authentication if syncing many repos
- Wait an hour and try again

---

## Understanding the Workflow

1. **Login to AT Proto**: Authenticates with Bluesky PDS using your credentials
2. **Fetch GitHub Repos**: Retrieves all public repos from your GitHub account
3. **Clone Locally**: Downloads repos to `BASE_DIR` if not already present
4. **Add Tangled Remote**: Adds `tangled` as a git remote
5. **Push to Tangled**: Pushes the `main` branch to Tangled
6. **Update README**: Adds a Tangled mirror link to the README
7. **Create AT Proto Record**: Publishes metadata to the AT Proto network

Each repository gets a record in the `sh.tangled.repo` collection with:
- Repository name and description
- Source URL (GitHub)
- Creation timestamp
- Knot server reference
- Optional labels and topics

---

## Verifying Success

After running the sync, you can verify:

1. **Local repos**: Check `BASE_DIR` for cloned repositories
2. **Tangled remotes**: Run `git remote -v` in any repo directory
3. **AT Proto records**: Run `npm run test-atproto` to list records
4. **Tangled website**: Visit `https://tangled.org/YOUR_DID/REPO_NAME`

---

## Advanced Configuration

### Using a Different PDS
If you're not using the default Bluesky PDS:
```bash
BLUESKY_PDS=https://your-pds.example.com
```

### Syncing Specific Repos Only
Modify the `getGitHubRepos()` function to filter repos:
```typescript
return json
  .filter((r: any) => r.name.startsWith('my-prefix-'))
  .map(...);
```

### Changing the Default Branch
If your repos use `master` instead of `main`, update:
```typescript
run(`git push tangled master`, repoDir);
```

---

## Support

For issues with:
- **Tangled**: https://github.com/tangled-dev/tangled
- **AT Proto**: https://atproto.com/docs
- **This tool**: Open an issue in the repository

---

**Happy syncing! 🚀**
