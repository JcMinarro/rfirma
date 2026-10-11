/**
 * `build-design-system`: el bundle del sistema de diseño para páginas sin módulos, sin red y con su React aparte.
 *
 * Deja en `dist-design-system/` (o en `--out-dir`) `bundle.js`, un script
 * clásico que asigna `window.RFirma` con todo lo que exporta
 * `design-sync.entry.ts` y toma React de `window.React` y `window.ReactDOM`;
 * `bundle.css`, con Inter en `fonts/` por `url()`; `react.js`, que pone esos
 * dos globales con el React de la app; e `index.d.ts`, la entrada de los tipos
 * que emite `tsc` antes.
 */

import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { build } from "vite";

const app = resolve(import.meta.dirname, "..");
const entry = resolve(app, "design-sync.entry.ts");
const { values } = parseArgs({ options: { "out-dir": { type: "string" } } });
const outDir = resolve(app, values["out-dir"] ?? "dist-design-system");

const MAX_BUNDLE_BYTES = 6 * 1024 * 1024;
const FORBIDDEN = ["</script", "<!--"];
const require = createRequire(resolve(app, "package.json"));

const GLOBALS = {
  react: "window.React",
  "react-dom": "window.ReactDOM",
  "react-dom/client": "window.ReactDOM",
};

/** Los nombres que exporta cada módulo de React, para que el shim los reexporte uno a uno. */
function exportNames(specifier) {
  return Object.keys(require(specifier)).filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
}

function shimSource(specifier) {
  if (specifier === "react/jsx-runtime" || specifier === "react/jsx-dev-runtime") {
    return [
      "const R = window.React;",
      "const make = (type, props, key) => R.createElement(type, key === undefined ? props : { ...props, key });",
      "export const Fragment = R.Fragment;",
      "export const jsx = R.jsx ?? make;",
      "export const jsxs = R.jsxs ?? make;",
      "export const jsxDEV = R.jsxDEV ?? make;",
    ].join("\n");
  }
  const global = GLOBALS[specifier];
  const names = exportNames(specifier).filter((name) => name !== "default");
  return [
    `const g = ${global};`,
    "export default g;",
    ...names.map((name) => `export const ${name} = g.${name};`),
  ].join("\n");
}

/** Resuelve React a los globales de la página en vez de empaquetarlo. */
function reactFromWindow() {
  const prefix = "\0rfirma-react:";
  const shimmed = new Set([...Object.keys(GLOBALS), "react/jsx-runtime", "react/jsx-dev-runtime"]);
  return {
    name: "rfirma:react-from-window",
    enforce: "pre",
    resolveId(source) {
      return shimmed.has(source) ? prefix + source : null;
    },
    load(id) {
      return id.startsWith(prefix) ? shimSource(id.slice(prefix.length)) : null;
    },
  };
}

/** Una entrada virtual: el módulo `source` como script clásico. */
function virtualEntry(source) {
  const id = "\0rfirma-entry";
  return {
    name: "rfirma:entry",
    resolveId: (s) => (s === id ? id : null),
    load: (s) => (s === id ? source : null),
    id,
  };
}

async function buildScript({ source, fileName, plugins = [] }) {
  const main = virtualEntry(source);
  await build({
    configFile: false,
    root: app,
    base: "./",
    mode: "production",
    logLevel: "warn",
    publicDir: false,
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    plugins: [...plugins, main],
    build: {
      outDir,
      emptyOutDir: false,
      minify: true,
      assetsInlineLimit: 0,
      modulePreload: false,
      cssCodeSplit: false,
      copyPublicDir: false,
      rollupOptions: {
        input: main.id,
        output: {
          format: "iife",
          entryFileNames: fileName,
          assetFileNames: ({ names }) =>
            (names[0] ?? "").endsWith(".css") ? "bundle.css" : "fonts/[name][extname]",
        },
      },
    },
  });
}

function entryComponents() {
  return [...readFileSync(entry, "utf8").matchAll(/^export \{([^}]+)\} from /gm)].flatMap(
    ([, names]) => names.split(",").map((name) => name.trim()),
  );
}

function stampBundle(components) {
  const path = resolve(outDir, "bundle.js");
  const header = {
    format: 4,
    namespace: "RFirma",
    components: components.map((name) => ({ name })),
  };
  const code = `/* @ds-bundle: ${JSON.stringify(header)} */\n${readFileSync(path, "utf8")}`;
  const bytes = Buffer.byteLength(code);
  if (bytes > MAX_BUNDLE_BYTES)
    throw new Error(`bundle.js ocupa ${bytes} bytes; el máximo es ${MAX_BUNDLE_BYTES}`);
  for (const text of FORBIDDEN) {
    if (code.includes(text))
      throw new Error(`bundle.js contiene «${text}» y no puede ir incrustado en una página`);
  }
  writeFileSync(path, code);
}

for (const stale of ["bundle.js", "bundle.css", "react.js", "fonts"]) {
  rmSync(resolve(outDir, stale), { recursive: true, force: true });
}

await buildScript({
  fileName: "bundle.js",
  plugins: [reactFromWindow()],
  source: `import * as ds from ${JSON.stringify(entry)};\nwindow.RFirma = { ...ds };\n`,
});
await buildScript({
  fileName: "react.js",
  source: [
    'import * as React from "react";',
    'import * as ReactDOM from "react-dom";',
    'import * as ReactDOMClient from "react-dom/client";',
    "window.React = { ...React };",
    "window.ReactDOM = { ...ReactDOM, ...ReactDOMClient };",
  ].join("\n"),
});
stampBundle(entryComponents());
writeFileSync(resolve(outDir, "index.d.ts"), 'export * from "./design-sync.entry";\n');
