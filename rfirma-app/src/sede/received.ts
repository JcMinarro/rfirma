//! Lo que la sede manda a firmar, como lo enseña la ventana: documentos con su contenido, huellas con su algoritmo o el recuento de un lote remoto. Sin React.

import type { PreviousSignaturesReport } from "../signing/previousSignatures";
import type { PdfDocument } from "../viewer/pdf";

/** Lo que se va a firmar: documentos, huellas que calculó la sede o un lote remoto del que solo se sabe cuántos son. */
export type Received =
  | { kind: "documents"; documents: readonly ReceivedDocument[] }
  | { kind: "digests"; digests: readonly ReceivedDigest[] }
  | { kind: "remoteBatch"; count: number };

/** Un documento recibido, con lo que el visor necesita para enseñarlo. */
export interface ReceivedDocument {
  id: string;
  name: string;
  content: DocumentContent;
  sha256: string;
  /** Si rFirma sabe con qué abrirlo fuera: sin ello el menú no ofrece «Abrir con…». */
  knownType: boolean;
  previousSignatures: PreviousSignaturesReport;
}

/** Lo que el visor pinta: el PDF paginado, el texto literal o nada, porque no hay vista previa. */
type DocumentContent =
  | { kind: "pdf"; pdf: PdfDocument }
  | { kind: "text"; text: string }
  | { kind: "none" };

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

/** Cuántos documentos ya traen firmas, válidas o no, y cuántos tienen alguna con problemas. */
export function previousSignaturesTally(documents: readonly ReceivedDocument[]): {
  signed: number;
  troubled: number;
} {
  const states = documents.map((document) => previousSignaturesState(document.previousSignatures));
  return {
    signed: states.filter((state) => state !== "none").length,
    troubled: states.filter((state) => state === "troubled").length,
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

/** Cuántos documentos o huellas se firman. */
export function receivedCount(received: Received): number {
  switch (received.kind) {
    case "documents":
      return received.documents.length;
    case "digests":
      return received.digests.length;
    case "remoteBatch":
      return received.count;
  }
}
