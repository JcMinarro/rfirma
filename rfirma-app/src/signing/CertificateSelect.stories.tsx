//! Las historias del selector de certificado: cerrado con y sin elegido, buscando, deshabilitado y abierto con la lista agrupada.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { CertificateSelect } from "./CertificateSelect";
import {
  ENTITY_CERTIFICATE,
  MACOS_CERTIFICATE,
  PERSONAL_CERTIFICATE,
  STORY_CERTIFICATES,
} from "./testing/storyReports";

const meta = {
  title: "Dominio/Firma/CertificateSelect",
  component: CertificateSelect,
  parameters: {
    docs: {
      description: {
        component: [
          "El selector del certificado con que se firma: una caja de dos líneas que, al abrirse, es un buscador con una `CertificateCard` por opción.",
          "Úsalo como primer bloque del panel de firma y en el consentimiento de la sede, que comparten el mismo componente.",
          "No lo sustituyas por un `Select` o un `Combobox` a mano: busca sin tildes y pinta cada opción como su tarjeta. No lo abras tú, salvo en una historia con `defaultOpen`.",
        ].join("\n\n"),
      },
    },
    layout: "centered",
    designSync: { cardMode: "single", primaryStory: "Open" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 332, minHeight: 360 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    certificates: STORY_CERTIFICATES,
    chosen: PERSONAL_CERTIFICATE,
    onChoose: fn(),
  },
} satisfies Meta<typeof CertificateSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ChosenPersonal: Story = {};

export const ChosenOnBehalfOfAnEntity: Story = { args: { chosen: ENTITY_CERTIFICATE } };

export const Unchosen: Story = { args: { chosen: null } };

export const Searching: Story = { args: { certificates: [], chosen: null, searching: true } };

export const Disabled: Story = { args: { disabled: true } };

export const OpenWithMacosStore: Story = {
  args: {
    certificates: [MACOS_CERTIFICATE, PERSONAL_CERTIFICATE],
    chosen: MACOS_CERTIFICATE,
    defaultOpen: true,
  },
};

export const Open: Story = { args: { defaultOpen: true } };
