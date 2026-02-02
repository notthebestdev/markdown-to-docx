<p align="center">
    <img src="https://socialify.git.ci/notthebestdev/markdown-to-docx/image?description=1&forks=1&issues=1&language=1&name=1&owner=1&pattern=Plus&pulls=1&stargazers=1&theme=Light" alt="markdown-to-docx" />
</p>

This program allows you to transform Markdown into a Word document.

## Description

This project converts Markdown files into Microsoft Word (.docx) documents.

It preserves common block and inline-level elements (headings, lists, links, images, code blocks, emphasis, tables) and provides a small CLI to control input, output and templates.

## Features

- **Fast**: Processes large Markdown files quickly and efficiently.
- **Accurate**: Preserves formatting for headings, lists, links, images, code blocks, emphasis, and tables.
- **CLI Tool**: Simple command-line interface for easy integration into workflows.
- **Cross-platform**: Works on Windows, macOS, and Linux.

## Getting Started

To begin, install all dependencies in the project:

```sh
npm install
```

Then, build the CLI by running:

```sh
npm run build
```

Next, link the CLI globally:

```sh
npm link
```

Once linked, you can execute the CLI from your terminal:

```sh
md-to-docx
```

---

You can also run this locally without linking the CLI globally.

```sh
npm run dev
```

## Usage (CLI)

When you run the program you will be prompted to provide:

- Input file: path to the Markdown file to convert (required).
- Or, you can provide the clipboard option to read Markdown from clipboard.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more info.
