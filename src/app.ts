#!/usr/bin/env node

import fs from "fs";
import prompts from "prompts";
import ora from "ora";
import chalk from "chalk";
import path from "path";

import { convertMarkdownToDocx } from "./core/converter.js";
import { processSingleFile, processBatch } from "./core/processor.js";
import { processClipboardOrFile } from "./io/input.js";

(async () => {
  // Check for CLI argument
  const cliInputFile = process.argv[2];

  const exportsDir = path.join(process.cwd(), "exports");
  await fs.promises.mkdir(exportsDir, { recursive: true });

  if (cliInputFile) {
    // CLI mode - single file
    if (!fs.existsSync(cliInputFile)) {
      console.log(chalk.red("✖") + chalk.white(" File does not exist."));
      process.exit(1);
    }
    if (!cliInputFile.toLowerCase().endsWith(".md")) {
      console.log(chalk.red("✖") + chalk.white(" File must be a .md file."));
      process.exit(1);
    }

    const spinner = ora("Converting document to .docx").start();

    try {
      const { outputPath, duration } = await processSingleFile(
        cliInputFile,
        exportsDir,
      );
      spinner.succeed(
        "Document converted successfully in" +
          chalk.cyan(` ${duration}ms`) +
          chalk.white(" — saved to") +
          chalk.cyan(` ${outputPath}`),
      );
    } catch (error) {
      spinner.fail("Failed to convert document");
      console.error(error);
      process.exit(1);
    }
  } else {
    // Interactive mode
    const modeResponse = await prompts({
      type: "select",
      name: "mode",
      message: "Select conversion mode:",
      choices: [
        { title: "Single file", value: "single" },
        { title: "Batch (glob pattern)", value: "batch" },
      ],
    });

    if (!modeResponse.mode) {
      console.log(chalk.red("✖") + chalk.white(" Operation cancelled."));
      process.exit(0);
    }

    if (modeResponse.mode === "batch") {
      const patternResponse = await prompts([
        {
          type: "text",
          name: "pattern",
          message: "Enter glob pattern (e.g., *.md, src/**/*.md):",
          validate: (value) => {
            if (!value) return "You must provide a pattern";
            return true;
          },
        },
      ]);

      if (!patternResponse.pattern) {
        console.log(chalk.red("✖") + chalk.white(" Operation cancelled."));
        process.exit(0);
      }

      await processBatch(patternResponse.pattern, exportsDir);
    } else {
      // Single file mode
      try {
        const { inputFile, mdContent } = await processClipboardOrFile();

        const inputName = inputFile
          ? path.basename(inputFile, path.extname(inputFile))
          : "clipboard";
        const outputBase = `${inputName}-${Date.now()}.docx`;
        const outputPath = path.join(exportsDir, outputBase);

        const start = Date.now();
        const spinner = ora("Converting document to .docx").start();

        await convertMarkdownToDocx(mdContent, outputPath);

        spinner.succeed(
          "Document converted successfully in" +
            chalk.cyan(` ${Date.now() - start}ms`) +
            chalk.white(" — saved to") +
            chalk.cyan(` ${outputPath}`),
        );
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  }
})();
