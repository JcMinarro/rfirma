//! Las historias de `CertificateCard`, una por variante de certificado.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { CertificateCard } from "./CertificateCard";
import type { Certificate } from "./certificate";
import { browserStore } from "./testing/storeMarks";

const IN_2020 = 1_579_046_400;
const IN_2030 = 1_893_456_000;
const IN_2099 = 4_070_908_800;

function aCertificate(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: "0123456789abcdef",
    label: "FNMT-GEMELO",
    holderName: "LOVELACE BYRON ADA",
    stampedSigner: "LOVELACE BYRON ADA - NIF 0000****T",
    givenName: "Ada",
    surname: "Lovelace Byron",
    idNumber: "IDCES-00000000T",
    organizationIdentifier: null,
    entityName: null,
    issuer: "FNMT-RCM",
    certificateSerialNumber: "1234567890",
    stores: ["card"],
    status: { kind: "valid", notAfter: IN_2030 },
    remembered: false,
    ...overrides,
  };
}

const meta = {
  title: "Dominio/Firma/CertificateCard",
  component: CertificateCard,
  parameters: {
    docs: {
      description: {
        component: [
          "Cómo se ve un certificado: el titular o representado, la línea con el NIF, sus almacenes, la caducidad y, si no sirve para firmar, por qué.",
          "Úsala allí donde haya que reconocer un certificado: es la misma en el selector de firma y en la lista de Preferencias.",
          "No la uses como opción elegible por sí sola, que para eso está `CertificateSelect`, ni recompongas sus líneas a mano en otra pantalla.",
        ].join("\n\n"),
      },
    },
  },
  args: { certificate: aCertificate() },
} satisfies Meta<typeof CertificateCard>;

export default meta;

export const Personal: StoryObj<typeof meta> = {};

export const OnBehalfOfAnEntity: StoryObj<typeof meta> = {
  args: {
    certificate: aCertificate({
      entityName: "Analytical Engines S.L.",
      organizationIdentifier: "VATES-B00000000",
    }),
  },
};

export const Expired: StoryObj<typeof meta> = {
  args: { certificate: aCertificate({ status: { kind: "expired", notAfter: IN_2020 } }) },
};

export const CannotSign: StoryObj<typeof meta> = {
  args: {
    certificate: aCertificate({ status: { kind: "notYetValid", notBefore: IN_2099 } }),
  },
};

export const SeveralStores: StoryObj<typeof meta> = {
  args: {
    certificate: aCertificate({
      stores: [
        browserStore("Firefox", "Snap"),
        browserStore("Brave", "Flatpak"),
        "sharedChromium",
        "installed",
      ],
    }),
  },
};
