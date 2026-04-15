import fs from "fs";
import path from "path";
import { createSpinner } from "nanospinner";
import * as pc from "picocolors";
import { glob } from "tinyglobby";
import chokidar from "chokidar";
import { convertMarkdownToDocx } from "./converter.js";
import prettyMilliseconds from "pretty-ms";

function isMarkdownFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === ".md";
}

export async function processSingleFile(
  inputFile: string,
  outputDir?: string,
): Promise<{ outputPath: string; duration: string }> {
  const start = Date.now();
  const mdContent = await fs.promises.readFile(inputFile, "utf-8");
  const inputName = path.basename(inputFile, path.extname(inputFile));
  const outputBase = `${inputName}.docx`;
  const baseOutputDir = outputDir ? outputDir : path.dirname(inputFile);
  const outputPath = path.join(baseOutputDir, outputBase);

  await fs.promises.mkdir(baseOutputDir, { recursive: true });

  await convertMarkdownToDocx(mdContent, outputPath);
  const duration = prettyMilliseconds(Date.now() - start, {
    formatSubMilliseconds: true,
  });

  return { outputPath, duration };
}

export async function processBatch(
  globPattern: string,
  outputDir?: string,
): Promise<void> {
  const globResult = await glob(globPattern);
  const allFiles = globResult as string[];

  // Filter to only .md files
  const files = allFiles.filter((file) => file.toLowerCase().endsWith(".md"));
  const skippedCount = allFiles.length - files.length;

  if (files.length === 0) {
    console.log(
      pc.red("✖") +
        pc.white(" No markdown files found matching the pattern."),
    );
    process.exit(1);
  }

  if (skippedCount > 0) {
    console.log(
      pc.yellow("⚠") +
        pc.white(
          ` Skipped ${skippedCount} non-markdown file(s) (only .md files are processed)\n`,
        ),
    );
  }

  console.log(pc.green(`Found ${files.length} file(s) to convert.\n`));

  let successCount = 0;
  let failureCount = 0;
  let currentIndex = 1;

  for (const file of files) {
    const spinner = createSpinner(
      `[${currentIndex}/${files.length}] Converting ${path.basename(file)}`,
    ).start();

    try {
      const { outputPath, duration } = await processSingleFile(file, outputDir);
      spinner.success(
        `[${currentIndex}/${files.length}] ${path.basename(file)}` +
          pc.cyan(` (${duration})`) +
          pc.white(" → ") +
          pc.cyan(path.basename(outputPath)),
      );
      successCount++;
    } catch (error) {
      spinner.error(
        `[${currentIndex}/${files.length}] ${path.basename(file)} ` +
          pc.red(`failed: ${error}`),
      );
      failureCount++;
    }
    currentIndex++;
  }

  console.log("\n" + pc.bold("Batch conversion summary:"));
  console.log(pc.green(`✓ ${successCount} succeeded`));
  if (failureCount > 0) {
    console.log(pc.red(`✖ ${failureCount} failed`));
  }
}

export async function processWatch(
  globPattern: string,
  outputDir?: string,
): Promise<void> {
  const globResult = await glob(globPattern);
  const initialFiles = (globResult as string[]).filter(isMarkdownFile);

  if (initialFiles.length > 0) {
    console.log(
      pc.green(
        `Found ${initialFiles.length} markdown file(s). Running initial conversion.\n`,
      ),
    );

    let index = 1;
    for (const file of initialFiles) {
      const spinner = createSpinner(
        `[${index}/${initialFiles.length}] Converting ${path.basename(file)}`,
      ).start();
      try {
        const { outputPath, duration } = await processSingleFile(
          file,
          outputDir,
        );
        spinner.success(
          `[${index}/${initialFiles.length}] ${path.basename(file)}` +
            pc.cyan(` (${duration})`) +
            pc.white(" → ") +
            pc.cyan(path.basename(outputPath)),
        );
      } catch (error) {
        spinner.error(
          `[${index}/${initialFiles.length}] ${path.basename(file)} ` +
            pc.red(`failed: ${error}`),
        );
      }
      index++;
    }
  } else {
    console.log(
      pc.yellow("⚠") +
        pc.white(
          " No markdown files matched initially. Waiting for new files...",
        ),
    );
  }

  console.log(
    "\n" +
      pc.bold("Watch mode active") +
      pc.white(" - Press ") +
      pc.cyan("Ctrl+C") +
      pc.white(" to stop."),
  );

  const debounceMap = new Map<string, NodeJS.Timeout>();
  const watcher = chokidar.watch(globPattern, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  });

  const scheduleConversion = (file: string, reason: "added" | "changed") => {
    if (!isMarkdownFile(file)) {
      return;
    }

    const previous = debounceMap.get(file);
    if (previous) {
      clearTimeout(previous);
    }

    const timeout = setTimeout(async () => {
      debounceMap.delete(file);
      const spinner = createSpinner(
        `${reason === "added" ? "Added" : "Changed"}: ${path.basename(file)} — converting...`,
      ).start();
      try {
        const { outputPath, duration } = await processSingleFile(
          file,
          outputDir,
        );
        spinner.success(
          `${path.basename(file)} converted` +
            pc.cyan(` (${duration})`) +
            pc.white(" → ") +
            pc.cyan(path.basename(outputPath)),
        );
      } catch (error) {
        spinner.error(
          `${path.basename(file)} ` + pc.red(`failed to convert: ${error}`),
        );
      }
    }, 150);

    debounceMap.set(file, timeout);
  };

  watcher.on("add", (file) => scheduleConversion(file, "added"));
  watcher.on("change", (file) => scheduleConversion(file, "changed"));
  watcher.on("unlink", (file) => {
    if (isMarkdownFile(file)) {
      console.log(
        pc.yellow("⚠") +
          pc.white(
            ` ${path.basename(file)} was removed (no output cleanup performed).`,
          ),
      );
    }
  });

  await new Promise<void>((resolve, reject) => {
    watcher.on("error", reject);

    process.on("SIGINT", async () => {
      for (const timeout of debounceMap.values()) {
        clearTimeout(timeout);
      }
      await watcher.close();
      console.log("\n" + pc.gray("Watch mode stopped."));
      resolve();
    });
  });
}
