//! Las historias de `SignaturesStrip`, la franja de firmas sobre el visor de la sede: cerrada y con el panel abierto, en PAdES con un hallazgo y en XAdES con una contrafirma.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ReceivedViewer } from "./ReceivedViewer";
import { SignaturesStrip } from "./SignaturesStrip";
import {
  BAREMO_DOCUMENT,
  PADES_SIGNATURES,
  RESOLUTION_DOCUMENT,
} from "./testing/fixtures/received";

const meta = {
  title: "Dominio/Sede/SignaturesStrip",
  component: SignaturesStrip,
  parameters: {
    layout: "centered",
    designSync: { viewport: "720x604" },
    docs: {
      description: {
        component: [
          "La franja de 56 px sobre el visor con las firmas que ya trae el documento: cuántas y, por validez, icono y recuento; «Ver firmas» despliega encima del visor un panel de 340 px con sus fichas.",
          "Úsala envolviendo el visor de la vista ampliada de la sede. El panel es modal: Escape o pulsar fuera lo cierran, y Escape no cancela el trámite.",
          "No la pintes sin firmas: sin ellas, el visor va solo. No pongas en las fichas datos del certificado que no sean quién firmó, en nombre de quién y cuándo.",
        ].join("\n\n"),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="sede-window" style={{ width: 720, height: 604 }}>
        <Story />
      </div>
    ),
  ],
  args: { report: PADES_SIGNATURES, children: null },
  argTypes: { children: { control: false } },
  render: (args) => (
    <ReceivedViewer
      document={{ ...RESOLUTION_DOCUMENT, previousSignatures: args.report }}
      defaultSignaturesOpen={args.defaultOpen}
    />
  ),
} satisfies Meta<typeof SignaturesStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const OpenWithFinding: Story = { args: { defaultOpen: true } };

export const OpenWithCountersignature: Story = {
  args: { defaultOpen: true },
  render: (args) => (
    <ReceivedViewer document={BAREMO_DOCUMENT} defaultSignaturesOpen={args.defaultOpen} />
  ),
};
