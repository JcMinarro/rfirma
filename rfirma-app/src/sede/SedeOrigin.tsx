//! La cabecera de 56 px de la ventana de sede que dice quién pide la firma: el dominio a secas o una página sin identificar.

import { useTranslation } from "react-i18next";
import "./SedeOrigin.css";

/** Quién pide la firma: el dominio en una línea, o «Una página sin identificar» sin origen válido. */
export function SedeOrigin({ origin }: { origin: string | null }) {
  const { t } = useTranslation();
  const name = origin ?? t("sede.origin.unknown");

  return (
    <header className="sede-origin">
      <span className="rf-label">{t("sede.origin.asks")}</span>
      <span className="rf-body sede-origin__name" title={name}>
        {name}
      </span>
    </header>
  );
}
