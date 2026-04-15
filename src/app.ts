#!/usr/bin/env node

import fs from "fs";
import prompts from "prompts";
import { createSpinner } from "nanospinner";
import * as pc from "picocolors";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { convertMarkdownToDocx } from "./core/converter.js";
import {
  processSingleFile,
  processBatch,
  processWatch,
} from "./core/processor.js";
import { processClipboardOrFile } from "./io/input.js";

(async () => {
  const argv = yargs(hideBin(process.argv))
    .scriptName("md-to-docx")
    .usage("Usage: $0 [input.md] [options]")
    .option("watch", {
      alias: "w",
      type: "boolean",
      description: "Watch markdown files and reconvert on changes",
      default: false,
    })
    .option("pattern", {
      alias: "p",
      type: "string",
      description: "Glob pattern for batch or watch mode",
    })
    .option("batch", {
      alias: "b",
      type: "boolean",
      description: "Run a one-time batch conversion using --pattern",
      default: false,
    })
    .option("outdir", {
      alias: "o",
      type: "string",
      description: "Optional output directory for generated .docx files",
    })
    .help()
    .alias("help", "h")
    .parseSync();

  const positionalInput = argv._[0] ? String(argv._[0]) : undefined;
  const outputDir = argv.outdir ? path.resolve(argv.outdir) : undefined;

  if (argv.watch) {
    let watchPattern = argv.pattern;

    if (!watchPattern && positionalInput) {
      watchPattern = positionalInput;
    }

    if (!watchPattern) {
      const response = await prompts({
        type: "text",
        name: "pattern",
        message: "Enter watch pattern (e.g., *.md, src/**/*.md):",
        validate: (value) => {
          if (!value) return "You must provide a watch pattern";
          return true;
        },
      });

      if (!response.pattern) {
        console.log(pc.red("✖") + pc.white(" Operation cancelled."));
        process.exit(0);
      }

      watchPattern = response.pattern;
    }

    if (!watchPattern) {
      console.log(pc.red("✖") + pc.white(" Operation cancelled."));
      process.exit(0);
    }

    await processWatch(watchPattern, outputDir);
    process.exit(0);
  }

  if (argv.batch) {
    if (!argv.pattern) {
      console.log(
        pc.red("✖") +
          pc.white(
            ' Batch mode requires --pattern (e.g., --pattern "src/**/*.md").',
          ),
      );
      process.exit(1);
    }

    await processBatch(argv.pattern, outputDir);
    process.exit(0);
  }

  if (positionalInput) {
    // CLI mode - single file
    if (!fs.existsSync(positionalInput)) {
      console.log(pc.red("✖") + pc.white(" File does not exist."));
      process.exit(1);
    }
    if (!positionalInput.toLowerCase().endsWith(".md")) {
      console.log(pc.red("✖") + pc.white(" File must be a .md file."));
      process.exit(1);
    }

    const spinner = createSpinner("Converting document to .docx").start();

    try {
      const { outputPath, duration } = await processSingleFile(
        positionalInput,
        outputDir,
      );
      spinner.success(
        "Document converted successfully in" +
          pc.cyan(` ${duration}`) +
          pc.white(" — saved to") +
          pc.cyan(` ${outputPath}`),
      );
    } catch (error) {
      spinner.error("Failed to convert document");
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
      console.log(pc.red("✖") + pc.white(" Operation cancelled."));
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
        console.log(pc.red("✖") + pc.white(" Operation cancelled."));
        process.exit(0);
      }

      await processBatch(patternResponse.pattern, outputDir);
    } else {
      // Single file mode
      try {
        const { inputFile, mdContent } = await processClipboardOrFile();

        const inputName = inputFile
          ? path.basename(inputFile, path.extname(inputFile))
          : "clipboard";
        const outputBase = `${inputName}.docx`;
        const baseOutputDir = outputDir
          ? outputDir
          : inputFile
            ? path.dirname(inputFile)
            : process.cwd();
        await fs.promises.mkdir(baseOutputDir, { recursive: true });
        const outputPath = path.join(baseOutputDir, outputBase);

        const start = Date.now();
        const spinner = createSpinner("Converting document to .docx").start();

        await convertMarkdownToDocx(mdContent, outputPath);

        spinner.success(
          "Document converted successfully in" +
            pc.cyan(` ${Date.now() - start}ms`) +
            pc.white(" — saved to") +
            pc.cyan(` ${outputPath}`),
        );
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  }
})();
