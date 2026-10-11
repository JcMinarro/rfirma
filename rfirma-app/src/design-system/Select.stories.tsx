//! La historia de `Select`: el desplegable de la aplicación, cerrado, con el rótulo oculto y desplegado hacia arriba.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Select } from "./Select";

const options = [
  { value: "system", label: "El del sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
] as const;

type Theme = (typeof options)[number]["value"];

function SelectDemo({ hideLabel, opens }: { hideLabel: boolean; opens: "down" | "up" }) {
  const [value, setValue] = useState<Theme>("light");
  return (
    <div style={{ minWidth: 260, paddingTop: opens === "up" ? 160 : 0 }}>
      <Select
        label="Tema"
        hideLabel={hideLabel}
        value={value}
        options={options}
        onChange={setValue}
        opens={opens}
      />
    </div>
  );
}

const meta = {
  title: "Primitivos/Select",
  component: SelectDemo,
  parameters: {
    docs: {
      description: {
        component: [
          "Un desplegable de la aplicación en lugar del `<select>` nativo, cuya lista pinta el sistema y no se puede vestir con los tokens.",
          "Úsalo para elegir un valor entre pocas opciones de texto, como el idioma o el tema. Para muchas opciones o con búsqueda, `Combobox`.",
          "No lo sustituyas por un `<select>` nativo ni por un `<div>` con `onClick`: perderías el teclado y la accesibilidad que trae.",
        ].join("\n\n"),
      },
    },
  },
  args: { hideLabel: false, opens: "down" },
  argTypes: {
    hideLabel: { control: "boolean" },
    opens: { control: "inline-radio", options: ["down", "up"] },
  },
} satisfies Meta<typeof SelectDemo>;

export default meta;

export const Closed: StoryObj<typeof meta> = {};
export const HiddenLabel: StoryObj<typeof meta> = { args: { hideLabel: true } };
export const OpensUp: StoryObj<typeof meta> = { args: { opens: "up" } };
