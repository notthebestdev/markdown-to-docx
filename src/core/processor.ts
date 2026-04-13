import fs from "fs";
import path from "path";
import ora from "ora";
import chalk from "chalk";
import { glob } from "glob";
import { convertMarkdownToDocx } from "./converter.js";

export async function processSingleFile(
  inputFile: string,
  exportsDir: string,
): Promise<{ outputPath: string; duration: number }> {
  const start = Date.now();
  const mdContent = await fs.promises.readFile(inputFile, "utf-8");
  const inputName = path.basename(inputFile, path.extname(inputFile));
  const outputBase = `${inputName}-${Date.now()}.docx`;
  const outputPath = path.join(exportsDir, outputBase);

  await convertMarkdownToDocx(mdContent, outputPath);
  const duration = Date.now() - start;

  return { outputPath, duration };
}

export async function processBatch(
  globPattern: string,
  exportsDir: string,
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
      const { outputPath, duration } = await processSingleFile(
        file,
        exportsDir,
      );
      spinner.succeed(
        `[${currentIndex}/${files.length}] ${path.basename(file)}` +
          chalk.cyan(` (${duration}ms)`) +
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
