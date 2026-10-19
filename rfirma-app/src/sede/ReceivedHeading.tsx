//! El encabezado de lo que la sede manda a firmar, en la compacta y en la ampliada: el recuento y su descarga.

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { type Received, receivedCount } from "./received";
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
        <p className="rf-body received-heading__title">{headingOf(t, received.kind, count)}</p>
      )}
      {onDownload !== undefined && (
        <DownloadButton received={received} count={count} onDownload={onDownload} />
      )}
    </div>
  );
}

function headingOf(t: TFunction, kind: Received["kind"], count: number): string {
  return kind === "remoteBatch"
    ? t("sede.received.signatures", { count })
    : t("sede.received.documents", { count });
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
  const label = count === 1 ? t("sede.received.download") : t("sede.received.downloadAll");
  const title =
    count === 1 ? t("sede.received.downloadTitle") : t("sede.received.downloadAllTitle", { count });

  return (
    <Button variant="ghost" title={title} onClick={onDownload}>
      <Icon name="folder" size={16} />
      {label}
    </Button>
  );
}
