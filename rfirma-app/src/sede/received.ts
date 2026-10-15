//! Lo que la sede manda a firmar, como lo enseña la ventana: documentos con su contenido o el recuento de un lote remoto. Sin React.

import type { TFunction } from "i18next";
import type { Certificate } from "../signing/certificate";
import type { PreviousSignaturesReport } from "../signing/previousSignatures";
import { sameSignerNotice } from "../signing/sameSignerNotice";
import type { PdfDocument } from "../viewer/pdf";
import type { DocumentType, ErrandStage, SiteDocument } from "./errand";

/** Lo que se va a firmar: documentos o un lote remoto, del que solo se sabe cuántos son. */
export type Received =
  | { kind: "documents"; documents: readonly ReceivedDocument[] }
  | { kind: "remoteBatch"; count: number };

/** Un documento recibido, con lo que el visor necesita para enseñarlo. */
export interface ReceivedDocument {
  id: string;
  /** El asa con que el backend guarda los bytes: por ella se descarga y se abre. */
  handle: string;
  /** El nombre que propone la sede o, sin él, el título del PDF; `null` si no hay ninguno. */
  name: string | null;
  content: DocumentContent;
  sha256: string;
  /** El tipo que rFirma reconoce en los bytes: `unknown` sale como `.bin` y no ofrece «Abrir con…». */
  detected: DocumentType;
  previousSignatures: PreviousSignaturesReport;
}

/** Lo que el visor pinta: el PDF paginado, el texto literal, la imagen o nada, porque no hay vista previa. */
export type DocumentContent =
  | { kind: "pdf"; pdf: PdfDocument }
  | { kind: "text"; text: string }
  | { kind: "image"; mediaType: string; bytes: Uint8Array }
  | { kind: "none" };

const IMAGE_MEDIA_TYPES: Partial<Record<DocumentType, string>> = {
  png: "image/png",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/** Lo que el visor pinta de unos bytes según el tipo que rFirma detecta en ellos; un PDF que no se abre no tiene vista previa. */
export async function contentOf(
  detected: DocumentType,
  bytes: Uint8Array,
  loadPdf: (bytes: Uint8Array) => Promise<PdfDocument>,
): Promise<DocumentContent> {
  if (detected === "pdf") {
    try {
      return { kind: "pdf", pdf: await loadPdf(bytes) };
    } catch {
      return { kind: "none" };
    }
  }
  if (detected === "xml" || detected === "text") {
    return { kind: "text", text: new TextDecoder().decode(bytes) };
  }
  const mediaType = IMAGE_MEDIA_TYPES[detected];
  return mediaType === undefined ? { kind: "none" } : { kind: "image", mediaType, bytes };
}

/** El nombre con que se enseña el documento: el suyo o, sin él, uno por defecto que dice lo que es. */
export function receivedName(t: TFunction, document: ReceivedDocument): string {
  return document.name ?? t(untitledKey(document.detected));
}

function untitledKey(detected: DocumentType) {
  switch (detected) {
    case "pdf":
      return "sede.consent.untitled";
    case "xml":
      return "sede.consent.untitledXml";
    case "png":
    case "jpeg":
    case "gif":
    case "webp":
      return "sede.consent.untitledImage";
    default:
      return "sede.consent.untitledDocument";
  }
}

/** Si rFirma reconoce el tipo del documento por sus bytes. */
export function hasKnownType(document: ReceivedDocument): boolean {
  return document.detected !== "unknown";
}

/** Lo que la persona puede hacer con lo recibido antes de firmarlo; sin una acción, no se ofrece. */
export interface ReceivedActions {
  onDownload?: () => void;
  onOpenWith?: (document: ReceivedDocument) => void;
  onSaveCopy?: (document: ReceivedDocument) => void;
  onCopy: (value: string) => void;
}

/** Cómo están las firmas que ya trae un documento: ninguna, todas válidas o alguna con problemas. */
export type PreviousSignaturesState = "none" | "signed" | "troubled";

export function previousSignaturesState(report: PreviousSignaturesReport): PreviousSignaturesState {
  if (report.signatures.length === 0) return "none";
  const troubled =
    report.findings.length > 0 ||
    allSignaturesOf(report.signatures).some((signature) => signature.validity !== "valid");
  return troubled ? "troubled" : "signed";
}

/** Cuántos documentos traen firmas de otras personas, cuántos ya firmó quien firma con `certificate` o con otro certificado suyo, y cuántos tienen alguna firma con problemas. */
export interface PreviousSignaturesTally {
  byOthers: number;
  sameCertificate: number;
  otherCertificate: number;
  troubled: number;
}

export function previousSignaturesTally(
  documents: readonly ReceivedDocument[],
  certificate: Certificate | null = null,
): PreviousSignaturesTally {
  const signed = documents
    .map((document) => document.previousSignatures)
    .filter((report) => report.signatures.length > 0);
  const notices = signed.map((report) => sameSignerNotice(certificate, report.signatures));
  return {
    byOthers: signed.filter((report) =>
      report.signatures.some((signature) => sameSignerNotice(certificate, [signature]) === null),
    ).length,
    sameCertificate: notices.filter((notice) => notice === "sameCertificate").length,
    otherCertificate: notices.filter((notice) => notice === "otherCertificate").length,
    troubled: signed.filter((report) => previousSignaturesState(report) === "troubled").length,
  };
}

/** Las firmas y sus contrafirmas, a cualquier profundidad, en una sola lista. */
export function allSignaturesOf(
  signatures: PreviousSignaturesReport["signatures"],
): PreviousSignaturesReport["signatures"] {
  return signatures.flatMap((signature) => [
    signature,
    ...allSignaturesOf(signature.countersignatures),
  ]);
}

/** Lo recibido en el consentimiento, o `null` cuando no hay ningún documento que firmar. */
export function receivedOf(stage: Extract<ErrandStage, { kind: "consent" }>): Received | null {
  if (stage.items !== null) return { kind: "documents", documents: stage.items };
  if (stage.signs !== null) return { kind: "remoteBatch", count: stage.signs };
  if (stage.document === null) return null;
  return { kind: "documents", documents: [consentedDocument(stage.document)] };
}

/** El documento que se consiente, con lo que el visor pinta de él. */
function consentedDocument(document: SiteDocument): ReceivedDocument {
  const name = document.name?.trim() ? document.name : document.title;
  return {
    id: document.handle,
    handle: document.handle,
    name: name?.trim() ? name : null,
    content: document.content,
    sha256: document.sha256,
    detected: document.detected,
    previousSignatures: document.previousSignatures,
  };
}

/** Las órdenes con que la ventana descarga y abre lo recibido. */
export interface ReceivedCommands {
  downloadDocument: (handle: string) => void;
  downloadAll: () => void;
  openWith: (handle: string) => void;
}

/** Las acciones de lo recibido: nada que descargar en un lote remoto, un documento tal cual y varios en un `.zip`. */
export function receivedActions(
  received: Received | null,
  commands: ReceivedCommands,
): ReceivedActions {
  const onCopy = (value: string) => void navigator.clipboard.writeText(value);
  if (received?.kind !== "documents") return { onCopy };
  const [only] = received.documents;
  return {
    onCopy,
    onDownload:
      received.documents.length === 1 && only !== undefined
        ? () => commands.downloadDocument(only.handle)
        : commands.downloadAll,
    onOpenWith: (document) => commands.openWith(document.handle),
    onSaveCopy: (document) => commands.downloadDocument(document.handle),
  };
}

/** Cuántos documentos se firman. */
export function receivedCount(received: Received): number {
  switch (received.kind) {
    case "documents":
      return received.documents.length;
    case "remoteBatch":
      return received.count;
  }
}
