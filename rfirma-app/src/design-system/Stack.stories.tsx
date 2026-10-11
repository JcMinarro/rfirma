//! La historia de `Stack`, con control para su hueco.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "./Stack";

const meta = {
  title: "Primitivos/Stack",
  component: Stack,
  parameters: {
    docs: {
      description: {
        component: [
          "La pila vertical `rf-stack`: coloca sus hijos uno debajo de otro con un hueco de la escala.",
          "Úsala para apilar bloques: un título, su texto y sus acciones. Para ponerlos en fila, `Row`.",
          "No separes los hijos con márgenes propios ni con `gap` literal: elige un hueco de la escala.",
        ].join("\n\n"),
      },
    },
  },
  argTypes: { gap: { control: "select", options: [undefined, "xs", "md"] } },
  render: (args) => (
    <Stack {...args}>
      <span>Primero</span>
      <span>Segundo</span>
      <span>Tercero</span>
    </Stack>
  ),
} satisfies Meta<typeof Stack>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
export const GapXs: StoryObj<typeof meta> = { args: { gap: "xs" } };
export const GapMd: StoryObj<typeof meta> = { args: { gap: "md" } };
