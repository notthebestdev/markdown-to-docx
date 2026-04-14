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

## Installation

Install globally from npm:

```sh
npm install -g @thebestdev/md-to-docx
```

Then run:

```sh
md-to-docx
```

Or run without a global install:

```sh
npx @thebestdev/md-to-docx
```

## Local Development

```sh
npm install
npm run build
npm link
md-to-docx
```

## Usage (CLI)

When you run the program you will be prompted to provide:

- Input file: path to the Markdown file to convert (required).
- Or, you can provide the clipboard option to read Markdown from clipboard.

You can also use non-interactive CLI flags:

```sh
md-to-docx README.md
md-to-docx --watch docs/**/*.md
md-to-docx --batch --pattern "docs/**/*.md"
md-to-docx README.md --outdir exports
md-to-docx --help
```

By default, output is written next to the source Markdown file.
Use `--outdir` to force all generated DOCX files into a specific folder.

### Watch mode

You can watch one file or a glob pattern and automatically reconvert on changes:

```sh
md-to-docx --watch docs/**/*.md
```

Or watch a single file:

```sh
md-to-docx --watch README.md
```

`watch` mode runs an initial conversion, then listens for file changes until you stop it with `Ctrl+C`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more info.
