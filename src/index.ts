import path from "path";
import fs from "fs";
import {
  convertMarkdownToDocx,
  convertMarkdownToDocxBuffer,
} from "./core/converter.js";
import { processSingleFile } from "./core/processor.js";

export { convertMarkdownToDocx, convertMarkdownToDocxBuffer };

export type ConvertFileResult = {
  /**
   * The path to the generated .docx file
   */
  outputPath: string;
  /**
   * The duration of the conversion process, formatted as a human-readable string (e.g., "2.5s", "150ms")
   */
  duration: string;
};

/**
 * Converts a markdown file to a .docx file.
 * @param inputFile Path to the input markdown file
 * @param outputDir Optional output directory for the generated .docx file. If not provided, the .docx file will be created in the same directory as the input file.
 * @returns An object containing the output path of the generated .docx file and the duration of the conversion process.
 */
export async function convertMarkdownFile(
  inputFile: string,
  outputDir?: string,
): Promise<ConvertFileResult> {
  return processSingleFile(inputFile, outputDir);
}

/**
 * Converts a markdown string to a .docx file.
 * @param markdown The markdown content to convert
 * @param outputPath The path where the generated .docx file should be saved
 * @returns An object containing the output path of the generated .docx file
 */
export async function convertMarkdownStringToFile(
  markdown: string,
  outputPath: string,
): Promise<{ outputPath: string }> {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await convertMarkdownToDocx(markdown, outputPath);
  return { outputPath };
}
