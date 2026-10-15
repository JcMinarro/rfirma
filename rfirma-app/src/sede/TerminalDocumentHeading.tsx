//! El encabezado de lo que se firma desde una orden de terminal: el nombre del documento de `-i`, recortado por el medio, con la ruta completa en el tooltip.

import { useTranslation } from "react-i18next";
import "./ReceivedHeading.css";

const TERMINAL_NAME_MAX = 40;

/** «Firmar convenio.pdf», con la ruta entera de la orden en el `title`. */
export function TerminalDocumentHeading({ documentPath }: { documentPath: string }) {
  const { t } = useTranslation();
  const name = shortenMiddle(baseName(documentPath), TERMINAL_NAME_MAX);

  return (
    <div className="received-heading">
      <p className="rf-body received-heading__title" title={documentPath}>
        {t("sede.consent.terminalTitle", { name })}
      </p>
    </div>
  );
}

function baseName(path: string): string {
  return path.slice(path.search(/[^/\\]*$/));
}

/** Recorta por el medio conservando el principio, el final y la extensión. */
function shortenMiddle(name: string, max: number): string {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 && name.length - dot <= 6 ? name.slice(dot) : "";
  const tail = Math.min(extension.length + 6, max - 2);
  const head = max - tail - 1;
  return `${name.slice(0, head)}…${name.slice(name.length - tail)}`;
}
