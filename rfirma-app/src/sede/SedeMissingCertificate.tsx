//! 5 · El momento sin certificado utilizable, provisional, con el esqueleto del consentimiento compacto: la cabecera de quién lo pide, el título con su icono y las salidas en el pie; hoy solo lo pintan las historias.

import { useTranslation } from "react-i18next";
import { Admonition } from "../design-system/Admonition";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { Row } from "../design-system/Row";
import { useDefaultButton } from "../design-system/useDefaultButton";
import type { NamedFailure } from "../errors/classify";
import { errorText } from "../errors/errorMessage";
import type { NoCertificateReason } from "./errand";
import { SedeBody } from "./SedeFrame";
import { SedeOrigin } from "./SedeOrigin";
import "./SedeWindow.css";
import "./SedeEnding.css";
import "./SedeMissingCertificate.css";

interface SedeMissingCertificateProps {
  origin: string | null;
  asks?: "signature" | "identity";
  terminal: boolean;
  reason: NoCertificateReason;
  owned: number;
  failure: NamedFailure | null;
  onInstall: () => void;
  onLookAgain: () => void;
  onLeave: () => void;
}

/** Sin certificado utilizable: quién lo pide arriba, por qué en el título y, en el pie, volver a buscar, cancelar o instalar otro. */
export function SedeMissingCertificate({
  origin,
  asks = "signature",
  terminal,
  reason,
  owned,
  failure,
  onInstall,
  onLookAgain,
  onLeave,
}: SedeMissingCertificateProps) {
  const { t } = useTranslation();
  const excluded = reason === "excluded";
  const closeOnly = terminal && excluded;
  const defaultButton = useDefaultButton();
  const heading = !excluded
    ? t("sede.noCertificate.noneTitle")
    : terminal
      ? t("sede.noCertificate.terminalExcludedTitle", { count: owned })
      : t("sede.noCertificate.notAcceptedTitle", { count: owned });

  return (
    <SedeBody
      flush
      steadyFooter
      primary={defaultButton}
      onEscape={onLeave}
      footer={
        closeOnly ? (
          <Button
            ref={defaultButton}
            variant="primary"
            className="sede-missing__steady"
            onClick={onLeave}
          >
            {t("actions.close")}
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              className="sede-missing__look-again"
              title={t("actions.lookAgain")}
              onClick={onLookAgain}
            >
              <Icon name="search" size={16} />
              <span className="sede-missing__look-again-label">{t("actions.lookAgain")}</span>
            </Button>
            <Button variant="ghost" className="sede-missing__steady" onClick={onLeave}>
              {t("actions.cancel")}
            </Button>
            <Button
              ref={defaultButton}
              variant="primary"
              className="sede-missing__steady"
              onClick={onInstall}
            >
              {t("sede.noCertificate.install")}
            </Button>
          </>
        )
      }
    >
      <div className="sede-ending">
        <SedeOrigin origin={origin} asks={asks} terminal={terminal} />
        <div className="sede-ending__body">
          <Row gap="xs" className="sede-outcome__head">
            <span className="sede-outcome__icon">
              <Icon name="warning" size={24} />
            </span>
            <p className="rf-title sede-ending__title">{heading}</p>
          </Row>
          {failure !== null && <InstallFailure failure={failure} />}
        </div>
      </div>
    </SedeBody>
  );
}

function InstallFailure({ failure }: { failure: NamedFailure }) {
  const { t } = useTranslation();
  const message = errorText(failure.situation, t);

  return (
    <Admonition tone="error" className="sede-ending__detail" title={message.title}>
      {message.body !== undefined && <p className="rf-body">{message.body}</p>}
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: la región con desplazamiento tiene que poder enfocarse para leerla con el teclado. */}
      <code className="rf-body sede-ending__detail-text" tabIndex={0}>
        {failure.detail}
      </code>
    </Admonition>
  );
}
