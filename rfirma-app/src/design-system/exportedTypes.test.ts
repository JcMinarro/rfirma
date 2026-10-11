import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "../..");
const out = resolve(app, "node_modules/.tmp/design-system-types");

const CONSUMER = `
import type { ComponentProps } from "react";
import * as ds from "./design-sync.entry";

type Components = { [K in keyof typeof ds as K extends Capitalize<string> ? K : never]: (typeof ds)[K] };
type PropsOf<C> = C extends (props: infer P) => unknown ? P : never;
type Loose = { [K in keyof Components]: unknown extends PropsOf<Components[K]> ? K : never }[keyof Components];
type Bare = { [K in keyof Components]: keyof PropsOf<Components[K]> extends never ? K : never }[keyof Components];

export const noLooseProps: [Loose] extends [never] ? true : Loose = true;
export const noBareProps: [Bare] extends [never] ? true : Bare = true;
export const inheritsButtonAttributes: Pick<ComponentProps<typeof ds.Button>, "variant" | "onClick" | "disabled" | "aria-label"> = {
  variant: "primary",
  onClick: () => {},
  disabled: true,
  "aria-label": "Firmar",
};
`;

const CONSUMER_CONFIG = {
  extends: "../../../../tsconfig.base.json",
  compilerOptions: {
    lib: ["ES2022", "DOM"],
    jsx: "react-jsx",
    types: ["vite/client"],
    noUnusedLocals: false,
  },
  files: ["consumer.ts"],
};

function tsc(...args: string[]): string {
  try {
    execFileSync("pnpm", ["exec", "tsc", "--pretty", "false", ...args], {
      cwd: app,
      encoding: "utf8",
    });
    return "";
  } catch (error) {
    return String((error as { stdout?: string }).stdout ?? error);
  }
}

describe("los tipos del sistema de diseño exportado", () => {
  afterAll(() => rmSync(out, { recursive: true, force: true }));

  it("dan a cada componente props con nombre, con los atributos HTML heredados", () => {
    rmSync(out, { recursive: true, force: true });
    expect(tsc("-p", "tsconfig.design-system.json", "--outDir", out)).toBe("");
    mkdirSync(out, { recursive: true });
    writeFileSync(resolve(out, "consumer.ts"), CONSUMER);
    writeFileSync(resolve(out, "tsconfig.json"), JSON.stringify(CONSUMER_CONFIG));

    expect(tsc("-p", resolve(out, "tsconfig.json"))).toBe("");
  });
});
