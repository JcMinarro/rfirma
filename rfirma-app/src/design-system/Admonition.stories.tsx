//! La historia de `Admonition`, con controles para su tono, su título y su texto.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Admonition } from "./Admonition";

const meta = {
  title: "Primitivos/Admonition",
  component: Admonition,
  parameters: {
    docs: {
      description: {
        component: [
          'Un aviso de estado en una línea, con su icono: `info` y `warning` con `role="status"`; `error`, con el borde de 2 px de un aviso de error y `role="alert"`.',
          "Úsalo para un hecho que la persona debe ver antes de actuar: firmas previas, un algoritmo poco seguro o una versión con problemas. El título opcional, en negrita, va delante del texto.",
          "No apiles dos: si hay varios hechos, van en uno solo con el más importante como título. No le metas botones ni detalle técnico: un fallo con detalle copiable es `ErrorNotice`. No hay color que gastar: el tono lo dicen el icono y el borde.",
        ].join("\n\n"),
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 440 }}>
        <Story />
      </div>
    ),
  ],
  args: { tone: "info", children: "3 traen firmas de otras personas." },
  argTypes: { tone: { control: "inline-radio", options: ["info", "warning", "error"] } },
} satisfies Meta<typeof Admonition>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Warning: Story = {
  args: { tone: "warning", children: "Esta sede usa un método de firma poco seguro." },
};

export const ErrorWithTitle: Story = {
  args: {
    tone: "error",
    title: "Tiene una firma que no es válida.",
    children: "Trae firmas de otras personas.",
  },
};
