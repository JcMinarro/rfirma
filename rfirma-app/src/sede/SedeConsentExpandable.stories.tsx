//! Las historias provisionales del consentimiento ampliable de sede, que documentan el diseño hasta que se implemente: la ventana compacta con lo recibido y la ampliada con el visor.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { sedeAreaMomentMeta, sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import { SedeConsentCompact, SedeConsentExpanded } from "./SedeReceivedConsent";
import {
  BATCH,
  BATCH_DOCUMENTS,
  DESIGN_CERTIFICATES,
  ONE_DIGEST,
  ONE_DOCUMENT,
  REMOTE_BATCH,
  RESOLUTION_DOCUMENT,
  receivedActions,
} from "./testing/fixtures/received";
import { sedeViewActions } from "./testing/fixtures/sedeView";

const basics = {
  origin: "sede.villaejemplo.es",
  actions: receivedActions,
  certificates: DESIGN_CERTIFICATES,
  countdown: false,
  onConsent: sedeViewActions.onConsent,
  onCancel: sedeViewActions.onCancel,
};

const meta = {
  title: "Pantallas/Ventana de sede/Consentimiento ampliable",
  component: SedeConsentCompact,
  args: { ...basics, received: BATCH },
  parameters: {
    ...sedeMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "Provisional: el diseño del consentimiento de sede cuando se sabe qué se firma. La compacta, a 520 × 420, lleva quién lo pide, el recuento con su descarga, una línea por hecho de las firmas que ya traen los documentos y el selector fijo encima del pie, que se abre hacia arriba; «Ver documentos» la amplía a 1080 × 660, con el documento a la izquierda y el consentimiento, con la lista de documentos y su menú «⋯», en una columna de 360 px.",
          "Úsalo como referencia del momento 2 con documentos o huellas; sin documentos —huellas o lote remoto— no hay vista ampliada.",
          "No enseñes del lote remoto más que su recuento, y no cierres el trámite con Escape mientras el panel de firmas está abierto: Escape cierra el panel.",
        ].join("\n\n"),
      },
    },
  },
} satisfies Meta<typeof SedeConsentCompact>;

export default meta;

type Story = StoryObj<typeof meta>;

const compact = sedeMomentMeta.decorators;
const wide = sedeAreaMomentMeta.decorators;

export const CompactDigest: Story = {
  decorators: compact,
  args: { origin: null, received: ONE_DIGEST },
};

export const CompactRemoteBatch: Story = { decorators: compact, args: { received: REMOTE_BATCH } };

export const CompactOneDocument: Story = { decorators: compact, args: { received: ONE_DOCUMENT } };

export const CompactSeveralDocuments: Story = { decorators: compact };

export const CompactCountdown: Story = { decorators: compact, args: { countdown: true } };

export const ExpandedSeveralDocuments: Story = {
  decorators: wide,
  render: () => <SedeConsentExpanded {...basics} documents={BATCH_DOCUMENTS} />,
};

export const ExpandedOneDocument: Story = {
  decorators: wide,
  render: () => <SedeConsentExpanded {...basics} documents={[RESOLUTION_DOCUMENT]} />,
};

export const ExpandedXmlDocument: Story = {
  decorators: wide,
  render: () => (
    <SedeConsentExpanded {...basics} documents={BATCH_DOCUMENTS} defaultDocument="baremo" />
  ),
};

export const ExpandedPadesSignatures: Story = {
  decorators: wide,
  render: () => (
    <SedeConsentExpanded {...basics} documents={BATCH_DOCUMENTS} defaultSignaturesOpen />
  ),
};

export const ExpandedXadesSignatures: Story = {
  decorators: wide,
  render: () => (
    <SedeConsentExpanded
      {...basics}
      documents={BATCH_DOCUMENTS}
      defaultDocument="baremo"
      defaultSignaturesOpen
    />
  ),
};
