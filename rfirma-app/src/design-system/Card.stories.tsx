//! La historia de `Card`, con control para si está elevada.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./Card";

const meta = {
  title: "Primitivos/Card",
  component: Card,
  parameters: {
    docs: {
      description: {
        component: [
          "La tarjeta `rf-card`: una superficie con borde y relleno que agrupa un bloque de contenido.",
          "Úsala para separar una unidad (un certificado, un aviso, un resumen) del fondo. Para apilar contenido sin superficie, `Stack`.",
          "No le añadas relleno ni sombra propios: ya los trae de los tokens. No anides tarjetas.",
        ].join("\n\n"),
      },
    },
  },
  args: { children: "Contenido de la tarjeta" },
  argTypes: { elevated: { control: "boolean" } },
} satisfies Meta<typeof Card>;

export default meta;

export const Flat: StoryObj<typeof meta> = {};
export const Elevated: StoryObj<typeof meta> = { args: { elevated: true } };
