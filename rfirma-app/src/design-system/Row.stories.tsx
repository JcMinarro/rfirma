//! La historia de `Row`, con control para su hueco.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Row } from "./Row";

const meta = {
  title: "Primitivos/Row",
  component: Row,
  parameters: {
    docs: {
      description: {
        component: [
          "La fila horizontal `rf-row`: alinea sus hijos al centro con un hueco de la escala.",
          "Úsala para poner piezas una al lado de otra: un icono y su texto, un grupo de botones. Para apilar en vertical, `Stack`.",
          "No escribas `gap` ni márgenes literales para separar los hijos: elige un hueco de la escala.",
        ].join("\n\n"),
      },
    },
  },
  argTypes: { gap: { control: "select", options: [undefined, "xs", "sm"] } },
  render: (args) => (
    <Row {...args}>
      <span>Primero</span>
      <span>Segundo</span>
      <span>Tercero</span>
    </Row>
  ),
} satisfies Meta<typeof Row>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
export const GapXs: StoryObj<typeof meta> = { args: { gap: "xs" } };
export const GapSm: StoryObj<typeof meta> = { args: { gap: "sm" } };
