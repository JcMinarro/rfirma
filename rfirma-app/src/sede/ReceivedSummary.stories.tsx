//! Las historias de `ReceivedSummary`, el aviso único de lo recibido en la ventana de sede: de un lote, de un lote remoto, de un documento y de lo que ya firmaste tú.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReceivedSummary } from "./ReceivedSummary";
import {
  BATCH_DOCUMENTS,
  DESIGN_CERTIFICATES,
  HASH_DOCUMENT,
  RESOLUTION_DOCUMENT,
  withYourSignature,
  yourSignature,
} from "./testing/fixtures/received";

const meta = {
  title: "Dominio/Sede/ReceivedSummary",
  component: ReceivedSummary,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "Los hechos de lo recibido en un solo `Admonition`, por orden de importancia: cuántos documentos tienen una firma que no es válida, el SHA-1 por permitir, que el lote es remoto y sus documentos se quedan en la sede, cuántos ya firmaste tú, con el certificado elegido o con otro tuyo, y cuántos traen firmas de otras personas. El primero es el título, en su fila, y el resto va debajo; con uno solo, sin título. El tono es el del peor: error con una firma no válida, advertencia con SHA-1 y, si no, información. Con un solo documento, sin número.",
          "Úsalo en la ventana compacta, encima de `ReceivedHeading`; el detalle de cada firma está en la vista ampliada.",
          "No pintes dos avisos: todo lo que haya va en esta caja. No lo pintes vacío: sin firmas previas no hay resumen, y una firma caducada cuenta como no válida. Un documento cuyas únicas firmas son tuyas no cuenta entre los de otras personas, y la línea tuya cambia con el certificado elegido.",
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

export const PrecalculatedHash: Story = { args: { documents: [HASH_DOCUMENT] } };

export const SignedByYou: Story = {
  args: {
    documents: withYourSignature(BATCH_DOCUMENTS, yourSignature("sameCertificate")),
    certificate: DESIGN_CERTIFICATES[0],
  },
};

export const RemoteBatch: Story = { args: { documents: [], remoteBatch: true } };

export const RemoteBatchWithSha1: Story = {
  args: { documents: [], remoteBatch: true, sha1ToAllow: true },
};
