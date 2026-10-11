//! La historia de `ProgressBar`, con controles para su valor y su variante.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProgressBar } from "./ProgressBar";

const meta = {
  title: "Primitivos/ProgressBar",
  component: ProgressBar,
  parameters: {
    docs: {
      description: {
        component: [
          'La barra de progreso `rf-progress`, con `role="progressbar"`.',
          "Úsala cuando sepas cuánto falta. Si no lo sabes, un indicador de espera con su texto.",
          'Aportas `value` y, si no van de 0 a 100, `min` y `max`; `variant="framed"`, para enmarcarla; y su nombre accesible con `aria-label` o `aria-labelledby`. Además, lo de un `<div>` salvo `children`.',
          "No la dejes sin nombre accesible: lo pone quien la usa. No le metas texto dentro.",
        ].join("\n\n"),
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: { value: 50, "aria-label": "Progreso" },
  argTypes: { variant: { control: "select", options: [undefined, "framed"] } },
} satisfies Meta<typeof ProgressBar>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
export const Framed: StoryObj<typeof meta> = { args: { variant: "framed" } };
