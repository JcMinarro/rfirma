//! Lo recibido de ejemplo que comparten las historias y las pruebas del consentimiento de sede: el lote de la resolución, el lote local, sus firmas PAdES y XAdES, un PDF que pinta su texto, un cartel en imagen y una factura con su vista.

import { fn } from "storybook/test";
import type { Certificate } from "../../../signing/certificate";
import type {
  PreviousSignature,
  PreviousSignaturesReport,
} from "../../../signing/previousSignatures";
import { NO_PREVIOUS_SIGNATURES } from "../../../signing/previousSignatures";
import type { SameSignerNotice } from "../../../signing/sameSignerNotice";
import type { PdfDocument, PdfPage, Viewport } from "../../../viewer/pdf";
import {
  type PreviousSignaturesState,
  previousSignaturesState,
  type Received,
  type ReceivedActions,
  type ReceivedDocument,
} from "../../received";
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
export const resolutionPdf: PdfDocument = {
  pageCount: 3,
  getPage: (number) => Promise.resolve(pageWith(number, RESOLUTION)),
};

/** El baremo en XML, en una sola línea como lo mandan las sedes, que el visor enseña indentado. */
const BAREMO_XML =
  '<?xml version="1.0" encoding="UTF-8"?><baremo convocatoria="FACHADAS-2026">' +
  '<criterio id="1" peso="40">Antigüedad del edificio</criterio>' +
  '<criterio id="2" peso="30">Estado de conservación</criterio>' +
  '<criterio id="3" peso="20">Accesibilidad</criterio>' +
  '<criterio id="4" peso="10">Eficiencia energética</criterio>' +
  "<puntuacionMinima>50</puntuacionMinima>" +
  '<solicitudes total="38" concedidas="21"/></baremo>';

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

/** La firma PAdES de la resolución cuando todas son válidas. */
const VALID_PADES_SIGNATURES: PreviousSignaturesReport = previousSignaturesReport(
  [
    previousSignature({
      name: "JUAN EJEMPLO PRUEBA",
      issuer: "AC FNMT Usuarios",
      signingDate: { kind: "declared", at: "2026-10-02T07:15:00Z" },
    }),
  ],
  { format: "pades" },
);

const CO_SIGNED = previousSignaturesReport([previousSignature()], { format: "xades" });

const FACTURAE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<fe:Facturae xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml">
  <FileHeader>
    <SchemaVersion>3.2.2</SchemaVersion>
    <Modality>I</Modality>
    <InvoiceIssuerType>EM</InvoiceIssuerType>
  </FileHeader>
  <Invoices>
    <Invoice>
      <InvoiceHeader>
        <InvoiceNumber>2026-0087</InvoiceNumber>
        <InvoiceSeriesCode>OBR</InvoiceSeriesCode>
      </InvoiceHeader>
      <InvoiceTotals>
        <InvoiceTotal>12450.00</InvoiceTotal>
      </InvoiceTotals>
    </Invoice>
  </Invoices>
</fe:Facturae>`;

/** El cartel de obra del diseño, como SVG con sus colores fijos: dentro de una imagen no llegan los del tema. */
const POSTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <rect width="600" height="420" fill="#fafbfc"/>
  <rect x="40" y="36" width="520" height="70" fill="#000000"/>
  <text x="64" y="81" fill="#ffffff" font-family="Inter, sans-serif" font-size="26" font-weight="700">AYUNTAMIENTO DE VILLAEJEMPLO</text>
  <text x="40" y="160" fill="#000000" font-family="Inter, sans-serif" font-size="30" font-weight="700">Rehabilitación de fachadas</text>
  <text x="40" y="196" fill="#64748b" font-family="Inter, sans-serif" font-size="18">Calle Mayor, 12–28 · Plazo: 6 meses</text>
  <path d="M40 380 170 250 250 320 360 210 560 380Z" fill="#64748b"/>
  <circle cx="470" cy="260" r="34" fill="#e5e5e5"/>
  <text x="40" y="404" fill="#64748b" font-family="Inter, sans-serif" font-size="14">Presupuesto: 84.250,00 €</text>
</svg>`;

/** La vista de la factura del diseño, como la pintaría la hoja de FACe: emisor, receptor, líneas y total, con datos inventados. */
const INVOICE_HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
body{margin:0;padding:24px;font:13px Arial,sans-serif;color:#000;background:#fff}
h1{font-size:18px;margin:0 0 12px}table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{border:1px solid #9aa;padding:4px 6px;text-align:left}th{background:#dde6ee}
.importe{text-align:right}</style></head><body>
<h1>Factura 2026-0087 · Serie OBR</h1>
<table><tr><th>Emisor</th><th>Receptor</th></tr>
<tr><td>Talleres Inventados del Norte SL<br>NIF B00000000</td><td>Ayuntamiento de Villaejemplo<br>NIF P0000000J</td></tr></table>
<table><tr><th>Concepto</th><th class="importe">Importe</th></tr>
<tr><td>Rehabilitación de fachada, Calle Mayor 12</td><td class="importe">10.289,26 €</td></tr>
<tr><td>IVA 21 %</td><td class="importe">2.160,74 €</td></tr>
<tr><th>Total factura</th><th class="importe">12.450,00 €</th></tr></table>
</body></html>`;

const DETECTED_BY_CONTENT = {
  pdf: "pdf",
  invoice: "invoice",
  xml: "xml",
  text: "text",
  image: "jpeg",
  none: "xlsx",
} as const;

function document(overrides: Partial<ReceivedDocument> & Pick<ReceivedDocument, "id" | "name">) {
  const content = overrides.content ?? { kind: "none" };
  return {
    content,
    sha256: "3e7d1a90c4b25f8e06d9a3c7b1f4e2d85a0c6b9f3e1d7a42c8b5f0e9d3a6c71b",
    detected: DETECTED_BY_CONTENT[content.kind],
    previousSignatures: NO_PREVIOUS_SIGNATURES,
    ...overrides,
    handle: overrides.handle ?? `${overrides.id}-handle`,
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
  content: { kind: "xml", text: BAREMO_XML },
  previousSignatures: XADES_SIGNATURES,
});

/** La factura de la obra, con su vista: en una historia, la vista va en una dirección `data:` porque no hay trámite que la sirva. */
export const INVOICE_DOCUMENT = document({
  id: "invoice",
  name: "Factura 2026-0087.xml",
  content: {
    kind: "invoice",
    src: `data:text/html;charset=utf-8,${encodeURIComponent(INVOICE_HTML)}`,
  },
});

/** La hoja de cálculo de los beneficiarios: rFirma reconoce su tipo y sabe con qué abrirla, pero no tiene vista previa. */
const BENEFICIARIES_DOCUMENT = document({
  id: "beneficiaries",
  name: "Anexo I · Beneficiarios.xlsx",
});

/** Unos bytes de tipo que rFirma no reconoce, que salen como `.bin` y sin «Abrir con…». */
export const UNKNOWN_TYPE_DOCUMENT = document({
  id: "unknown",
  name: "Expediente 2026-0412.bin",
  detected: "unknown",
});

const POSTER_DOCUMENT = document({
  id: "poster",
  name: "Cartel de obra.jpg",
  content: {
    kind: "image",
    mediaType: "image/svg+xml",
    bytes: new TextEncoder().encode(POSTER_SVG),
  },
});

/** Los cinco documentos del lote de la resolución, uno de cada tipo que distingue la lista. */
export const BATCH_DOCUMENTS: readonly ReceivedDocument[] = [
  RESOLUTION_DOCUMENT,
  BENEFICIARIES_DOCUMENT,
  BAREMO_DOCUMENT,
  document({
    id: "report",
    name: "Informe de intervención.pdf",
    content: { kind: "pdf", pdf: resolutionPdf },
    previousSignatures: CO_SIGNED,
  }),
  POSTER_DOCUMENT,
];

export const BATCH: Received = { kind: "documents", documents: BATCH_DOCUMENTS };

/** La resolución sin nombre de la sede ni título en el PDF. */
export const UNTITLED_DOCUMENT = document({
  ...RESOLUTION_DOCUMENT,
  id: "untitled",
  name: null,
});

/** El lote local de cinco elementos, cada uno con sus bytes y su identificador por nombre. */
export const LOCAL_BATCH_DOCUMENTS: readonly ReceivedDocument[] = [
  document({
    id: "001",
    name: "001",
    content: { kind: "pdf", pdf: resolutionPdf },
    previousSignatures: PADES_SIGNATURES,
  }),
  document({ id: "002", name: "002" }),
  document({
    id: "003",
    name: "003",
    content: { kind: "xml", text: BAREMO_XML },
    previousSignatures: XADES_SIGNATURES,
  }),
  document({ id: "004", name: "004", content: { kind: "xml", text: FACTURAE_XML } }),
  document({
    id: "005",
    name: "005",
    content: { kind: "pdf", pdf: resolutionPdf },
    previousSignatures: CO_SIGNED,
  }),
];

/** Los documentos con las firmas previas de `state`: sin ninguna, con las válidas o como vienen, con alguna que no lo es. */
export function withPreviousSignatures(
  documents: readonly ReceivedDocument[],
  state: PreviousSignaturesState,
): readonly ReceivedDocument[] {
  switch (state) {
    case "none":
      return documents.map((each) => ({ ...each, previousSignatures: NO_PREVIOUS_SIGNATURES }));
    case "signed":
      return documents.map((each) =>
        previousSignaturesState(each.previousSignatures) === "troubled"
          ? { ...each, previousSignatures: VALID_PADES_SIGNATURES }
          : each,
      );
    case "troubled":
      return documents;
  }
}

export const ONE_DOCUMENT: Received = { kind: "documents", documents: [RESOLUTION_DOCUMENT] };

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

/** Los dos certificados del diseño: el de ciudadana, recordado para que la sede lo traiga elegido aunque el de representante se ordene antes, y el de representante. */
export const DESIGN_CERTIFICATES: readonly Certificate[] = [
  certificate({
    ...PERSON,
    id: "person",
    label: "FNMT-CIUDADANO",
    stores: ["card"],
    remembered: true,
  }),
  certificate({
    ...PERSON,
    id: "representative",
    label: "FNMT-REPRESENTANTE",
    entityName: "Ayuntamiento de Villaejemplo",
    organizationIdentifier: "VATES-P0000000J",
    stores: ["sharedChromium"],
  }),
];

/** La firma previa de la ciudadana del diseño, con el certificado de `how`: el elegido primero u otro suyo. */
export function yourSignature(how: SameSignerNotice): PreviousSignature {
  return previousSignature({
    name: PERSON.holderName,
    idNumber: PERSON.idNumber,
    issuer: PERSON.issuer,
    certificateSerialNumber:
      how === "sameCertificate" ? PERSON.certificateSerialNumber : "3C08E1D7",
    signingDate: { kind: "declared", at: "2026-10-05T11:20:00Z" },
  });
}

/** Los documentos con `signature` añadida al primero y al primero que no traía firmas, donde es la única. */
export function withYourSignature(
  documents: readonly ReceivedDocument[],
  signature: PreviousSignature,
): readonly ReceivedDocument[] {
  const unsigned = documents.findIndex((each) => each.previousSignatures.signatures.length === 0);
  return documents.map((each, index) =>
    index === 0 || index === unsigned
      ? {
          ...each,
          previousSignatures: {
            ...each.previousSignatures,
            signatures: [...each.previousSignatures.signatures, signature],
          },
        }
      : each,
  );
}
