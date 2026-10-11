import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const app = resolve(import.meta.dirname, "../..");
const out = resolve(app, "node_modules/.tmp/design-system-bundle");

// biome-ignore lint/suspicious/noExplicitAny: los globales que ponen los dos scripts no tienen tipos.
const page = window as unknown as Record<string, any>;

function entryComponents(): string[] {
  const entry = readFileSync(resolve(app, "design-sync.entry.ts"), "utf8");
  return [...entry.matchAll(/^export \{([^}]+)\} from /gm)].flatMap(([, names = ""]) =>
    names.split(",").map((name) => name.trim()),
  );
}

/** Como una página con dos `<script>`: cada uno corre sobre el `window` del jsdom de vitest. */
function loadScripts() {
  for (const script of ["react.js", "bundle.js"]) {
    new Function(readFileSync(resolve(out, script), "utf8"))();
  }
}

describe("el bundle del sistema de diseño", () => {
  beforeAll(() => {
    execFileSync("node", ["tools/build-design-system.mjs", "--out-dir", out], { cwd: app });
    loadScripts();
  }, 120_000);
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  it("abre con la cabecera que lista los componentes en el orden de la entrada", () => {
    const firstLine = readFileSync(resolve(out, "bundle.js"), "utf8").split("\n", 1)[0] ?? "";
    const header = JSON.parse(firstLine.replace(/^\/\* @ds-bundle: /, "").replace(/ \*\/$/, ""));

    expect(header).toEqual({
      format: 4,
      namespace: "RFirma",
      components: entryComponents().map((name) => ({ name })),
    });
  });

  it("es un script clásico que se puede incrustar en una página", () => {
    const code = readFileSync(resolve(out, "bundle.js"), "utf8");

    expect(code).not.toMatch(/^\s*(import|export)\s/m);
    expect(code).not.toContain("</script");
    expect(code).not.toContain("<!--");
    expect(Buffer.byteLength(code)).toBeLessThanOrEqual(6 * 1024 * 1024);
  });

  it("enlaza Inter por fichero y no en base64", () => {
    const css = readFileSync(resolve(out, "bundle.css"), "utf8");

    expect(css).toContain("url(./fonts/inter-latin.woff2)");
    expect(css).not.toContain("data:font");
  });

  it("pone en window.RFirma cada componente de la entrada", () => {
    for (const name of entryComponents()) {
      expect(page.RFirma?.[name], name).toBeDefined();
    }
  });

  it("monta un Button dentro de DesignRoot sin errores", () => {
    const { React, ReactDOM, RFirma } = page;
    const consoleError = vi.spyOn(console, "error");
    const uncaught: unknown[] = [];
    const onError = (event: ErrorEvent) => uncaught.push(event.error);
    window.addEventListener("error", onError);
    const container = document.createElement("div");
    document.body.append(container);

    ReactDOM.flushSync(() =>
      ReactDOM.createRoot(container).render(
        React.createElement(
          RFirma.DesignRoot,
          null,
          React.createElement(RFirma.Button, { variant: "primary" }, "Firmar"),
        ),
      ),
    );

    expect(container.querySelector(".rf-root button")?.textContent).toBe("Firmar");
    window.removeEventListener("error", onError);
    expect(uncaught).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
