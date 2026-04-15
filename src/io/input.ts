import fs from "fs";
import prompts from "prompts";
import * as pc from "picocolors";
import clipboardy from "clipboardy";

export async function processClipboardOrFile(): Promise<{
  inputFile?: string;
  mdContent: string;
}> {
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
    console.log(pc.red("✖") + pc.white(" Operation cancelled."));
    process.exit(0);
  }

  if (sourceResponse.source === "clipboard") {
    try {
      const mdContent = await clipboardy.read();
      if (!mdContent) {
        console.log(pc.red("✖") + pc.white(" Clipboard is empty."));
        process.exit(1);
      }
      return { mdContent };
    } catch (err) {
      console.log(
        pc.red("✖") + pc.white(" Failed to read from clipboard."),
      );
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
          if (!value.toLowerCase().endsWith(".md"))
            return "File must be a .md file";
          return true;
        },
      },
    ]);
    // Check if user cancelled the prompts
    if (!response.inputFile) {
      console.log(pc.red("✖") + pc.white(" Operation cancelled."));
      process.exit(0);
    }
    const mdContent = await fs.promises.readFile(response.inputFile, "utf-8");
    return { inputFile: response.inputFile, mdContent };
  }
}
