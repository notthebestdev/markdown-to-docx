import fs from "fs";
import { marked } from "marked";
import { asBlob } from "html-docx-js-typescript";

export async function convertMarkdownToDocxBuffer(
  mdContent: string,
): Promise<Buffer> {
  let html: string | undefined;
  try {
    if (!mdContent) {
      throw new Error("Markdown content is undefined.");
    }
    html = await marked(mdContent);
  } catch (error) {
    throw new Error(`Failed to convert markdown: ${error}`, { cause: error });
  }

  // Empty HTML is valid (e.g., whitespace-only markdown), so we allow it
  const finalHtml = html || "";

  const docx = await asBlob(finalHtml);
  let buffer: Buffer;
  if (docx instanceof Buffer) {
    buffer = docx;
  } else if (docx instanceof Blob) {
    buffer = Buffer.from(await docx.arrayBuffer());
  } else {
    throw new Error("Unexpected docx type. Conversion failed.");
  }

  return buffer;
}

export async function convertMarkdownToDocx(
  mdContent: string,
  outputPath: string,
): Promise<void> {
  const buffer = await convertMarkdownToDocxBuffer(mdContent);
  await fs.promises.writeFile(outputPath, buffer);
}
