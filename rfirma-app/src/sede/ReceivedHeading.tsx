//! El encabezado de lo que la sede manda a firmar, en la compacta y en la ampliada: el recuento y su descarga.

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { type Received, receivedCount, receivedName } from "./received";
import "./ReceivedHeading.css";

/** «Vas a firmar N documentos» o, en un lote remoto, «Vas a hacer N firmas», con su descarga si hay `onDownload`; del lote remoto, solo el recuento. */
export function ReceivedHeading({
  received,
  onDownload,
  withoutCount = false,
}: {
  received: Received;
  onDownload?: () => void;
  /** Solo la descarga, a la derecha: los documentos ya se ven debajo. */
  withoutCount?: boolean;
}) {
  const { t } = useTranslation();
  const count = receivedCount(received);

  return (
    <div className="received-heading">
      {!withoutCount && (
        <p className="rf-body received-heading__title">{headingOf(t, received, count)}</p>
      )}
      {onDownload !== undefined && (
        <DownloadButton received={received} count={count} onDownload={onDownload} />
      )}
    </div>
  );
}

function headingOf(t: TFunction, received: Received, count: number): string {
  if (received.kind === "remoteBatch") return t("sede.received.signatures", { count });
  const [only] = count === 1 ? received.documents : [];
  if (only?.precalculatedHash) return receivedName(t, only);
  return t("sede.received.documents", { count });
}

function DownloadButton({
  received,
  count,
  onDownload,
}: {
  received: Received;
  count: number;
  onDownload: () => void;
}) {
  const { t } = useTranslation();
  if (received.kind === "remoteBatch") return null;
  const zipped = received.documents.filter((document) => !document.precalculatedHash).length;
  const label = count === 1 ? t("sede.received.download") : t("sede.received.downloadAll");
  const title =
    count === 1
      ? t("sede.received.downloadTitle")
      : t("sede.received.downloadAllTitle", { count: zipped });

  return (
    <Button variant="ghost" title={title} onClick={onDownload}>
      <Icon name="folder" size={16} />
      {label}
    </Button>
  );
}
