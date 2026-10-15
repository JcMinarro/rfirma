//! Las historias de `SedeOrigin`, la cabecera de la ventana de sede: con el dominio que pide la firma o los datos, sin origen válido y desde una orden de terminal.

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
          "La cabecera de 56 px de la ventana de sede: «Te pide la firma», o «Te pide tus datos» si pide los del certificado, y el dominio, en una línea con elipsis; sin origen válido, «Una página sin identificar», y desde la terminal, «Una orden de terminal».",
          "En el desenlace va sin etiqueta, con `asks={null}`: solo el nombre, a la misma altura.",
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
  args: { origin: "sede.villaejemplo.es", asks: "signature", terminal: false },
  argTypes: {
    asks: {
      description: "Qué pide la sede; «ninguna» pinta solo el nombre, como en el desenlace",
      control: "inline-radio",
      options: ["signature", "identity", "none"],
      mapping: { none: null },
      labels: { signature: "La firma", identity: "Los datos", none: "Ninguna" },
    },
  },
} satisfies Meta<typeof SedeOrigin>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithOrigin: Story = {};

export const WithoutOrigin: Story = { args: { origin: null } };

export const LongOrigin: Story = {
  args: { origin: "sede.electronica.ayuntamiento-de-villaejemplo-de-la-sierra.gob.es" },
};

export const NameOnly: Story = {
  args: { asks: null },
  parameters: {
    docs: {
      description: {
        story: "La cabecera del desenlace: solo el nombre de la sede, sin «Te pide la firma».",
      },
    },
  },
};
