//! Las historias de la zona de soltar: a su ancho máximo y encogida en un hueco estrecho.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DropZone } from "./DropZone";

const meta = {
  title: "Dominio/Documentos/DropZone",
  component: DropZone,
  parameters: {
    docs: {
      description: {
        component: [
          "El recuadro discontinuo que invita a arrastrar un PDF a la ventana o a pulsarlo para abrir el diálogo de abrir.",
          "Úsala donde no hay documento: en la bienvenida, bajo «Empezar», y sola y centrada en el visor vacío. Es la misma en los dos sitios.",
          "No le cambies la altura, el icono ni el texto según el sitio: solo el ancho se ajusta, hasta su máximo.",
        ].join("\n\n"),
      },
    },
    layout: "centered",
  },
  decorators: [
    (Story, { parameters }) => (
      <div style={{ width: parameters.frameWidth ?? 640, display: "grid", justifyItems: "center" }}>
        <Story />
      </div>
    ),
  ],
  args: { onOpen: fn() },
} satisfies Meta<typeof DropZone>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Wide: Story = {};

export const Narrow: Story = { parameters: { frameWidth: 280 } };
