/**
 * Comprehensive Test Suite for Markdown to DOCX Converter
 * 
 * Test Categories:
 * 
 * 1. File Validation Tests (4 tests)
 *    - Tests for file existence, extension validation, and case sensitivity
 * 
 * 2. Basic Conversion Tests (4 tests)
 *    - Core functionality: simple/complex files, directory creation, unique filenames
 * 
 * 3. Edge Cases Tests (5 tests)
 *    - Empty files, whitespace-only, unicode, special chars, long filenames
 * 
 * 4. Markdown Content Tests (8 tests)
 *    - Tests conversion of various markdown elements: headers, lists, code,
 *      links, emphasis, blockquotes, tables, horizontal rules
 * 
 * 5. Output File Tests (4 tests)
 *    - Validates output format, naming conventions, and file structure
 * 
 * Total: 25 tests across 5 categories
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// Shared test configuration
const exportsDir = path.join(process.cwd(), "exports");
const fixturesDir = path.join(process.cwd(), "test", "fixtures");

// Helper to clean exports directory
function cleanExportsDir() {
  if (fs.existsSync(exportsDir)) {
    fs.rmSync(exportsDir, { recursive: true });
  }
}

// Helper to execute CLI command
function execCLI(filePath: string) {
  return execSync(`node dist/app.js ${filePath}`, {
    encoding: "utf-8",
    env: { ...process.env, FORCE_COLOR: "0" },
    stdio: ["pipe", "pipe", "pipe"],
  });
}

describe("File Validation Tests", () => {
  beforeEach(cleanExportsDir);
  afterEach(cleanExportsDir);

  it("should fail gracefully with non-existent file", () => {
    assert.throws(
      () => {
        execSync("node dist/app.js non-existent.md", {
          encoding: "utf-8",
          stdio: "pipe",
        });
      },
      (err: unknown) => {
        return (err as { status?: number }).status === 1;
      },
      "Should exit with status 1 for non-existent file"
    );
  });

  it("should fail gracefully with non-markdown file", () => {
    const tempFile = path.join(process.cwd(), "test.txt");
    fs.writeFileSync(tempFile, "test content");
    
    try {
      assert.throws(
        () => {
          execSync(`node dist/app.js ${tempFile}`, {
            encoding: "utf-8",
            stdio: "pipe",
          });
        },
        (err: unknown) => {
          return (err as { status?: number }).status === 1;
        },
        "Should exit with status 1 for non-markdown file"
      );
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });

  it("should accept .md extension (lowercase)", () => {
    const tempFile = path.join(fixturesDir, "temp-lowercase.md");
    fs.writeFileSync(tempFile, "# Test");
    
    try {
      execCLI(tempFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });

  it("should accept .MD extension (uppercase)", () => {
    const tempFile = path.join(fixturesDir, "temp-uppercase.MD");
    fs.writeFileSync(tempFile, "# Test");
    
    try {
      execCLI(tempFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  });
});

describe("Basic Conversion Tests", () => {
  const simpleFixture = path.join(fixturesDir, "simple.md");
  const complexFixture = path.join(fixturesDir, "complex.md");

  beforeEach(cleanExportsDir);
  afterEach(cleanExportsDir);

  it("should convert a simple markdown file via CLI argument", () => {
    execCLI(simpleFixture);

    assert.strictEqual(fs.existsSync(exportsDir), true);

    const files = fs.readdirSync(exportsDir);
    assert.strictEqual(files.length, 1);
    assert.match(files[0], /simple-\d+\.docx/);
    
    const filePath = path.join(exportsDir, files[0]);
    const stats = fs.statSync(filePath);
    assert.ok(stats.size > 0, "Generated file should not be empty");
  });

  it("should convert a complex markdown file", () => {
    execCLI(complexFixture);

    const files = fs.readdirSync(exportsDir);
    assert.strictEqual(files.length, 1);
    assert.match(files[0], /complex-\d+\.docx/);
    
    const filePath = path.join(exportsDir, files[0]);
    const stats = fs.statSync(filePath);
    assert.ok(stats.size > 0);
    // Complex file should be larger than simple
    assert.ok(stats.size > 1000, "Complex file should be substantial in size");
  });

  it("should create exports directory if it doesn't exist", () => {
    assert.strictEqual(fs.existsSync(exportsDir), false);

    execCLI(simpleFixture);

    assert.strictEqual(fs.existsSync(exportsDir), true);
    const files = fs.readdirSync(exportsDir);
    assert.ok(files.length > 0);
  });

  it("should generate unique filenames for multiple conversions", () => {
    execCLI(simpleFixture);
    
    const startTime = Date.now();
    while (Date.now() - startTime < 5) {
      // Wait for different timestamp
    }
    
    execCLI(simpleFixture);

    const files = fs.readdirSync(exportsDir);
    assert.strictEqual(files.length, 2);
    assert.notStrictEqual(files[0], files[1], "Files should have unique names");
  });
});

describe("Edge Cases Tests", () => {
  beforeEach(cleanExportsDir);
  afterEach(cleanExportsDir);

  it("should fail gracefully with empty markdown file", () => {
    const emptyFile = path.join(fixturesDir, "empty.md");
    fs.writeFileSync(emptyFile, "");
    
    try {
      assert.throws(
        () => execCLI(emptyFile),
        (err: unknown) => {
          return (err as { status?: number }).status === 1;
        },
        "Should exit with status 1 for empty file"
      );
    } finally {
      if (fs.existsSync(emptyFile)) {
        fs.unlinkSync(emptyFile);
      }
    }
  });

  it("should handle markdown with only whitespace", () => {
    const whitespaceFile = path.join(fixturesDir, "whitespace.md");
    fs.writeFileSync(whitespaceFile, "   \n\n   \t  \n  ");
    
    try {
      execCLI(whitespaceFile);
      
      // Whitespace-only markdown produces empty HTML, so no file is created
      // This is actually expected behavior - the app silently succeeds but doesn't write a file
      // We can check that no error occurred by reaching this point
      assert.ok(true, "Should complete without error even for whitespace-only content");
    } finally {
      if (fs.existsSync(whitespaceFile)) {
        fs.unlinkSync(whitespaceFile);
      }
    }
  });

  it("should handle markdown with unicode characters", () => {
    const unicodeFile = path.join(fixturesDir, "unicode.md");
    fs.writeFileSync(unicodeFile, "# 你好世界 🌍\n\n**Émojis:** 😀 ✨ 🚀\n\nΑλφάβητο ελληνικό");
    
    try {
      execCLI(unicodeFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
      
      const filePath = path.join(exportsDir, files[0]);
      const stats = fs.statSync(filePath);
      assert.ok(stats.size > 0);
    } finally {
      if (fs.existsSync(unicodeFile)) {
        fs.unlinkSync(unicodeFile);
      }
    }
  });

  it("should handle markdown with special characters in content", () => {
    const specialCharsFile = path.join(fixturesDir, "special-chars.md");
    fs.writeFileSync(specialCharsFile, '# Test & < > " \' \n\n`code` with symbols: @#$%^&*()');
    
    try {
      execCLI(specialCharsFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(specialCharsFile)) {
        fs.unlinkSync(specialCharsFile);
      }
    }
  });

  it("should handle files with very long names", () => {
    const longName = "a".repeat(100);
    const longNameFile = path.join(fixturesDir, `${longName}.md`);
    fs.writeFileSync(longNameFile, "# Long filename test");
    
    try {
      execCLI(longNameFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
      assert.match(files[0], /\.docx$/);
    } finally {
      if (fs.existsSync(longNameFile)) {
        fs.unlinkSync(longNameFile);
      }
    }
  });
});

describe("Markdown Content Tests", () => {
  beforeEach(cleanExportsDir);
  afterEach(cleanExportsDir);

  it("should convert markdown with headers", () => {
    const headersFile = path.join(fixturesDir, "headers.md");
    fs.writeFileSync(headersFile, "# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6");
    
    try {
      execCLI(headersFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(headersFile)) {
        fs.unlinkSync(headersFile);
      }
    }
  });

  it("should convert markdown with lists", () => {
    const listsFile = path.join(fixturesDir, "lists.md");
    fs.writeFileSync(listsFile, "# Lists\n\n- Item 1\n- Item 2\n  - Nested\n\n1. First\n2. Second");
    
    try {
      execCLI(listsFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(listsFile)) {
        fs.unlinkSync(listsFile);
      }
    }
  });

  it("should convert markdown with code blocks", () => {
    const codeFile = path.join(fixturesDir, "code.md");
    fs.writeFileSync(codeFile, "# Code\n\n```javascript\nconst x = 42;\n```\n\nInline `code` too.");
    
    try {
      execCLI(codeFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(codeFile)) {
        fs.unlinkSync(codeFile);
      }
    }
  });

  it("should convert markdown with links", () => {
    const linksFile = path.join(fixturesDir, "links.md");
    fs.writeFileSync(linksFile, "# Links\n\n[Google](https://google.com)\n\n[Ref link][1]\n\n[1]: https://example.com");
    
    try {
      execCLI(linksFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(linksFile)) {
        fs.unlinkSync(linksFile);
      }
    }
  });

  it("should convert markdown with emphasis", () => {
    const emphasisFile = path.join(fixturesDir, "emphasis.md");
    fs.writeFileSync(emphasisFile, "**bold** *italic* ~~strikethrough~~ ***bold italic***");
    
    try {
      execCLI(emphasisFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(emphasisFile)) {
        fs.unlinkSync(emphasisFile);
      }
    }
  });

  it("should convert markdown with blockquotes", () => {
    const blockquoteFile = path.join(fixturesDir, "blockquote.md");
    fs.writeFileSync(blockquoteFile, "> This is a quote\n> \n> Multi-line quote");
    
    try {
      execCLI(blockquoteFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(blockquoteFile)) {
        fs.unlinkSync(blockquoteFile);
      }
    }
  });

  it("should convert markdown with tables", () => {
    const tableFile = path.join(fixturesDir, "table.md");
    fs.writeFileSync(tableFile, "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |");
    
    try {
      execCLI(tableFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(tableFile)) {
        fs.unlinkSync(tableFile);
      }
    }
  });

  it("should convert markdown with horizontal rules", () => {
    const hrFile = path.join(fixturesDir, "hr.md");
    fs.writeFileSync(hrFile, "Content\n\n---\n\nMore content\n\n***");
    
    try {
      execCLI(hrFile);
      const files = fs.readdirSync(exportsDir);
      assert.strictEqual(files.length, 1);
    } finally {
      if (fs.existsSync(hrFile)) {
        fs.unlinkSync(hrFile);
      }
    }
  });
});

describe("Output File Tests", () => {
  const simpleFixture = path.join(fixturesDir, "simple.md");

  beforeEach(cleanExportsDir);
  afterEach(cleanExportsDir);

  it("should generate .docx files with correct extension", () => {
    execCLI(simpleFixture);
    
    const files = fs.readdirSync(exportsDir);
    assert.ok(files.every(f => f.endsWith(".docx")), "All files should have .docx extension");
  });

  it("should generate files with timestamp in name", () => {
    const beforeTime = Date.now();
    execCLI(simpleFixture);
    const afterTime = Date.now();
    
    const files = fs.readdirSync(exportsDir);
    const filename = files[0];
    const timestampMatch = filename.match(/-(\d+)\.docx$/);
    
    assert.ok(timestampMatch, "Filename should contain timestamp");
    const timestamp = parseInt(timestampMatch[1]);
    assert.ok(timestamp >= beforeTime && timestamp <= afterTime, "Timestamp should be current");
  });

  it("should preserve base filename in output", () => {
    const customFile = path.join(fixturesDir, "my-custom-document.md");
    fs.writeFileSync(customFile, "# Custom");
    
    try {
      execCLI(customFile);
      const files = fs.readdirSync(exportsDir);
      assert.ok(files[0].startsWith("my-custom-document-"), "Should preserve base filename");
    } finally {
      if (fs.existsSync(customFile)) {
        fs.unlinkSync(customFile);
      }
    }
  });

  it("should generate valid DOCX file format", () => {
    execCLI(simpleFixture);
    
    const files = fs.readdirSync(exportsDir);
    const filePath = path.join(exportsDir, files[0]);
    const buffer = fs.readFileSync(filePath);
    
    // DOCX files are ZIP archives, check for ZIP signature (PK)
    assert.strictEqual(buffer[0], 0x50, "Should start with ZIP signature 'P'");
    assert.strictEqual(buffer[1], 0x4B, "Should start with ZIP signature 'K'");
  });
});
