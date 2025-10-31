import prompts from "prompts";
import fs from "fs";
import ora from "ora";
import { marked } from "marked";
import { asBlob } from "html-docx-js-typescript";
import chalk from "chalk";
import path from "path";

(async () => {
  // Check for CLI argument
  const cliInputFile = process.argv[2];

  let inputFile: string | undefined;

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
  }

  // Ensure exports directory exists and force output into it
  const exportsDir = path.join(process.cwd(), "exports");
  await fs.promises.mkdir(exportsDir, { recursive: true });

  // Generate output filename
  const inputName = path.basename(inputFile! , path.extname(inputFile!));
  const outputBase = `${inputName}-${Date.now()}.docx`;
  const outputPath = path.join(exportsDir, outputBase);

  const start = Date.now();

  const spinner = ora("Converting document to .docx").start();
  let html: string | undefined;
  try {
    if (!inputFile) {
      throw new Error("Input file path is undefined.");
    }
    const md = await fs.promises.readFile(inputFile, "utf-8");
    html = await marked(md);
  } catch (error) {
    spinner.fail("Failed to convert document");
    console.error(error);
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
