import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "DocumentViewer.css"), "utf8");

function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `rule ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

describe("drag handle visibility", () => {
  it("is hidden and not a pointer target by default", () => {
    const base = rule(".viewer__handle");
    expect(base).toContain("opacity: 0");
    expect(base).toContain("pointer-events: none");
  });

  it("shows on hover over the box and during a press, not on focus", () => {
    const shown = rule(".viewer__box:active .viewer__handle");
    expect(css).toContain(".viewer__box:hover .viewer__handle,");
    expect(shown).toContain("opacity: 1");
    expect(css).not.toMatch(/focus[^{]*\.viewer__handle/);
  });

  it("is always shown without hover", () => {
    expect(css).toMatch(/@media \(hover: none\) \{\s*\.viewer__handle \{\s*opacity: 1/);
  });

  it("fades, and does not under reduced motion", () => {
    expect(rule(".viewer__handle")).toContain("transition: opacity");
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\) \{\s*\.viewer__handle \{\s*transition: none/,
    );
  });
});
