//! La historia de `ReceivedList`, los documentos de la vista ampliada del consentimiento de sede, con la resolución activa.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ReceivedList } from "./ReceivedList";
import { BATCH_DOCUMENTS, receivedActions } from "./testing/fixtures/received";

const meta = {
  title: "Dominio/Sede/ReceivedList",
  component: ReceivedList,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "Los documentos que la sede manda a firmar, en la columna de la vista ampliada: una fila de 40 px por documento; la activa, resaltada y con el menú «⋯» —Abrir con…, Guardar copia y Copiar SHA-256—, que se abre hacia arriba.",
          "Úsala debajo de `ReceivedHeading`, encima del selector de certificado; cada fila cambia el documento del visor.",
          "No la pongas en la ventana compacta, que solo lleva el recuento y el resumen, ni ofrezcas «Abrir con…» en un tipo que rFirma no sabe abrir.",
        ].join("\n\n"),
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 328, height: 300, display: "flex" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    documents: BATCH_DOCUMENTS,
    actions: receivedActions,
    selected: "resolution",
    onSelect: fn(),
  },
} satisfies Meta<typeof ReceivedList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
