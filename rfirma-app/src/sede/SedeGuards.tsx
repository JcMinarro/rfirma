//! Los avisos previos provisionales con el esqueleto del consentimiento compacto: la página desactualizada y la pregunta del validador; hoy solo los pintan las historias.

import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PrimaryButton } from "../design-system/actionKeys";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { Row } from "../design-system/Row";
import { useDefaultButton } from "../design-system/useDefaultButton";
import { confirmationMessage } from "./SedeConfirm";
import { SedeBody } from "./SedeFrame";
import { SedeOrigin } from "./SedeOrigin";
import "./SedeWindow.css";
import "./SedeEnding.css";
import "./SedeGuards.css";

type Asks = "signature" | "identity";

interface SedeOutdatedPageProps {
  origin: string | null;
  asks?: Asks;
  onDismiss: () => void;
  onCancel?: () => void;
}

/** La página desactualizada: quién lo pide arriba, el riesgo en una frase y, en el pie, «Continuar» y, si se da, «Cancelar». */
export function SedeOutdatedPage({
  origin,
  asks = "signature",
  onDismiss,
  onCancel,
}: SedeOutdatedPageProps) {
  const { t } = useTranslation();
  const continueButton = useDefaultButton();

  return (
    <GuardFrame
      origin={origin}
      asks={asks}
      title={t("sede.oldWebClient.title")}
      continueButton={continueButton}
      onContinue={onDismiss}
      onCancel={onCancel}
    >
      <p className="rf-prose sede-ending__statement">{t("sede.oldWebClient.risk")}</p>
    </GuardFrame>
  );
}

interface SedeValidatorQuestionProps {
  origin: string | null;
  asks?: Asks;
  messageCode: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/** La pregunta del validador con sus palabras: quién lo pide arriba y, en el pie, «Cancelar» o «Continuar». */
export function SedeValidatorQuestion({
  origin,
  asks = "signature",
  messageCode,
  onConfirm,
  onCancel,
}: SedeValidatorQuestionProps) {
  const { t } = useTranslation();
  const [handing, setHanding] = useState(false);
  const continueButton = useDefaultButton(!handing);

  const confirm = async () => {
    setHanding(true);
    try {
      await onConfirm();
    } finally {
      setHanding(false);
    }
  };

  return (
    <GuardFrame
      origin={origin}
      asks={asks}
      title={t("signAnyway.title")}
      continueButton={continueButton}
      continueDisabled={handing}
      onContinue={() => void confirm()}
      onCancel={onCancel}
    >
      <p className="rf-prose sede-ending__statement">{confirmationMessage(t, messageCode)}</p>
    </GuardFrame>
  );
}

interface GuardFrameProps {
  origin: string | null;
  asks: Asks;
  title: string;
  continueButton: PrimaryButton;
  continueDisabled?: boolean;
  onContinue: () => void;
  onCancel?: () => void;
  children: ReactNode;
}

function GuardFrame({
  origin,
  asks,
  title,
  continueButton,
  continueDisabled = false,
  onContinue,
  onCancel,
  children,
}: GuardFrameProps) {
  const { t } = useTranslation();

  return (
    <SedeBody
      flush
      steadyFooter
      primary={continueButton}
      onEscape={onCancel}
      footer={
        <>
          {onCancel !== undefined && (
            <Button variant="ghost" className="sede-guards__steady" onClick={onCancel}>
              {t("actions.cancel")}
            </Button>
          )}
          <Button
            ref={continueButton}
            variant="primary"
            className="sede-guards__steady"
            disabled={continueDisabled}
            onClick={onContinue}
          >
            {t("actions.continue")}
          </Button>
        </>
      }
    >
      <div className="sede-ending">
        <SedeOrigin origin={origin} asks={asks} />
        <div className="sede-ending__body">
          <Row gap="xs" className="sede-outcome__head">
            <span className="sede-outcome__icon">
              <Icon name="warning" size={24} />
            </span>
            <p className="rf-title sede-ending__title">{title}</p>
          </Row>
          {children}
        </div>
      </div>
    </SedeBody>
  );
}
