//! Las historias de `ReceivedHeading`, el recuento de lo que la sede manda a firmar con su descarga: documentos, referencias y lote remoto.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReceivedHeading } from "./ReceivedHeading";
import { BATCH, ONE_DIGEST, REMOTE_BATCH, receivedActions } from "./testing/fixtures/received";

const meta = {
  title: "Dominio/Sede/ReceivedHeading",
  component: ReceivedHeading,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "El encabezado de lo recibido: «Vas a firmar N documentos» con «Descargar» o «Descargar todo», «Vas a firmar N referencias» con «Descargar huellas», o solo el recuento del lote remoto.",
          "Úsalo debajo de `SedeOrigin`, en la ventana compacta y encima de `ReceivedList` en la ampliada.",
          "No le pongas descarga al lote remoto: antes de elegir certificado no hay documentos ni huellas que descargar.",
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
  args: { received: BATCH, onDownload: receivedActions.onDownload },
} satisfies Meta<typeof ReceivedHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Documents: Story = {};

export const Digests: Story = { args: { received: ONE_DIGEST } };

export const RemoteBatch: Story = { args: { received: REMOTE_BATCH } };
