//! La zona de soltar: el recuadro discontinuo que invita a arrastrar un PDF o a pulsarlo para abrir el diálogo; la misma en la bienvenida y en el visor vacío.

import { useTranslation } from "react-i18next";
import { Icon } from "../design-system/icons";
import "./DropZone.css";

export function DropZone({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" className="drop-zone" onClick={onOpen}>
      <span className="drop-zone__icon">
        <Icon name="dropFile" size={32} />
      </span>
      <span className="rf-title drop-zone__title">{t("viewer.dropZone")}</span>
    </button>
  );
}
