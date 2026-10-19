//! Los avisos de lo recibido en la ventana de sede, juntos en un solo `Admonition`: la firma no válida, el SHA-1 por permitir, el lote remoto, lo que ya firmaste tú y las firmas de otras personas, por ese orden.

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Admonition } from "../design-system/Admonition";
import type { Certificate } from "../signing/certificate";
import {
  type PreviousSignaturesTally,
  previousSignaturesTally,
  type ReceivedDocument,
} from "./received";

/** Un solo aviso, con el tono del peor hecho y el más importante como título; sin título si es el único, y nada si no hay ninguno. */
export function ReceivedSummary({
  documents,
  certificate = null,
  sha1ToAllow = false,
  remoteBatch = false,
  yoursOnly = false,
}: {
  documents: readonly ReceivedDocument[];
  certificate?: Certificate | null;
  /** La sede pide SHA-1 sin permiso en Preferencias. */
  sha1ToAllow?: boolean;
  /** Lo recibido es un lote remoto: los documentos se quedan en la sede. */
  remoteBatch?: boolean;
  /** Sin las firmas no válidas ni las de otras personas, que en la ampliada cuenta la franja de cada documento. */
  yoursOnly?: boolean;
}) {
  const { t } = useTranslation();
  const tally = previousSignaturesTally(documents, certificate);
  const single = documents.length === 1;
  const candidates: (string | null)[] = [
    yoursOnly ? null : troubledLine(t, tally, single),
    sha1ToAllow ? t("sede.received.sha1ToAllow") : null,
    remoteBatch ? t("sede.received.remoteBatch") : null,
    ...yourLines(t, tally, single),
    yoursOnly ? null : byOthersLine(t, tally, single),
  ];
  const facts = candidates.filter((line): line is string => line !== null);
  const [first, ...rest] = facts;
  if (first === undefined) return null;
  const tone = !yoursOnly && tally.troubled > 0 ? "error" : sha1ToAllow ? "warning" : "info";

  return rest.length === 0 ? (
    <Admonition tone={tone}>{sentence(first)}</Admonition>
  ) : (
    <Admonition tone={tone} title={sentence(first)}>
      {rest.map(sentence).join(" ")}
    </Admonition>
  );
}

function sentence(line: string): string {
  return `${line}.`;
}

function troubledLine(t: TFunction, tally: PreviousSignaturesTally, single: boolean) {
  if (tally.troubled === 0) return null;
  return single
    ? t("sede.received.troubledOne")
    : t("sede.received.troubledCount", { count: tally.troubled });
}

function yourLines(t: TFunction, tally: PreviousSignaturesTally, single: boolean) {
  const { sameCertificate, otherCertificate } = tally;
  return [
    sameCertificate === 0
      ? null
      : single
        ? t("sede.received.signedByYouOne")
        : t("sede.received.signedByYouCount", { count: sameCertificate }),
    otherCertificate === 0
      ? null
      : single
        ? t("sede.received.signedByYouOtherCertificateOne")
        : t("sede.received.signedByYouOtherCertificateCount", { count: otherCertificate }),
  ];
}

function byOthersLine(t: TFunction, tally: PreviousSignaturesTally, single: boolean) {
  if (tally.byOthers === 0) return null;
  return single
    ? t("sede.received.signedOne")
    : t("sede.received.signedCount", { count: tally.byOthers });
}
