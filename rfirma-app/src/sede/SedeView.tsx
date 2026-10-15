//! La vista de la ventana de sede: el momento del trámite que se le pasa, con datos y órdenes por props y sin puertos.

import { useTranslation } from "react-i18next";
import type { NamedFailure } from "../errors/classify";
import { type Certificate, type ReaderStatus, UNAVAILABLE_READER } from "../signing/certificate";
import { consentActionKey, type Errand, type MarkedArea } from "./errand";
import { SedeAreaMarking } from "./SedeAreaMarking";
import { SedeConsent } from "./SedeConsent";
import { SedeOutdatedPage, SedeValidatorQuestion } from "./SedeGuards";
import { SedeNoCertificate } from "./SedeNoCertificate";
import { SedeOutcome } from "./SedeOutcome";
import { SedeSigning } from "./SedeSigning";
import { SedeTransfer } from "./SedeTransfer";
import { SedeWaiting } from "./SedeWaiting";
import "./SedeWindow.css";

export interface SedeViewProps {
  errand: Errand;
  consentCountdown?: boolean;
  installFailure?: NamedFailure | null;
  reader?: ReaderStatus;
  liveCertificates?: readonly Certificate[] | null;
  onConsent: (certificateId: string) => void;
  onConfirmSignatures: () => void | Promise<void>;
  onMarkArea: (area: MarkedArea | null) => void | Promise<void>;
  onCancel: () => void;
  onClose: () => void;
  onLookAgain: () => void;
  onInstallCertificate: () => void;
  onInstallLocalCa: () => void;
  onDismissWarning: () => void;
  onOpenHelp?: () => void;
}

/**
 * Lo que enseña la ventana de sede en cada momento del trámite, sin conocer a
 * Tauri: es la pieza que se exporta a Claude Design y la que pintan las
 * historias (docs/design/ventana-de-sede.md). Quien la conecta al
 * `SiteErrandPort` es `SedeWindow`.
 */
export function SedeView({
  errand,
  consentCountdown = true,
  installFailure = null,
  reader = UNAVAILABLE_READER,
  liveCertificates = null,
  onConsent,
  onConfirmSignatures,
  onMarkArea,
  onCancel,
  onClose,
  onLookAgain,
  onInstallCertificate,
  onInstallLocalCa,
  onDismissWarning,
  onOpenHelp,
}: SedeViewProps) {
  const { t } = useTranslation();
  const stage = errand.stage;
  const asks = consentActionKey(errand.operation) === "identify" ? "identity" : "signature";

  return (
    <div className="sede-window__frame">
      <section
        className="sede-window"
        role="dialog"
        aria-modal="true"
        aria-label={t("app.name")}
        data-stage={stage.kind}
      >
        {stage.kind === "waiting" && (
          <SedeWaiting
            moment="connecting"
            onInstallLocalCa={onInstallLocalCa}
            onCancel={onCancel}
          />
        )}
        {(stage.kind === "unreachable" || stage.kind === "noChannel") && (
          <SedeWaiting
            moment="unreachable"
            onInstallLocalCa={onInstallLocalCa}
            onCancel={onCancel}
          />
        )}
        {stage.kind === "oldWebClient" && (
          <SedeOutdatedPage origin={errand.origin} asks={asks} onDismiss={onDismissWarning} />
        )}
        {stage.kind === "consent" && (
          <SedeConsent
            origin={errand.origin}
            terminalOrder={errand.terminalOrder ?? null}
            operation={errand.operation}
            stage={stage}
            countdown={consentCountdown}
            reader={reader}
            liveCertificates={liveCertificates}
            onConsent={onConsent}
            onCancel={onCancel}
          />
        )}
        {stage.kind === "marking" && (
          <SedeAreaMarking
            pdf={stage.pdf}
            origin={errand.origin}
            asks={asks}
            onMark={onMarkArea}
            onCancel={() => void onMarkArea(null)}
          />
        )}
        {stage.kind === "confirming" && (
          <SedeValidatorQuestion
            origin={errand.origin}
            asks={asks}
            messageCode={stage.messageCode}
            onConfirm={onConfirmSignatures}
            onCancel={onCancel}
          />
        )}
        {stage.kind === "signing" && (
          <SedeSigning
            origin={errand.origin}
            certificate={stage.certificate}
            phase={stage.phase}
            onCancel={onCancel}
          />
        )}
        {/* Guardar y cargar **no preguntan en esta ventana**: la orden abre el
            diálogo del portal en cuanto el momento llega, y aquí sólo se
            nombra el fichero (ADR-0011). */}
        {(stage.kind === "saving" || stage.kind === "loading") && <SedeTransfer transfer={stage} />}
        {stage.kind === "outcome" && (
          <SedeOutcome
            origin={errand.origin}
            outcome={stage.outcome}
            onClose={onClose}
            onOpenHelp={onOpenHelp}
          />
        )}
        {stage.kind === "noCertificate" && (
          <SedeNoCertificate
            origin={errand.origin}
            terminal={errand.terminalOrder !== undefined}
            reason={stage.reason}
            owned={stage.owned}
            failure={installFailure}
            onInstall={onInstallCertificate}
            onLookAgain={onLookAgain}
            onLeave={onCancel}
          />
        )}
      </section>
    </div>
  );
}
