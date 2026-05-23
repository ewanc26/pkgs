#!/usr/bin/env node
/**
 * Jasper CLI Entry Point
 * Instagram → AT Protocol Importer (Grain, Spark)
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
import { getExistingPhotos, getExistingGalleries } from "./lib/publisher.js";
import {
  getExistingSparkPosts,
  publishSparkPost,
} from "./lib/spark-publisher.js";
import {
  publishSparkStory,
  getExistingSparkStories,
} from "./lib/spark-story-publisher.js";
import {
  uploadSparkVideo,
  publishSparkVideoPost,
} from "./lib/spark-video-publisher.js";
import { RateLimitedPublisher } from "./lib/rate-limited-publisher.js";
import { config, DEFAULT_DAILY_LIMIT, TARGET_CONFIGS } from "./core/config.js";
import type {
  ImportState,
  ParsedPost,
  Target,
  SparkAspectRatio,
} from "./core/types.js";
import {
  saveImportState,
  loadImportState,
  listImportStates,
  clearAllImportStates,
  createImportState,
  verifyExportHash,
  isDailyLimitReached,
  updateForNewDay,
  getRemainingPosts,
  formatImportStateSummary,
  hashExportContents,
} from "./lib/import-state.js";
import path from "path";
import fs from "fs";

/**
 * Run interactive mode
 */
async function runInteractive(): Promise<void> {
  ui.header("Jasper — Instagram → AT Protocol Importer");

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
      const targetChoice = await select(
        "Import to:",
        ["Grain (social.grain.photo)", "Spark (so.sprk.feed.post)"],
        0,
      );
      const target: Target = targetChoice === 1 ? "spark" : "grain";
      const dryRun = await confirm("Dry run (preview without posting)?", false);
      await runImport({
        input: inputPath,
        dryRun,
        reverse: false,
        yes: false,
        verbose: false,
        quiet: false,
        target,
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
  alt?: string;
  target: Target;
  handle?: string;
  password?: string;
  dailyLimit?: number;
  resume?: boolean;
}): Promise<void> {
  const targetConfig = TARGET_CONFIGS[options.target];
  ui.header(
    `Import Instagram Export → ${options.target === "spark" ? "Spark" : "Grain"}`,
  );

  const dailyLimit = options.dailyLimit ?? DEFAULT_DAILY_LIMIT;

  // Validate input
  const absolutePath = path.resolve(options.input);
  if (!fs.existsSync(absolutePath)) {
    log.error(`Path does not exist: ${absolutePath}`);
    process.exit(1);
  }

  // Check for existing import state
  let importState: ImportState | null = null;

  if (options.resume) {
    importState = await loadImportState(absolutePath);
    if (!importState) {
      log.error("No saved import state found for this export.");
      log.info("Start a new import without --resume first.");
      process.exit(1);
    }

    // Verify export hasn't changed
    log.progress("Verifying export file...");
    const hashValid = await verifyExportHash(importState);
    if (!hashValid) {
      log.error("Export file has changed since last import session.");
      log.info("Start a new import to reset the state.");
      process.exit(1);
    }
    ui.succeedSpinner("Export verified");
    log.blank();

    log.info("Resuming previous import:");
    log.raw(formatImportStateSummary(importState));
    log.blank();
  } else {
    // Check for existing state (offer to resume)
    const existingState = await loadImportState(absolutePath);
    if (existingState && !options.yes) {
      log.info("Found previous import session:");
      log.raw(formatImportStateSummary(existingState));
      log.blank();
      const resumeChoice = await confirm("Resume this import?", true);
      if (resumeChoice) {
        importState = existingState;
        // Verify hash
        const hashValid = await verifyExportHash(importState);
        if (!hashValid) {
          log.warn("Export file has changed. Starting fresh.");
          importState = null;
        } else if (importState) {
          // Check if new day - reset daily counter
          if (new Date() >= new Date(importState.dailyResetAt)) {
            importState = updateForNewDay(importState);
          }
        }
      }
    }
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

  // Filter out already imported posts if resuming
  if (importState) {
    const importedSet = new Set([
      ...importState.importedTimestamps,
      ...importState.skippedTimestamps,
    ]);
    posts = posts.filter((p) => !importedSet.has(p.createdAt.toISOString()));
    log.info(`${posts.length} posts remaining to import`);
    log.blank();
  }

  // Check daily limit
  if (importState && isDailyLimitReached(importState, dailyLimit)) {
    log.warn("Daily limit reached for this import session.");
    log.info(`Limit: ${dailyLimit} posts per day`);
    log.info(`Imported today: ${importState.dailyImported}`);
    log.info(
      `Resets at: ${new Date(importState.dailyResetAt).toLocaleString()}`,
    );
    log.blank();
    log.info("Run `jasper --resume` tomorrow to continue.");
    return;
  }

  // Calculate how many we can import today
  const alreadyImportedToday = importState?.dailyImported ?? 0;
  const canImportToday = dailyLimit - alreadyImportedToday;
  const postsToImport = Math.min(posts.length, canImportToday);

  // Preview
  if (posts.length > 0) {
    log.info(
      `Posts range from ${posts[0].createdAt.toLocaleDateString()} to ${posts[posts.length - 1].createdAt.toLocaleDateString()}`,
    );
    log.blank();

    if (posts.length > canImportToday) {
      log.info(chalk.cyan(`Daily limit: ${canImportToday} posts today`));
      log.info(
        `Total remaining: ${posts.length} posts (${Math.ceil(posts.length / dailyLimit)} days)`,
      );
      log.blank();
    }

    if (!options.yes) {
      const proceed = await confirm(`Import ${postsToImport} posts?`);
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
  log.progress(
    `Checking for existing ${options.target === "spark" ? "Spark posts" : "photos"}...`,
  );
  const existing =
    options.target === "spark"
      ? await getExistingSparkPosts(agent)
      : await getExistingPhotos(agent);
  const existingStories =
    options.target === "spark"
      ? await getExistingSparkStories(agent)
      : new Set<string>();
  ui.succeedSpinner(
    `Found ${existing.size} existing ${options.target === "spark" ? "posts" : "photos"}${existingStories.size > 0 ? `, ${existingStories.size} stories` : ""}`,
  );
  log.blank();

  // Gallery selection/creation (Grain only)
  let galleryUri: string | undefined;
  let galleryTitle: string | undefined;

  // Create rate-limited publisher
  const publisher = new RateLimitedPublisher(agent, options.dryRun);

  if (options.target === "grain") {
    // Resume: use existing gallery
    if (importState?.galleryUri) {
      galleryUri = importState.galleryUri;
      galleryTitle = importState.galleryTitle;
      log.info(`Using gallery: ${galleryTitle}`);
      log.blank();
    } else if (!options.dryRun) {
      log.progress("Fetching your galleries...");
      const existingGalleries = await getExistingGalleries(agent);
      ui.succeedSpinner(`Found ${existingGalleries.length} galleries`);
      log.blank();

      const galleryOptions = [
        "Create new gallery",
        ...existingGalleries.map(
          (g) => `${g.title} (${new Date(g.createdAt).toLocaleDateString()})`,
        ),
      ];

      const choice = await select(
        "Select gallery for import:",
        galleryOptions,
        0,
      );

      if (choice === 0) {
        // Create new gallery
        const defaultTitle = `Instagram Import — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
        log.info(`Default title: ${defaultTitle}`);
        const titleInput = await prompt(
          `Gallery title (press Enter for default): `,
        );
        const title = titleInput || defaultTitle;
        const addDescription = await confirm("Add description?", false);
        const description = addDescription
          ? await prompt("Description: ")
          : undefined;

        log.progress("Creating gallery...");
        const result = await publisher.createGallery(
          title || defaultTitle,
          description,
        );
        if (result.success && result.uri) {
          galleryUri = result.uri;
          galleryTitle = title || defaultTitle;
          ui.succeedSpinner(`Created gallery: ${galleryTitle}`);
        } else {
          log.error(`Failed to create gallery: ${result.error}`);
          process.exit(1);
        }
      } else {
        // Use existing gallery
        galleryUri = existingGalleries[choice - 1]?.uri;
        galleryTitle = existingGalleries[choice - 1]?.title;
        if (!galleryUri) {
          log.error("Invalid gallery selection");
          process.exit(1);
        }
        log.info(`Using gallery: ${galleryTitle}`);
      }
      log.blank();
    }
  }

  // Create import state if new
  if (!importState) {
    const exportHash = await hashExportContents(absolutePath);
    importState = createImportState(
      absolutePath,
      exportHash,
      options.target,
      galleryUri || "",
      galleryTitle || "",
      posts.length,
      dailyLimit,
    );
    await saveImportState(importState);
  }

  // Alt text handling
  const getAltText = (post: { caption?: string }): string => {
    if (options.alt) return options.alt;
    return post.caption || "";
  };

  // Import posts
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let galleryPosition = importState?.importedTimestamps.length ?? 0;

  const isZip = isZipFile(absolutePath);

  // Track progress for state updates
  const trackProgress = async (
    post: ParsedPost,
    status: "imported" | "skipped" | "failed",
  ) => {
    if (!importState) return;

    const timestamp = post.createdAt.toISOString();
    if (status === "imported") {
      importState.importedTimestamps.push(timestamp);
      importState.dailyImported++;
      importState.lastImportAt = new Date().toISOString();
    } else if (status === "skipped") {
      importState.skippedTimestamps.push(timestamp);
    } else {
      importState.failedTimestamps.push(timestamp);
    }

    // Save state periodically (every 10 posts)
    if (importState.importedTimestamps.length % 10 === 0) {
      await saveImportState(importState);
    }
  };

  for (let i = 0; i < postsToImport; i++) {
    const post = posts[i];
    const timestamp = post.createdAt.toISOString();

    // Skip if already exists
    if (existing.has(timestamp)) {
      skipped++;
      await trackProgress(post, "skipped");
      log.debug(`Skipping duplicate: ${timestamp}`);
      continue;
    }

    ui.startSpinner(
      `[${i + 1}/${postsToImport}] ${post.createdAt.toLocaleDateString()}`,
    );

    if (options.target === "spark") {
      // Spark: handle stories, videos, and image posts
      const isStory = post.isStory ?? false;
      const dedupSet = isStory ? existingStories : existing;

      // Check dedup for this specific type
      if (dedupSet.has(timestamp)) {
        skipped++;
        await trackProgress(post, "skipped");
        log.debug(
          `Skipping duplicate ${isStory ? "story" : "post"}: ${timestamp}`,
        );
        continue;
      }

      // Separate media into images and videos
      const imageItems: Array<{
        data: Uint8Array;
        mimeType: string;
        size: number;
        alt: string;
        aspectRatio?: SparkAspectRatio;
      }> = [];

      let videoMedia: { path: string; originalUri: string } | null = null;

      for (const media of post.media) {
        if (media.type === "video") {
          // Use the first video as the primary media
          if (!videoMedia) {
            videoMedia = { path: media.path, originalUri: media.originalUri };
          }
          continue;
        }

        try {
          const imageData = isZip
            ? await loadMediaFromZip(absolutePath, media.originalUri)
            : await loadMediaFromPath(media.path);

          const validation = await validateImage(imageData);
          if (!validation.valid) {
            log.warn(`Invalid image: ${validation.error}`);
            continue;
          }

          const imageUtils = await import("./lib/image-utils.js");
          const dims = await imageUtils.getImageDimensions(imageData);
          const aspectRatio = imageUtils.calculateAspectRatio(
            dims.width,
            dims.height,
          );

          imageItems.push({
            data: imageData,
            mimeType: await imageUtils.getMimeType(imageData),
            size: imageData.length,
            alt: getAltText(post),
            aspectRatio,
          });
        } catch (error) {
          log.warn(`Error loading image: ${(error as Error).message}`);
        }
      }

      // Video post: upload video and create post with so.sprk.media.video
      if (videoMedia) {
        try {
          const videoData = isZip
            ? await loadMediaFromZip(absolutePath, videoMedia.originalUri)
            : await loadMediaFromPath(videoMedia.path);

          const uploadResult = await uploadSparkVideo(
            agent,
            new Uint8Array(videoData),
            "video/mp4",
          );

          if (!uploadResult.success || !uploadResult.blob) {
            failed++;
            await trackProgress(post, "failed");
            log.warn(`Failed to upload video: ${uploadResult.error}`);
            continue;
          }

          // Get video dimensions for aspect ratio
          const imageUtils = await import("./lib/image-utils.js");
          const dims = await imageUtils.getVideoDimensions(videoData);
          const aspectRatio = imageUtils.calculateAspectRatio(
            dims.width,
            dims.height,
          );

          if (isStory) {
            // Story with video
            const { publishSparkVideoStory } =
              await import("./lib/spark-story-publisher.js");
            const result = await publishSparkVideoStory(
              agent,
              uploadResult.blob,
              getAltText(post),
              aspectRatio,
              timestamp,
              options.dryRun,
            );

            if (result.success) {
              imported++;
              await trackProgress(post, "imported");
            } else {
              failed++;
              await trackProgress(post, "failed");
              log.warn(`Failed to publish video story: ${result.error}`);
            }
          } else {
            // Regular post with video
            const result = await publishSparkVideoPost(
              agent,
              uploadResult.blob,
              getAltText(post),
              aspectRatio,
              timestamp,
              post.caption,
              options.dryRun,
            );

            if (result.success) {
              imported++;
              await trackProgress(post, "imported");
            } else {
              failed++;
              await trackProgress(post, "failed");
              log.warn(`Failed to publish video post: ${result.error}`);
            }
          }
        } catch (error) {
          failed++;
          await trackProgress(post, "failed");
          log.error(`Error processing video: ${(error as Error).message}`);
        }
      } else if (imageItems.length > 0) {
        // Image-only post/story
        const imagesToPublish = imageItems.slice(
          0,
          targetConfig.maxImagesPerPost,
        );

        try {
          if (isStory) {
            const result = await publishSparkStory(
              agent,
              imagesToPublish,
              timestamp,
              options.dryRun,
            );

            if (result.success) {
              imported++;
              await trackProgress(post, "imported");
            } else {
              failed++;
              await trackProgress(post, "failed");
              log.warn(`Failed to publish story: ${result.error}`);
            }
          } else {
            const result = await publishSparkPost(
              agent,
              imagesToPublish,
              timestamp,
              post.caption,
              options.dryRun,
            );

            if (result.success) {
              imported++;
              await trackProgress(post, "imported");
            } else {
              failed++;
              await trackProgress(post, "failed");
              log.warn(`Failed to publish: ${result.error}`);
            }
          }
        } catch (error) {
          failed++;
          await trackProgress(post, "failed");
          log.error(
            `Error publishing Spark ${isStory ? "story" : "post"}: ${(error as Error).message}`,
          );
        }
      } else {
        // No usable media
        failed++;
        await trackProgress(post, "failed");
      }
    } else {
      // Grain: one photo per record, gallery items
      // Skip stories (Grain doesn't support them)
      if (post.isStory) {
        skipped++;
        await trackProgress(post, "skipped");
        log.debug(
          `Skipping story (Grain does not support stories): ${timestamp}`,
        );
        continue;
      }
      for (const media of post.media) {
        if (media.type === "video") {
          skipped++;
          await trackProgress(post, "skipped");
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
            await trackProgress(post, "failed");
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

          const altText = getAltText(post) || undefined;
          const result = await publisher.publishPhoto(
            imageData,
            aspectRatio,
            timestamp,
            altText,
          );

          if (result.success) {
            imported++;
            await trackProgress(post, "imported");

            // Create gallery item linking photo to gallery
            if (galleryUri && result.uri) {
              const itemResult = await publisher.createGalleryItem(
                galleryUri,
                result.uri,
                galleryPosition,
                timestamp,
              );
              if (itemResult.success) {
                galleryPosition++;
              } else {
                log.warn(`Failed to create gallery item: ${itemResult.error}`);
              }
            }
          } else {
            failed++;
            await trackProgress(post, "failed");
            log.warn(`Failed to publish: ${result.error}`);
          }
        } catch (error) {
          failed++;
          await trackProgress(post, "failed");
          log.error(`Error processing media: ${(error as Error).message}`);
        }
      }
    }

    ui.succeedSpinner();

    // Rate limit delay
    if (i < postsToImport - 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, config.DEFAULT_UPLOAD_DELAY),
      );
    }
  }

  // Final state save
  if (importState) {
    await saveImportState(importState);
  }

  // Summary
  log.blank();
  ui.header("Import Complete");
  log.info(`Total: ${postsToImport}`);
  log.success(`Imported: ${imported}`);
  if (skipped > 0) log.info(`Skipped (duplicates/videos): ${skipped}`);
  if (failed > 0) log.error(`Failed: ${failed}`);

  if (!options.dryRun && imported > 0) {
    try {
      await agent.com.atproto.repo.createRecord({
        repo: agent.did!,
        collection: 'click.croft.toolkit.use',
        record: {
          $type: 'click.croft.toolkit.use',
          tool: {
            $type: 'click.croft.tools.jasper',
            recordsImported: imported,
          },
          createdAt: new Date().toISOString()
        }
      });
    } catch (err) {
      log.warn(`Failed to log toolkit usage: ${(err as Error).message}`);
    }
  }

  // Show remaining if daily limit was hit
  if (importState) {
    const remaining = getRemainingPosts(importState);
    if (remaining > 0) {
      log.blank();
      log.info(chalk.cyan(`Remaining: ${remaining} posts`));
      log.info(`Run \`jasper --resume\` tomorrow to continue.`);
    }
  }
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

  // Handle list imports
  if (args.listImports) {
    const states = await listImportStates();
    if (states.length === 0) {
      log.info("No pending import sessions");
    } else {
      log.info("Pending import sessions:");
      log.blank();
      for (const state of states) {
        log.raw(formatImportStateSummary(state));
        log.blank();
      }
    }
    return;
  }

  // Handle clear imports
  if (args.clearImports) {
    const cleared = await clearAllImportStates();
    if (cleared === 0) {
      log.info("No import sessions to clear");
    } else {
      log.info(`Cleared ${cleared} import session(s)`);
    }
    return;
  }

  // Handle resume without input
  if (args.resume && !args.input) {
    const states = await listImportStates();
    if (states.length === 0) {
      log.error("No pending import sessions to resume.");
      log.info("Start a new import with: jasper -i <export>");
      process.exit(1);
    }

    if (states.length === 1) {
      // Auto-resume single session
      log.info("Resuming single pending import...");
      await runImport({
        input: states[0].exportPath,
        dryRun: false,
        reverse: false,
        yes: false,
        verbose: args.verbose ?? false,
        quiet: args.quiet ?? false,
        resume: true,
        dailyLimit: args.dailyLimit,
        handle: args.handle,
        password: args.password,
        target: args.target || "grain",
      });
      return;
    }

    // Multiple sessions - let user choose
    log.info("Multiple pending imports:");
    log.blank();
    for (let i = 0; i < states.length; i++) {
      log.raw(
        `  [${i + 1}] ${path.basename(states[i].exportPath)} — ${getRemainingPosts(states[i])} remaining`,
      );
    }
    log.blank();

    const choice = await prompt("Which import to resume? (number): ");
    const index = parseInt(choice, 10) - 1;
    if (index < 0 || index >= states.length) {
      log.error("Invalid selection");
      process.exit(1);
    }

    await runImport({
      input: states[index].exportPath,
      dryRun: false,
      reverse: false,
      yes: false,
      verbose: args.verbose ?? false,
      quiet: args.quiet ?? false,
      resume: true,
      dailyLimit: args.dailyLimit,
      handle: args.handle,
      password: args.password,
      target: args.target || "grain",
    });
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
      dailyLimit: args.dailyLimit,
      resume: args.resume,
      target: options.target || "grain",
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
