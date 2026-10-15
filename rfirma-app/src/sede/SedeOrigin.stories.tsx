//! Las historias de `SedeOrigin`, la cabecera de la ventana de sede: con el dominio que pide la firma y sin origen válido.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { SedeOrigin } from "./SedeOrigin";

const meta = {
  title: "Dominio/Sede/SedeOrigin",
  component: SedeOrigin,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "La cabecera de 56 px de la ventana de sede: «Te pide la firma» y el dominio, en una línea con elipsis; sin origen válido, «Una página sin identificar».",
          "Úsala arriba del consentimiento, en la ventana compacta a todo lo ancho y en la ampliada encima de la columna derecha.",
          "No le pongas el esquema, la ruta ni un aviso: el origen se nombra a secas y sirve para atribuir, nunca para afirmar.",
        ].join("\n\n"),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="sede-window" style={{ width: 520 }}>
        <Story />
      </div>
    ),
  ],
  args: { origin: "sede.villaejemplo.es" },
} satisfies Meta<typeof SedeOrigin>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithOrigin: Story = {};

export const WithoutOrigin: Story = { args: { origin: null } };

export const LongOrigin: Story = {
  args: { origin: "sede.electronica.ayuntamiento-de-villaejemplo-de-la-sierra.gob.es" },
};
