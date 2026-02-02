#!/usr/bin/env node

import prompts from "prompts";
import fs from "fs";
import ora from "ora";
import { marked } from "marked";
import { asBlob } from "html-docx-js-typescript";
import chalk from "chalk";
import path from "path";
import clipboardy from "clipboardy";

(async () => {
  // Check for CLI argument
  const cliInputFile = process.argv[2];

  let inputFile: string | undefined;
  let mdContent: string | undefined;

  if (cliInputFile) {
    // Validate CLI argument
    if (!fs.existsSync(cliInputFile)) {
      console.log(chalk.red("✖") + chalk.white(" File does not exist."));
      process.exit(1);
    }
    if (!cliInputFile.toLowerCase().endsWith(".md")) {
      console.log(chalk.red("✖") + chalk.white(" File must be a .md file."));
      process.exit(1);
    }
    inputFile = cliInputFile;
    mdContent = await fs.promises.readFile(inputFile, "utf-8");
  } else {
    // First ask whether to use clipboard or file
    const sourceResponse = await prompts({
      type: "select",
      name: "source",
      message: "Where is the markdown?",
      choices: [
        { title: "Clipboard", value: "clipboard" },
        { title: "File", value: "file" },
      ],
    });

    if (!sourceResponse.source) {
      console.log(chalk.red("✖") + chalk.white(" Operation cancelled."));
      process.exit(0);
    }

    if (sourceResponse.source === "clipboard") {
      try {
        mdContent = await clipboardy.read();
        if (!mdContent) {
          console.log(chalk.red("✖") + chalk.white(" Clipboard is empty."));
          process.exit(1);
        }
      } catch (err) {
        console.log(chalk.red("✖") + chalk.white(" Failed to read from clipboard."));
        console.error(err);
        process.exit(1);
      }
    } else {
      // Prompt for input file
      const response = await prompts([
        {
          type: "text",
          name: "inputFile",
          message: "Enter the path to your markdown file:",
          validate: (value) => {
            if (!value) return "You must provide a file path";
            if (!fs.existsSync(value)) return "File does not exist";
            if (!value.toLowerCase().endsWith(".md")) return "File must be a .md file";
            return true;
          },
        },
      ]);
      // Check if user cancelled the prompts
      if (!response.inputFile) {
        console.log(chalk.red("✖") + chalk.white(" Operation cancelled."));
        process.exit(0);
      }
      inputFile = response.inputFile;
      mdContent = await fs.promises.readFile(inputFile as string, "utf-8");
    }
  }

  const exportsDir = path.join(process.cwd(), "exports");
  await fs.promises.mkdir(exportsDir, { recursive: true });

  // Generate output filename
  const inputName = inputFile
    ? path.basename(inputFile, path.extname(inputFile))
    : "clipboard";
  const outputBase = `${inputName}-${Date.now()}.docx`;
  const outputPath = path.join(exportsDir, outputBase);

  const start = Date.now();

  const spinner = ora("Converting document to .docx").start();
  let html: string | undefined;
  try {
    if (!mdContent) {
      throw new Error("Markdown content is undefined.");
    }
    html = await marked(mdContent);
  } catch (error) {
    spinner.fail("Failed to convert document");
    console.error(error);
    process.exit(1);
  } finally {
    if (html) {
      const docx = await asBlob(html);
      let buffer: Buffer;
      if (docx instanceof Buffer) {
        buffer = docx;
      } else if (docx instanceof Blob) {
        buffer = Buffer.from(await docx.arrayBuffer());
      } else {
        spinner.fail("Unexpected docx type. Conversion failed.");
        process.exit(1);
      }
      await fs.promises.writeFile(outputPath, buffer); // write to exports folder
      spinner.succeed(
        "Document converted successfully in" +
          chalk.cyan(` ${Date.now() - start}ms`) +
          chalk.white(" — saved to") +
          chalk.cyan(` ${outputPath}`)
      );
    }
  }
})();
