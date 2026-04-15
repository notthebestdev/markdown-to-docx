import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

const libraryExportsDir = path.join(process.cwd(), "exports-library");
const fixturesDir = path.join(process.cwd(), "test", "fixtures");

function cleanLibraryExportsDir() {
  if (fs.existsSync(libraryExportsDir)) {
    fs.rmSync(libraryExportsDir, { recursive: true });
  }
}

describe("Library API Tests", () => {
  beforeEach(cleanLibraryExportsDir);
  afterEach(cleanLibraryExportsDir);

  it("should return a non-empty DOCX buffer", async () => {
    const { convertMarkdownToDocxBuffer } = await import("../dist/index.js");

    const buffer = await convertMarkdownToDocxBuffer("# Hello from library");

    assert.ok(Buffer.isBuffer(buffer), "Expected a Buffer");
    assert.ok(buffer.length > 0, "Expected non-empty DOCX buffer");
  });

  it("should write DOCX from markdown string", async () => {
    const { convertMarkdownStringToFile } = await import("../dist/index.js");

    const outputPath = path.join(libraryExportsDir, "string-output.docx");
    const result = await convertMarkdownStringToFile(
      "# String conversion",
      outputPath,
    );

    assert.strictEqual(result.outputPath, outputPath);
    assert.strictEqual(fs.existsSync(outputPath), true);
    const stats = fs.statSync(outputPath);
    assert.ok(stats.size > 0, "Generated file should not be empty");
  });

  it("should convert markdown file with convertMarkdownFile", async () => {
    const { convertMarkdownFile } = await import("../dist/index.js");

    const inputFile = path.join(fixturesDir, "simple.md");
    const result = await convertMarkdownFile(inputFile, libraryExportsDir);

    assert.strictEqual(fs.existsSync(result.outputPath), true);
    assert.match(result.outputPath, /simple\.docx$/);
    assert.ok(result.duration.length > 0, "Expected a duration string");
  });

  it("should reject empty markdown content", async () => {
    const { convertMarkdownToDocxBuffer } = await import("../dist/index.js");

    await assert.rejects(
      () => convertMarkdownToDocxBuffer(""),
      /Markdown content is undefined/,
    );
  });
});
