//! Las historias del consentimiento de sede: la ventana compacta con lo recibido y la ampliada con el visor, que abre «Ver documentos».

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { sedeAreaMomentMeta, sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import type { ReaderStatus } from "../signing/certificate";
import type { SameSignerNotice } from "../signing/sameSignerNotice";
import type { PreviousSignaturesState, Received } from "./received";
import { SedeReceivedConsent } from "./SedeReceivedConsent";
import {
  BATCH_DOCUMENTS,
  DESIGN_CERTIFICATES,
  LOCAL_BATCH_DOCUMENTS,
  REMOTE_BATCH,
  RESOLUTION_DOCUMENT,
  receivedActions,
  UNTITLED_DOCUMENT,
  withPreviousSignatures,
  withYourSignature,
  yourSignature,
} from "./testing/fixtures/received";
import { sedeViewActions } from "./testing/fixtures/sedeView";

const DOCUMENTS = {
  several: BATCH_DOCUMENTS,
  one: [RESOLUTION_DOCUMENT],
  untitled: [UNTITLED_DOCUMENT],
  localBatch: LOCAL_BATCH_DOCUMENTS,
};

const WITHOUT_DOCUMENTS = { remoteBatch: REMOTE_BATCH };

const TERMINAL_DOCUMENT = "/home/ada/contratos/convenio.pdf";

type DocumentsCase = keyof typeof DOCUMENTS;
type ReceivedCase = DocumentsCase | keyof typeof WITHOUT_DOCUMENTS;

const READERS = {
  none: { kind: "noReader" },
  card: { kind: "dnieReady" },
  reading: { kind: "reading" },
  unreadable: { kind: "unreadable" },
} satisfies Record<string, ReaderStatus>;

interface ExpandableConsentDesignProps {
  view: "compact" | "expanded";
  errand: "site" | "identity" | "terminal";
  received: ReceivedCase;
  previousSignatures: PreviousSignaturesState;
  yourSignature: SameSignerNotice | "none";
  certificates: "one" | "several";
  reader: keyof typeof READERS;
  withOrigin: boolean;
  siteFiltersCertificates: boolean;
  sha1ToAllow: boolean;
  countdown: boolean;
  pendingActions: boolean;
  defaultDocument?: string;
  defaultSignaturesOpen?: boolean;
}

function hasDocuments(received: ReceivedCase): received is DocumentsCase {
  return received in DOCUMENTS;
}

function receivedOf(
  received: ReceivedCase,
  previousSignatures: PreviousSignaturesState,
  yours: SameSignerNotice | "none",
): Received {
  if (!hasDocuments(received)) return WITHOUT_DOCUMENTS[received];
  const documents = withPreviousSignatures(DOCUMENTS[received], previousSignatures);
  return {
    kind: "documents",
    documents: yours === "none" ? documents : withYourSignature(documents, yourSignature(yours)),
  };
}

function ExpandableConsentDesign({
  view,
  errand,
  received,
  previousSignatures,
  yourSignature: yours,
  certificates,
  reader,
  withOrigin,
  siteFiltersCertificates,
  sha1ToAllow,
  countdown,
  pendingActions,
  defaultDocument,
  defaultSignaturesOpen,
}: ExpandableConsentDesignProps) {
  const shown = receivedOf(errand === "terminal" ? "one" : received, previousSignatures, yours);
  const basics = {
    origin: withOrigin ? "sede.villaejemplo.es" : null,
    certificates: certificates === "one" ? DESIGN_CERTIFICATES.slice(0, 1) : DESIGN_CERTIFICATES,
    reader: READERS[reader],
    narrowed: siteFiltersCertificates,
    sha1ToAllow,
    countdown,
    onConsent: sedeViewActions.onConsent,
    onCancel: sedeViewActions.onCancel,
  };

  const countdownStart = `${countdown}-${sha1ToAllow}`;

  return (
    <SedeReceivedConsent
      key={`${view}-${countdownStart}`}
      {...basics}
      received={shown}
      asks={errand === "identity" ? "identity" : "signature"}
      terminalDocument={errand === "terminal" ? TERMINAL_DOCUMENT : undefined}
      actions={pendingActions ? receivedActions : { onCopy: receivedActions.onCopy }}
      onExpandWindow={onExpandWindow}
      defaultExpanded={view === "expanded"}
      defaultDocument={defaultDocument}
      defaultSignaturesOpen={defaultSignaturesOpen}
    />
  );
}

const onExpandWindow = fn();

const hidden = { table: { disable: true } };

const meta = {
  title: "Pantallas/Ventana de sede/Consentimiento",
  component: ExpandableConsentDesign,
  args: {
    view: "compact",
    errand: "site",
    received: "several",
    previousSignatures: "troubled",
    yourSignature: "none",
    certificates: "several",
    reader: "none",
    withOrigin: true,
    siteFiltersCertificates: false,
    sha1ToAllow: false,
    countdown: false,
    pendingActions: false,
  },
  argTypes: {
    view: hidden,
    defaultDocument: hidden,
    defaultSignaturesOpen: hidden,
    errand: {
      description:
        "Qué trámite abre la ventana: una firma de sede, la petición de datos o una orden de terminal",
      control: "inline-radio",
      options: ["site", "identity", "terminal"],
      labels: { site: "Firma de una sede", identity: "Datos", terminal: "Orden de terminal" },
    },
    received: {
      description: "Qué ha enviado la sede para firmar",
      control: "select",
      options: [...Object.keys(DOCUMENTS), ...Object.keys(WITHOUT_DOCUMENTS)],
      labels: {
        several: "Varios documentos",
        one: "Un documento",
        untitled: "Un documento sin título",
        localBatch: "Lote local",
        remoteBatch: "Lote remoto",
      },
    },
    previousSignatures: {
      description: "Las firmas que ya traen los documentos y si alguna tiene problemas",
      control: "inline-radio",
      options: ["none", "signed", "troubled"],
      labels: { none: "Sin firmas", signed: "Todas válidas", troubled: "Con problema" },
    },
    yourSignature: {
      description: "Si alguno de los documentos ya lleva una firma tuya",
      control: "inline-radio",
      options: ["none", "sameCertificate", "otherCertificate"],
      labels: {
        none: "No",
        sameCertificate: "Con este certificado",
        otherCertificate: "Con otro certificado tuyo",
      },
    },
    certificates: {
      description: "Cuántos certificados ofrece el selector",
      control: "inline-radio",
      options: ["one", "several"],
      labels: { one: "Uno", several: "Varios" },
    },
    reader: {
      description: "El estado del lector de tarjetas bajo el selector",
      control: "inline-radio",
      options: Object.keys(READERS),
      labels: {
        none: "Sin lector",
        card: "Con tarjeta",
        reading: "Leyendo",
        unreadable: "Ilegible",
      },
    },
    withOrigin: {
      description: "Si se sabe qué sede lo pide; sin origen, la ventana la nombra sin identificar",
    },
    siteFiltersCertificates: {
      description: "La sede solo admite algunos certificados (se ve abriendo el selector)",
    },
    sha1ToAllow: {
      description:
        "La sede pide SHA-1 sin permiso: el aviso, «Firmar igualmente» y la cuenta atrás",
    },
    countdown: { description: "El botón de firmar espera unos segundos antes de habilitarse" },
    pendingActions: {
      description:
        "«Descargar», «Abrir con…» y «Guardar copia»: diseño pendiente que la ventana real todavía no tiene",
    },
  },
  parameters: {
    ...sedeMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "El consentimiento de sede cuando se sabe qué se firma. La compacta, a 520 × 420, lleva quién lo pide, debajo el selector, que se abre hacia abajo, con la línea del lector, y pegado al pie lo que se firma: primero un único aviso con los hechos de las firmas que ya traen los documentos y después el recuento; desde una orden de terminal, el nombre del documento en vez del recuento. «Ver documentos», en el hueco izquierdo del pie, lleva la ventana a 1080 × 660, con el documento a la izquierda y, en una columna de 400 px, el selector encima de la lista de documentos y su menú «⋯», y «Ocultar» en el mismo sitio, solo con su icono. Lo que ya firmaste tú lo dice la franja del documento. La descarga y «Abrir con…» son diseño pendiente: los enseña el control de acciones pendientes.",
          "Úsalo como referencia del momento 2 con documentos, al pedir los datos y desde una orden de terminal; sin documentos de una sede no hay vista ampliada. Los controles cambian los datos, no la pantalla.",
          "Si la sede acotó los certificados, lo dice el pie de la lista abierta, no una línea bajo el selector. Si pide SHA-1 sin permiso, lo dice el mismo aviso, tras la firma no válida si la hay, y el botón dice «Firmar igualmente», con la cuenta atrás obligada; con el permiso ya dado no se dice nada.",
          "No enseñes del lote remoto más que su recuento, ni del reto más que qué es; no digas el tipo del documento ni si se firma, se cofirma o se contrafirma; no pongas ayuda bajo la tarjeta ilegible, y no cierres el trámite con Escape mientras el panel de firmas está abierto: Escape cierra el panel.",
        ].join("\n\n"),
      },
    },
  },
} satisfies Meta<typeof ExpandableConsentDesign>;

export default meta;

type Story = StoryObj<typeof meta>;

const compact = sedeMomentMeta.decorators;

const expanded = {
  decorators: sedeAreaMomentMeta.decorators,
  argTypes: {
    errand: hidden,
    received: { control: "select", options: Object.keys(DOCUMENTS) },
  },
} satisfies Story;

export const CompactRemoteBatch: Story = { decorators: compact, args: { received: "remoteBatch" } };

export const CompactOneDocument: Story = { decorators: compact, args: { received: "one" } };

export const CompactSeveralDocuments: Story = { decorators: compact };

export const CompactCountdown: Story = { decorators: compact, args: { countdown: true } };

export const ExpandedSeveralDocuments: Story = {
  ...expanded,
  args: { view: "expanded", pendingActions: true },
};

export const ExpandedOneDocument: Story = {
  ...expanded,
  args: { view: "expanded", pendingActions: true, received: "one" },
};

export const ExpandedXmlDocument: Story = {
  ...expanded,
  args: { view: "expanded", pendingActions: true, defaultDocument: "baremo" },
};

export const ExpandedImageDocument: Story = {
  ...expanded,
  args: { view: "expanded", pendingActions: true, defaultDocument: "poster" },
};

export const ExpandedOtherDocument: Story = {
  ...expanded,
  args: { view: "expanded", pendingActions: true, defaultDocument: "beneficiaries" },
};

export const ExpandedPadesSignatures: Story = {
  ...expanded,
  args: { view: "expanded", pendingActions: true, defaultSignaturesOpen: true },
};

export const ExpandedXadesSignatures: Story = {
  ...expanded,
  args: {
    view: "expanded",
    pendingActions: true,
    defaultDocument: "baremo",
    defaultSignaturesOpen: true,
  },
};
