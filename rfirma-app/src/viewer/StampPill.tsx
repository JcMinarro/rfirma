//! La pastilla flotante bajo la hoja con el estado del sello y, si hace falta, el botón que lo compone.

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { errorText } from "../errors/errorMessage";
import type { StampPreview } from "../signing/stampPreview";

/**
 * La pastilla flotante del estado del sello: un texto y, si
 * hace falta, un botón. No hay insignia — se retiró con el rótulo «Vista
 * previa» del panel, junto con sus 16 claves — y no hay nada que decir de la
 * colocación: la etiqueta del botón de sellar, en el panel, ya cuenta eso.
 *
 * Sin certificado, sin colocar, mientras se arrastra y «al día» no montan la
 * pastilla: no hay sello del que hablar, o ya no hace falta decirlo
 * (docs/design/visor-de-documento.md § «La pastilla bajo la hoja»).
 *
 * **Mide lo mismo de ancho tenga botón o no**, y de alto salvo en el fallo, que
 * añade una segunda línea con el título del motivo.
 */
export function StampPill({ state, onCompose }: { state: StampPreview; onCompose: () => void }) {
  const { t } = useTranslation();
  const lineId = useId();

  // Las claves se escriben **enteras y a mano**: `i18next-cli` lee el código
  // para cazar la clave que no está en el catálogo y la del catálogo que ya no
  // usa nadie, y una clave compuesta con una plantilla es invisible
  // para las dos comprobaciones.
  const said = {
    noCertificate: null,
    unplaced: null,
    frozen: null,
    onDemand: { line: t("viewer.stamp.onDemand"), button: t("viewer.stamp.show"), reason: null },
    composing: { line: t("viewer.stamp.composing"), button: null, reason: null },
    composed: null,
    failed: {
      line: t("viewer.stamp.failed"),
      button: t("actions.retry"),
      reason: state.kind === "failed" ? errorText(state.failure.situation, t).title : null,
    },
  }[state.kind];

  // noCertificate, unplaced, frozen y composed no dicen nada del sello: sin
  // bloque encendido, sin recuadro, en pleno arrastre y «al día» son los
  // cuatro casos sin pastilla.
  if (!said) return null;

  return (
    <div className="viewer__stamp" role="status">
      <div className="viewer__stamp-text">
        <p className="rf-body viewer__stamp-line" id={lineId}>
          {said.line}
        </p>
        {said.reason !== null && (
          <p className="rf-caption rf-text-muted viewer__stamp-reason">{said.reason}</p>
        )}
      </div>
      <span className="viewer__stamp-slot">
        {said.button !== null && (
          <Button
            variant="secondary"
            className="viewer__stamp-button"
            aria-describedby={lineId}
            onClick={onCompose}
          >
            {said.button}
          </Button>
        )}
      </span>
    </div>
  );
}
