//! La historia provisional del momento sin certificado utilizable con el esqueleto del consentimiento compacto, que documenta el diseño hasta que se implemente.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import type { NamedFailure } from "../errors/classify";
import type { NoCertificateReason } from "./errand";
import { SedeMissingCertificate } from "./SedeMissingCertificate";
import { sedeViewActions } from "./testing/fixtures/sedeView";

const INSTALL_FAILURE: NamedFailure = {
  situation: "pkcs12Unreadable",
  detail: "no se puede leer el fichero",
  attemptsLeft: null,
};

interface MissingDesignProps {
  reason: NoCertificateReason;
  owned: 1 | 2 | 3;
  errand: "signature" | "identity" | "terminal";
  withOrigin: boolean;
  installFailed: boolean;
}

function MissingDesign({ reason, owned, errand, withOrigin, installFailed }: MissingDesignProps) {
  const terminal = errand === "terminal";

  return (
    <SedeMissingCertificate
      origin={withOrigin && !terminal ? "sede.villaejemplo.es" : null}
      asks={errand === "identity" ? "identity" : "signature"}
      terminal={terminal}
      reason={reason}
      owned={reason === "none" ? 0 : owned}
      failure={installFailed ? INSTALL_FAILURE : null}
      onInstall={sedeViewActions.onInstallCertificate}
      onLookAgain={sedeViewActions.onLookAgain}
      onLeave={sedeViewActions.onCancel}
    />
  );
}

const meta = {
  title: "Pantallas/Ventana de sede/Sin certificado nuevo",
  ...sedeMomentMeta,
  component: MissingDesign,
  args: {
    reason: "none",
    owned: 2,
    errand: "signature",
    withOrigin: true,
    installFailed: false,
  },
  argTypes: {
    reason: {
      description: "Por qué no hay certificado utilizable",
      control: "radio",
      options: ["none", "excluded"],
      labels: { none: "No tiene ninguno", excluded: "La sede los excluye" },
    },
    owned: {
      description: "Cuántos certificados tiene la persona; solo cuenta si la sede los excluye",
      control: "radio",
      options: [1, 2, 3],
    },
    errand: {
      description: "Qué se pide y quién lo pide",
      control: "radio",
      options: ["signature", "identity", "terminal"],
      labels: {
        signature: "La firma, desde una sede",
        identity: "Los datos, desde una sede",
        terminal: "Una orden de terminal",
      },
    },
    withOrigin: {
      description:
        "Si se sabe qué sede lo pidió; sin origen, la cabecera la nombra sin identificar",
    },
    installFailed: {
      description: "Si falló el último intento de instalar un certificado",
    },
  },
  parameters: {
    ...sedeMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "Provisional: el diseño del momento sin certificado utilizable con el esqueleto del consentimiento compacto. Arriba, la misma cabecera que al consentir, con quién lo pide; debajo, alineado a la izquierda, solo el título con el icono a su izquierda.",
          "El pie conserva las posiciones del consentimiento: a la izquierda, «Volver a buscar», que cede y se corta si no cabe; a la derecha, «Cancelar» e «Instalar un certificado…» como principal. Desde una orden de terminal con todos excluidos no hay arreglo que ofrecer y solo queda «Cerrar».",
          "Si falla la instalación, el fallo va bajo el título en un aviso de error con su detalle técnico.",
        ].join("\n\n"),
      },
    },
  },
} satisfies Meta<typeof MissingDesign>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MissingCertificate: Story = {};
