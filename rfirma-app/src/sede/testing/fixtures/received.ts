//! Lo recibido de ejemplo que comparten las historias y las pruebas del consentimiento de sede: el lote de la resolución, sus firmas PAdES y XAdES, las huellas y un PDF que pinta su texto.

import { fn } from "storybook/test";
import type { Certificate } from "../../../signing/certificate";
import type { PreviousSignaturesReport } from "../../../signing/previousSignatures";
import { NO_PREVIOUS_SIGNATURES } from "../../../signing/previousSignatures";
import type { PdfDocument, PdfPage, Viewport } from "../../../viewer/pdf";
import type { Received, ReceivedActions, ReceivedDocument } from "../../received";
import { previousSignature, previousSignaturesReport } from "./previousSignatures";
import { certificate } from "./sedeWindow";

const A4 = { width: 595, height: 842 };

type Line = { text: string; size: number; weight?: "bold"; muted?: boolean; gap?: number };

const RESOLUTION: readonly Line[] = [
  { text: "Ayuntamiento de Villaejemplo · Secretaría General", size: 9, muted: true },
  { text: "Resolución n.º 2026-0412", size: 15, weight: "bold" },
  {
    text: "Concesión de ayudas para la rehabilitación de fachadas. Convocatoria 2026.",
    size: 11,
    weight: "bold",
  },
  {
    text: "Vista la propuesta de la comisión de valoración de 2 de octubre de 2026 y el informe favorable de la intervención municipal, y en uso de las atribuciones que me confiere la normativa de régimen local,",
    size: 11,
  },
  { text: "RESUELVO", size: 11, weight: "bold" },
  {
    text: "Primero. Conceder las ayudas que figuran en el anexo I a las personas beneficiarias allí relacionadas, por un importe total de 84.250,00 €.",
    size: 11,
  },
  {
    text: "Segundo. Denegar las solicitudes que no alcanzan la puntuación mínima según el baremo del anexo II.",
    size: 11,
  },
  {
    text: "Tercero. Notificar esta resolución a las personas interesadas, con indicación de los recursos que proceden contra ella.",
    size: 11,
  },
  {
    text: "Contra esta resolución, que pone fin a la vía administrativa, cabe interponer recurso potestativo de reposición en el plazo de un mes.",
    size: 11,
  },
];

function viewportAt(scale: number): Viewport {
  return {
    width: A4.width * scale,
    height: A4.height * scale,
    convertToPdfPoint: (x, y) => [x / scale, A4.height - y / scale],
    convertToViewportPoint: (x, y) => [x * scale, (A4.height - y) * scale],
  };
}

function inJsdom(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
}

function paint(canvas: HTMLCanvasElement, viewport: Viewport, lines: readonly Line[]) {
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = inJsdom() ? null : canvas.getContext("2d");
  if (context === null) return;
  const scale = viewport.width / A4.width;
  context.scale(scale, scale);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, A4.width, A4.height);
  const margin = 56;
  let y = 64;
  for (const line of lines) {
    context.font = `${line.weight ?? "normal"} ${line.size}px sans-serif`;
    context.fillStyle = line.muted ? "#64748b" : "#0f172a";
    for (const row of wrapped(context, line.text, A4.width - 2 * margin)) {
      y += line.size * 1.5;
      context.fillText(row, margin, y);
    }
    y += line.gap ?? 10;
  }
}

function wrapped(context: CanvasRenderingContext2D, text: string, width: number): string[] {
  const rows: string[] = [];
  let row = "";
  for (const word of text.split(" ")) {
    const next = row === "" ? word : `${row} ${word}`;
    if (row !== "" && context.measureText(next).width > width) {
      rows.push(row);
      row = word;
    } else {
      row = next;
    }
  }
  return [...rows, row];
}

function pageWith(number: number, lines: readonly Line[]): PdfPage {
  return {
    number,
    rotate: 0,
    view: [0, 0, A4.width, A4.height],
    getViewport: ({ scale }) => viewportAt(scale),
    render: ({ canvas, viewport }) => {
      paint(canvas, viewport, number === 1 ? lines : []);
      return { promise: Promise.resolve(), cancel: () => {} };
    },
  };
}

/** La resolución del diseño, de tres hojas, con su texto pintado en la primera; en jsdom, sin pintar. */
const resolutionPdf: PdfDocument = {
  pageCount: 3,
  getPage: (number) => Promise.resolve(pageWith(number, RESOLUTION)),
};

/** El baremo en XML, que el visor enseña como texto literal. */
const BAREMO_XML = `<?xml version="1.0" encoding="UTF-8"?>
<baremo convocatoria="FACHADAS-2026">
  <criterio id="1" peso="40">Antigüedad del edificio</criterio>
  <criterio id="2" peso="30">Estado de conservación</criterio>
  <criterio id="3" peso="20">Accesibilidad</criterio>
  <criterio id="4" peso="10">Eficiencia energética</criterio>
  <puntuacionMinima>50</puntuacionMinima>
  <solicitudes total="38" concedidas="21"/>
</baremo>`;

/** Las tres firmas PAdES de la resolución: una válida, una caducada que cierra el documento y una que no admitía, con el documento cambiado después. */
export const PADES_SIGNATURES: PreviousSignaturesReport = previousSignaturesReport(
  [
    previousSignature({
      name: "JUAN EJEMPLO PRUEBA",
      issuer: "AC FNMT Usuarios",
      signingDate: { kind: "declared", at: "2026-10-02T07:15:00Z" },
    }),
    previousSignature({
      name: "MARÍA EJEMPLO EJEMPLO",
      organizationIdentifier: "Ayuntamiento de Villaejemplo",
      issuer: "AC Representación",
      signingDate: { kind: "stamped", at: "2026-10-08T10:40:00Z", tsa: "TSA de pruebas" },
      validity: "expired",
      validityReason: { kind: "certificateExpired", date: "2026-09-30", holder: null },
      closesDocument: true,
    }),
    previousSignature({
      name: "LUCÍA PRUEBA EJEMPLO",
      issuer: "AC FNMT Usuarios",
      signingDate: { kind: "declared", at: "2026-10-13T08:32:00Z" },
      validity: "invalid",
      validityReason: { kind: "cosignNotAdmitted", closedBy: "Firma 2" },
    }),
  ],
  {
    format: "pades",
    findings: ["modifiedAfterLastSignature"],
    warningCount: 3,
    tone: "attention",
    changedAfterLastSignature: true,
  },
);

/** Las dos firmas XAdES del baremo, la primera contrafirmada, todas válidas. */
export const XADES_SIGNATURES: PreviousSignaturesReport = previousSignaturesReport(
  [
    previousSignature({
      name: "MARÍA EJEMPLO EJEMPLO",
      organizationIdentifier: "Ayuntamiento de Villaejemplo",
      issuer: "AC Representación",
      signingDate: { kind: "declared", at: "2026-10-06T09:02:00Z" },
      countersignatures: [
        previousSignature({
          name: "JUAN EJEMPLO PRUEBA",
          issuer: "AC FNMT Usuarios",
          signingDate: { kind: "stamped", at: "2026-10-07T07:30:00Z", tsa: "TSA de pruebas" },
        }),
      ],
    }),
    previousSignature({
      name: "LUCÍA PRUEBA EJEMPLO",
      issuer: "AC FNMT Usuarios",
      signingDate: { kind: "declared", at: "2026-10-09T15:45:00Z" },
    }),
  ],
  { format: "xades" },
);

const CO_SIGNED = previousSignaturesReport([previousSignature()], { format: "xades" });

function document(overrides: Partial<ReceivedDocument> & Pick<ReceivedDocument, "id" | "name">) {
  return {
    content: { kind: "none" },
    sha256: "3e7d1a90c4b25f8e06d9a3c7b1f4e2d85a0c6b9f3e1d7a42c8b5f0e9d3a6c71b",
    knownType: true,
    previousSignatures: NO_PREVIOUS_SIGNATURES,
    ...overrides,
  } satisfies ReceivedDocument;
}

export const RESOLUTION_DOCUMENT = document({
  id: "resolution",
  name: "Resolución 2026-0412.pdf",
  content: { kind: "pdf", pdf: resolutionPdf },
  previousSignatures: PADES_SIGNATURES,
});

export const BAREMO_DOCUMENT = document({
  id: "baremo",
  name: "Anexo II · Baremo.xml",
  content: { kind: "text", text: BAREMO_XML },
  previousSignatures: XADES_SIGNATURES,
});

/** Los cinco documentos del lote de la resolución, con un tipo que rFirma no sabe abrir. */
export const BATCH_DOCUMENTS: readonly ReceivedDocument[] = [
  RESOLUTION_DOCUMENT,
  document({
    id: "beneficiaries",
    name: "Anexo I · Beneficiarios.pdf",
    content: { kind: "pdf", pdf: resolutionPdf },
  }),
  BAREMO_DOCUMENT,
  document({
    id: "report",
    name: "Informe de intervención.pdf",
    content: { kind: "pdf", pdf: resolutionPdf },
    previousSignatures: CO_SIGNED,
  }),
  document({ id: "poster", name: "Cartel de obra.jpg", knownType: false }),
];

export const BATCH: Received = { kind: "documents", documents: BATCH_DOCUMENTS };

export const ONE_DOCUMENT: Received = { kind: "documents", documents: [RESOLUTION_DOCUMENT] };

export const ONE_DIGEST: Received = {
  kind: "digests",
  digests: [
    {
      algorithm: "SHA-256",
      value: "9f2c4b1e7a03d58c61e0b2f4a9d7c3e815b6f0a2c94e7d3b1a8f6c2e0d5b7a49",
    },
  ],
};

export const REMOTE_BATCH: Received = { kind: "remoteBatch", count: 4 };

/** Lo que se puede hacer con lo recibido, todo espías: una historia no descarga ni copia. */
export const receivedActions = {
  onDownload: fn(),
  onOpenWith: fn(),
  onSaveCopy: fn(),
  onCopy: fn(),
} satisfies ReceivedActions;

const PERSON = {
  holderName: "EJEMPLO EJEMPLO MARÍA",
  stampedSigner: "EJEMPLO EJEMPLO MARÍA - NIF 0000****T",
  givenName: "María",
  surname: "Ejemplo Ejemplo",
  idNumber: "IDCES-00000000T",
  issuer: "FNMT-RCM",
  certificateSerialNumber: "5A1F00C2",
};

/** Los dos certificados del diseño, el de ciudadana elegido primero y el de representante. */
export const DESIGN_CERTIFICATES: readonly Certificate[] = [
  certificate({ ...PERSON, id: "person", label: "FNMT-CIUDADANO", stores: ["card"] }),
  certificate({
    ...PERSON,
    id: "representative",
    label: "FNMT-REPRESENTANTE",
    entityName: "Ayuntamiento de Villaejemplo",
    organizationIdentifier: "VATES-P0000000J",
    stores: ["sharedChromium"],
  }),
];
