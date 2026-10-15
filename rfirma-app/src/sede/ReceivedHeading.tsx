//! El encabezado de lo que la sede manda a firmar, en la compacta y en la ampliada: el recuento y su descarga.

import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { type Received, receivedCount } from "./received";
import "./ReceivedHeading.css";

/** «Vas a firmar N documentos» o «N referencias», con su descarga; del lote remoto, solo el recuento. */
export function ReceivedHeading({
  received,
  onDownload,
}: {
  received: Received;
  onDownload: () => void;
}) {
  const { t } = useTranslation();
  const count = receivedCount(received);

  return (
    <div className="received-heading">
      <p className="rf-body received-heading__title">
        {received.kind === "digests"
          ? t("sede.received.digests", { count })
          : t("sede.received.documents", { count })}
      </p>
      <DownloadButton received={received} count={count} onDownload={onDownload} />
    </div>
  );
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
  const [label, title] =
    received.kind === "digests"
      ? [t("sede.received.downloadDigests"), t("sede.received.downloadDigestsTitle")]
      : [
          count === 1 ? t("sede.received.download") : t("sede.received.downloadAll"),
          t("sede.received.downloadAllTitle", { count }),
        ];

  return (
    <Button variant="ghost" title={title} onClick={onDownload}>
      <Icon name="folder" size={16} />
      {label}
    </Button>
  );
}
