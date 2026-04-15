import { buildSync, type BuildOptions } from "esbuild";

const commonConfig: BuildOptions = {
  bundle: true,
  minify: true,
  sourcemap: true,
  target: "esnext",
  platform: "node",
  format: "esm",
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
};

buildSync({
  entryPoints: ["src/app.ts"],
  outfile: "dist/app.js",
  ...commonConfig,
});

buildSync({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  ...commonConfig,
});
