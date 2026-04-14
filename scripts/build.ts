import { buildSync } from "esbuild";

buildSync({
  entryPoints: ["src/app.ts"],
  outfile: "dist/app.js",
  bundle: true,
  minify: true,
  sourcemap: true,
  target: "esnext",
  platform: "node",
  format: "esm",
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
