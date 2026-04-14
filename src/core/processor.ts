import fs from "fs";
import path from "path";
import ora from "ora";
import chalk from "chalk";
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
      chalk.red("✖") +
        chalk.white(" No markdown files found matching the pattern."),
    );
    process.exit(1);
  }

  if (skippedCount > 0) {
    console.log(
      chalk.yellow("⚠") +
        chalk.white(
          ` Skipped ${skippedCount} non-markdown file(s) (only .md files are processed)\n`,
        ),
    );
  }

  console.log(chalk.green(`Found ${files.length} file(s) to convert.\n`));

  let successCount = 0;
  let failureCount = 0;
  let currentIndex = 1;

  for (const file of files) {
    const spinner = ora(
      `[${currentIndex}/${files.length}] Converting ${path.basename(file)}`,
    ).start();

    try {
      const { outputPath, duration } = await processSingleFile(file, outputDir);
      spinner.succeed(
        `[${currentIndex}/${files.length}] ${path.basename(file)}` +
          chalk.cyan(` (${duration})`) +
          chalk.white(" → ") +
          chalk.cyan(path.basename(outputPath)),
      );
      successCount++;
    } catch (error) {
      spinner.fail(
        `[${currentIndex}/${files.length}] ${path.basename(file)} ` +
          chalk.red(`failed: ${error}`),
      );
      failureCount++;
    }
    currentIndex++;
  }

  console.log("\n" + chalk.bold("Batch conversion summary:"));
  console.log(chalk.green(`✓ ${successCount} succeeded`));
  if (failureCount > 0) {
    console.log(chalk.red(`✖ ${failureCount} failed`));
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
      chalk.green(
        `Found ${initialFiles.length} markdown file(s). Running initial conversion.\n`,
      ),
    );

    let index = 1;
    for (const file of initialFiles) {
      const spinner = ora(
        `[${index}/${initialFiles.length}] Converting ${path.basename(file)}`,
      ).start();
      try {
        const { outputPath, duration } = await processSingleFile(
          file,
          outputDir,
        );
        spinner.succeed(
          `[${index}/${initialFiles.length}] ${path.basename(file)}` +
            chalk.cyan(` (${duration})`) +
            chalk.white(" → ") +
            chalk.cyan(path.basename(outputPath)),
        );
      } catch (error) {
        spinner.fail(
          `[${index}/${initialFiles.length}] ${path.basename(file)} ` +
            chalk.red(`failed: ${error}`),
        );
      }
      index++;
    }
  } else {
    console.log(
      chalk.yellow("⚠") +
        chalk.white(
          " No markdown files matched initially. Waiting for new files...",
        ),
    );
  }

  console.log(
    "\n" +
      chalk.bold("Watch mode active") +
      chalk.white(" - Press ") +
      chalk.cyan("Ctrl+C") +
      chalk.white(" to stop."),
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
      const spinner = ora(
        `${reason === "added" ? "Added" : "Changed"}: ${path.basename(file)} — converting...`,
      ).start();
      try {
        const { outputPath, duration } = await processSingleFile(
          file,
          outputDir,
        );
        spinner.succeed(
          `${path.basename(file)} converted` +
            chalk.cyan(` (${duration})`) +
            chalk.white(" → ") +
            chalk.cyan(path.basename(outputPath)),
        );
      } catch (error) {
        spinner.fail(
          `${path.basename(file)} ` + chalk.red(`failed to convert: ${error}`),
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
        chalk.yellow("⚠") +
          chalk.white(
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
      console.log("\n" + chalk.gray("Watch mode stopped."));
      resolve();
    });
  });
}
