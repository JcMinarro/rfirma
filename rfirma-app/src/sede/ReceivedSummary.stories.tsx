//! Las historias de `ReceivedSummary`, el resumen de las firmas previas en la ventana compacta: de un lote y de un documento.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReceivedSummary } from "./ReceivedSummary";
import { BATCH_DOCUMENTS, RESOLUTION_DOCUMENT } from "./testing/fixtures/received";

const meta = {
  title: "Dominio/Sede/ReceivedSummary",
  component: ReceivedSummary,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "Las firmas que ya trae lo recibido, una línea por hecho: atenuada, cuántos documentos ya traen firmas de otras personas; con el icono de fallo y en seminegrita, cuántos tienen una firma que no es válida. Con un solo documento, sin número.",
          "Úsalo en la ventana compacta, debajo de `ReceivedHeading`; el detalle de cada firma está en la vista ampliada.",
          "No lo pintes vacío: sin firmas previas no hay resumen, y una firma caducada cuenta como no válida.",
        ].join("\n\n"),
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 488 }}>
        <Story />
      </div>
    ),
  ],
  args: { documents: BATCH_DOCUMENTS },
} satisfies Meta<typeof ReceivedSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Batch: Story = {};

export const OneDocument: Story = { args: { documents: [RESOLUTION_DOCUMENT] } };
