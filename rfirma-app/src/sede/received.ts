//! Lo que la sede manda a firmar, como lo enseña la ventana: documentos con su contenido, huellas con su algoritmo, un reto de autenticación o el recuento de un lote remoto. Sin React.

import type { TFunction } from "i18next";
import type { Certificate } from "../signing/certificate";
import type { PreviousSignaturesReport } from "../signing/previousSignatures";
import { sameSignerNotice } from "../signing/sameSignerNotice";
import type { PdfDocument } from "../viewer/pdf";

/** Lo que se va a firmar: documentos, huellas que calculó la sede, un reto de autenticación o un lote remoto del que solo se sabe cuántos son. */
export type Received =
  | { kind: "documents"; documents: readonly ReceivedDocument[] }
  | { kind: "digests"; digests: readonly ReceivedDigest[] }
  | { kind: "challenge" }
  | { kind: "remoteBatch"; count: number };

/** Un documento recibido, con lo que el visor necesita para enseñarlo. */
export interface ReceivedDocument {
  id: string;
  /** El nombre que propone la sede o, sin él, el título del PDF; `null` si no hay ninguno. */
  name: string | null;
  content: DocumentContent;
  sha256: string;
  /** Si rFirma reconoce su tipo por los bytes: sin ello sale como `.bin` y no se ofrece «Abrir con…». */
  knownType: boolean;
  previousSignatures: PreviousSignaturesReport;
}

/** Lo que el visor pinta: el PDF paginado, el texto literal, la imagen o nada, porque no hay vista previa. */
type DocumentContent =
  | { kind: "pdf"; pdf: PdfDocument }
  | { kind: "text"; text: string }
  | { kind: "image"; mediaType: string; bytes: Uint8Array }
  | { kind: "none" };

/** El nombre con que se enseña el documento: el suyo o, sin él, el del documento sin título. */
export function receivedName(t: TFunction, document: ReceivedDocument): string {
  return document.name ?? t("sede.consent.untitled");
}

/** Una huella que calculó la sede, con el algoritmo que la sede dice. */
interface ReceivedDigest {
  algorithm: string;
  value: string;
}

/** Lo que la persona puede hacer con lo recibido antes de firmarlo. */
export interface ReceivedActions {
  onDownload: () => void;
  onOpenWith: (document: ReceivedDocument) => void;
  onSaveCopy: (document: ReceivedDocument) => void;
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

/** Cuántos documentos, huellas o retos se firman. */
export function receivedCount(received: Received): number {
  switch (received.kind) {
    case "documents":
      return received.documents.length;
    case "digests":
      return received.digests.length;
    case "challenge":
      return 1;
    case "remoteBatch":
      return received.count;
  }
}
