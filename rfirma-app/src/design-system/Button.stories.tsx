//! La historia de `Button`, con control para su variante y para si está deshabilitado.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";

const meta = {
  title: "Primitivos/Button",
  component: Button,
  parameters: {
    docs: {
      description: {
        component: [
          'El botón del sistema de diseño, con `type="button"` por defecto para que no envíe formularios sin querer.',
          "Úsalo para cualquier acción. `primary` es la acción principal de la pantalla o del diálogo; `secondary`, las demás con contorno; `ghost`, las microacciones en línea. Sin `variant` sale llano.",
          "No pongas más de un `primary` por pantalla ni escribas a mano las clases `rf-btn`. Para una acción con alternativas, `SplitButton`; para un enlace, un `<a>`.",
        ].join("\n\n"),
      },
    },
  },
  args: { children: "Firmar" },
  argTypes: {
    variant: { control: "select", options: [undefined, "primary", "secondary", "ghost"] },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof Button>;

export default meta;

export const Primary: StoryObj<typeof meta> = { args: { variant: "primary" } };
export const Secondary: StoryObj<typeof meta> = { args: { variant: "secondary" } };
export const Ghost: StoryObj<typeof meta> = { args: { variant: "ghost" } };
export const Plain: StoryObj<typeof meta> = {};
