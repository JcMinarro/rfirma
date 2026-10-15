//! La cabecera de 56 px de la ventana de sede que dice quién pide la firma o los datos: el dominio a secas, una página sin identificar o una orden de terminal.

import { useTranslation } from "react-i18next";
import "./SedeOrigin.css";

/** Quién pide la firma o los datos: el dominio en una línea, «Una página sin identificar» sin origen válido o «Una orden de terminal». */
export function SedeOrigin({
  origin,
  asks = "signature",
  terminal = false,
}: {
  origin: string | null;
  asks?: "signature" | "identity";
  terminal?: boolean;
}) {
  const { t } = useTranslation();
  const name = terminal ? t("sede.origin.terminal") : (origin ?? t("sede.origin.unknown"));

  return (
    <header className="sede-origin">
      <span className="rf-label">
        {asks === "identity" ? t("sede.origin.asksIdentity") : t("sede.origin.asks")}
      </span>
      <span className="rf-body sede-origin__name" title={name}>
        {name}
      </span>
    </header>
  );
}
