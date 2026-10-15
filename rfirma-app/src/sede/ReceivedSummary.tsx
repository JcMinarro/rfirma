//! El resumen de las firmas previas de lo recibido en la ventana compacta: una línea por hecho, solo si lo hay.

import { useTranslation } from "react-i18next";
import { Icon } from "../design-system/icons";
import { previousSignaturesTally, type ReceivedDocument } from "./received";
import "./ReceivedSummary.css";

/** Cuántos documentos ya traen firmas y cuántos tienen alguna que no es válida; nada si ninguno trae. */
export function ReceivedSummary({ documents }: { documents: readonly ReceivedDocument[] }) {
  const { t } = useTranslation();
  const { signed, troubled } = previousSignaturesTally(documents);
  if (signed === 0) return null;
  const single = documents.length === 1;

  return (
    <ul className="received-summary">
      <li className="rf-body rf-text-muted">
        {single ? t("sede.received.signedOne") : t("sede.received.signedCount", { count: signed })}
      </li>
      {troubled > 0 && (
        <li className="received-summary__troubled">
          <Icon name="failure" size={14} />
          <span className="rf-body">
            {single
              ? t("sede.received.troubledOne")
              : t("sede.received.troubledCount", { count: troubled })}
          </span>
        </li>
      )}
    </ul>
  );
}
