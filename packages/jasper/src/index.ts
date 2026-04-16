#!/usr/bin/env node
/**
 * Jasper CLI Entry Point
 * Instagram → Grain Importer
 */
import {
  parseCliArgs,
  argsToImportOptions,
  getLogLevelFromArgs,
  printHelp,
  validateImportOptions,
} from "./lib/cli.js";
import chalk from "chalk";
import { log, setGlobalLogger, Logger } from "./utils/logger.js";
import * as ui from "./utils/ui.js";
import { prompt, confirm, select } from "./utils/input.js";
import {
  isZipFile,
  parseExport,
  loadMediaFromPath,
  loadMediaFromZip,
} from "./lib/parser.js";
import { validateImage } from "./lib/image-utils.js";
import {
  authenticate,
  loginWithOAuth,
  logout,
  listOAuthSessionsWithHandles,
} from "./lib/auth.js";
import { publishPhoto, getExistingPhotos, createGallery, createGalleryItem, getExistingGalleries } from "./lib/publisher.js";
import { config } from "./core/config.js";
import path from "path";
import fs from "fs";

/**
 * Run interactive mode
 */
async function runInteractive(): Promise<void> {
  ui.header("Jasper — Instagram → Grain Importer");

  const options = [
    "Import Instagram export",
    "Sign in with OAuth",
    "List stored sessions",
    "Sign out",
    "Exit",
  ];

  const choice = await select("What would you like to do?", options, 0);

  switch (choice) {
    case 0: {
      const inputPath = await prompt(
        "Path to Instagram export (ZIP or directory): ",
      );
      const dryRun = await confirm("Dry run (preview without posting)?", false);
      await runImport({
        input: inputPath,
        dryRun,
        reverse: false,
        yes: false,
        verbose: false,
        quiet: false,
      });
      break;
    }
    case 1: {
      await loginWithOAuth();
      break;
    }
    case 2: {
      const sessions = await listOAuthSessionsWithHandles();
      if (sessions.length === 0) {
        log.info("No stored sessions");
      } else {
        log.info("Stored sessions:");
        for (const { did, handle } of sessions) {
          log.raw(`  ${handle || did}`);
        }
      }
      break;
    }
    case 3: {
      const sessions = await listOAuthSessionsWithHandles();
      if (sessions.length === 0) {
        log.info("No stored sessions");
        return;
      }
      const did = await prompt("DID to sign out (or press Enter for first): ");
      const success = await logout(did || undefined);
      log.info(success ? "Signed out" : "Session not found");
      break;
    }
    case 4:
      log.info("Goodbye!");
      process.exit(0);
  }
}

/**
 * Run import workflow
 */
async function runImport(options: {
  input: string;
  dryRun: boolean;
  limit?: number;
  reverse: boolean;
  yes: boolean;
  verbose: boolean;
  quiet: boolean;
  handle?: string;
  password?: string;
}): Promise<void> {
  ui.header("Import Instagram Export");

  // Validate input
  const absolutePath = path.resolve(options.input);
  if (!fs.existsSync(absolutePath)) {
    log.error(`Path does not exist: ${absolutePath}`);
    process.exit(1);
  }

  // Parse export
  log.progress("Parsing Instagram export...");
  let posts = await parseExport(absolutePath);

  // Filter to image-only posts
  posts = posts.filter((p) => !p.skipped);

  // Sort by date (oldest first by default)
  if (options.reverse) {
    posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else {
    posts.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Apply limit
  if (options.limit && options.limit > 0) {
    posts = posts.slice(0, options.limit);
  }

  ui.succeedSpinner(`Found ${posts.length} posts`);
  log.blank();

  // Preview
  if (posts.length > 0) {
    log.info(
      `Posts range from ${posts[0].createdAt.toLocaleDateString()} to ${posts[posts.length - 1].createdAt.toLocaleDateString()}`,
    );
    log.blank();

    if (!options.yes) {
      const proceed = await confirm(`Import ${posts.length} posts?`);
      if (!proceed) {
        log.info("Cancelled");
        return;
      }
    }
  }

  if (options.dryRun) {
    log.blank();
    log.info(chalk.cyan("Dry run mode — no posts will be created"));
    log.blank();

    // Show first few posts
    const preview = posts.slice(0, 5);
    for (const post of preview) {
      log.raw(
        `  ${post.createdAt.toLocaleDateString()}: ${post.caption?.substring(0, 50) || "(no caption)"}${post.media.length > 1 ? ` (${post.media.length} photos)` : ""}`,
      );
    }
    if (posts.length > 5) {
      log.raw(`  ... and ${posts.length - 5} more`);
    }
    return;
  }

  // Authenticate
  log.progress("Authenticating...");
  const agent = await authenticate(options.handle, options.password);

  if (!agent.did) {
    log.error("Authentication failed");
    process.exit(1);
  }

  ui.succeedSpinner("Logged in");
  log.blank();

  // Get existing posts for deduplication
  log.progress("Checking for existing photos...");
  const existing = await getExistingPhotos(agent);
  ui.succeedSpinner(`Found ${existing.size} existing photos`);
  log.blank();

  // Gallery selection/creation
  let galleryUri: string | undefined;

  if (!options.dryRun) {
    log.progress("Fetching your galleries...");
    const existingGalleries = await getExistingGalleries(agent);
    ui.succeedSpinner(`Found ${existingGalleries.length} galleries`);
    log.blank();

    const galleryOptions = [
      "Create new gallery",
      ...existingGalleries.map(g => `${g.title} (${new Date(g.createdAt).toLocaleDateString()})`),
    ];

    const choice = await select("Select gallery for import:", galleryOptions, 0);

    if (choice === 0) {
      // Create new gallery
      const defaultTitle = `Instagram Import — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      log.info(`Default title: ${defaultTitle}`);
      const titleInput = await prompt(`Gallery title (press Enter for default): `);
      const title = titleInput || defaultTitle;
      const addDescription = await confirm("Add description?", false);
      const description = addDescription ? await prompt("Description: ") : undefined;

      log.progress("Creating gallery...");
      const result = await createGallery(agent, title || defaultTitle, description);
      if (result.success && result.uri) {
        galleryUri = result.uri;
        ui.succeedSpinner(`Created gallery: ${title || defaultTitle}`);
      } else {
        log.error(`Failed to create gallery: ${result.error}`);
        process.exit(1);
      }
    } else {
      // Use existing gallery
      galleryUri = existingGalleries[choice - 1]?.uri;
      if (!galleryUri) {
        log.error("Invalid gallery selection");
        process.exit(1);
      }
      log.info(`Using gallery: ${existingGalleries[choice - 1]?.title}`);
    }
    log.blank();
  }

  // Import posts
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let galleryPosition = 0;

  const isZip = isZipFile(absolutePath);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const timestamp = post.createdAt.toISOString();

    // Skip if already exists
    if (existing.has(timestamp)) {
      skipped++;
      log.debug(`Skipping duplicate: ${timestamp}`);
      continue;
    }

    ui.startSpinner(
      `[${i + 1}/${posts.length}] ${post.createdAt.toLocaleDateString()}`,
    );

    for (const media of post.media) {
      if (media.type === "video") {
        skipped++;
        continue;
      }

      try {
        // Load image
        const imageData = isZip
          ? await loadMediaFromZip(absolutePath, media.originalUri)
          : await loadMediaFromPath(media.path);

        // Validate
        const validation = await validateImage(imageData);
        if (!validation.valid) {
          failed++;
          log.warn(`Invalid image: ${validation.error}`);
          continue;
        }

        // Publish photo
        const imageUtils = await import("./lib/image-utils.js");
        const dims = await imageUtils.getImageDimensions(imageData);
        const aspectRatio = imageUtils.calculateAspectRatio(
          dims.width,
          dims.height,
        );

        const result = await publishPhoto(
          agent,
          imageData,
          aspectRatio,
          timestamp,
          post.caption,
          options.dryRun,
        );

        if (result.success) {
          imported++;

          // Create gallery item linking photo to gallery
          if (galleryUri && result.uri) {
            const itemResult = await createGalleryItem(
              agent,
              galleryUri,
              result.uri,
              galleryPosition,
              timestamp,
              options.dryRun,
            );
            if (itemResult.success) {
              galleryPosition++;
            } else {
              log.warn(`Failed to create gallery item: ${itemResult.error}`);
            }
          }
        } else {
          failed++;
          log.warn(`Failed to publish: ${result.error}`);
        }
      } catch (error) {
        failed++;
        log.error(`Error processing media: ${(error as Error).message}`);
      }
    }

    ui.succeedSpinner();

    // Rate limit delay
    if (i < posts.length - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, config.DEFAULT_UPLOAD_DELAY),
      );
    }
  }

  // Summary
  log.blank();
  ui.header("Import Complete");
  log.info(`Total: ${posts.length}`);
  log.success(`Imported: ${imported}`);
  if (skipped > 0) log.info(`Skipped (duplicates/videos): ${skipped}`);
  if (failed > 0) log.error(`Failed: ${failed}`);
}

/**
 * Main entry point
 */
export async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));

  // Handle help and version
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Set up logging
  const logger = new Logger(getLogLevelFromArgs(args));
  setGlobalLogger(logger);

  // Handle OAuth login
  if (args.oauthLogin) {
    await loginWithOAuth();
    return;
  }

  // Handle logout
  if (args.logout !== undefined) {
    const did = args.logout as string | undefined;
    const success = await logout(did);
    log.info(success ? "Logged out" : "Session not found");
    return;
  }

  // Handle list sessions
  if (args.listSessions) {
    const sessions = await listOAuthSessionsWithHandles();
    if (sessions.length === 0) {
      log.info("No stored sessions");
    } else {
      log.info("Stored OAuth sessions:");
      for (const { did, handle } of sessions) {
        log.raw(`  ${handle || did}`);
      }
    }
    return;
  }

  // Handle import (with input)
  if (args.input) {
    const options = argsToImportOptions(args);
    const error = validateImportOptions(options);
    if (error) {
      log.error(error);
      process.exit(1);
    }

    await runImport({
      ...options,
      handle: args.handle,
      password: args.password,
    });
    return;
  }

  // No input provided — run interactive mode
  await runInteractive();
}

// Run CLI
main().catch((error) => {
  log.fatal(error.message);
  process.exit(1);
});
