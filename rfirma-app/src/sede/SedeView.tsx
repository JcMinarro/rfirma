//! La vista de la ventana de sede: el momento del trámite que se le pasa, con datos y órdenes por props y sin puertos.

import { useTranslation } from "react-i18next";
import type { NamedFailure } from "../errors/classify";
import { type Certificate, type ReaderStatus, UNAVAILABLE_READER } from "../signing/certificate";
import { consentActionKey, type Errand, type MarkedArea } from "./errand";
import { receivedActions, receivedOf } from "./received";
import { SedeAreaMarking } from "./SedeAreaMarking";
import { SedeEnding } from "./SedeEnding";
import { SedeOutdatedPage, SedeValidatorQuestion } from "./SedeGuards";
import { SedeMissingCertificate } from "./SedeMissingCertificate";
import { SedeAwaiting, SedeFileTransfer, SedeSigningProgress } from "./SedePassing";
import { SedeReceivedConsent } from "./SedeReceivedConsent";
import "./SedeWindow.css";

export interface SedeViewProps {
  errand: Errand;
  consentCountdown?: boolean;
  installFailure?: NamedFailure | null;
  receivedFailure?: NamedFailure | null;
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
  onExpandWindow: (expanded: boolean) => void;
  onDownloadDocument: (handle: string) => void;
  onDownloadAll: () => void;
  onOpenWith: (handle: string) => void;
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
  receivedFailure = null,
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
  onExpandWindow,
  onDownloadDocument,
  onDownloadAll,
  onOpenWith,
}: SedeViewProps) {
  const { t } = useTranslation();
  const stage = errand.stage;
  const asks = consentActionKey(errand.operation) === "identify" ? "identity" : "signature";
  const received = stage.kind === "consent" ? receivedOf(stage) : null;
  const actions = receivedActions(received, {
    downloadDocument: onDownloadDocument,
    downloadAll: onDownloadAll,
    openWith: onOpenWith,
  });

  return (
    <div className="sede-window__frame">
      <section
        className="sede-window"
        role="dialog"
        aria-modal="true"
        aria-label={t("app.name")}
        data-stage={stage.kind}
      >
        {(stage.kind === "waiting" ||
          stage.kind === "unreachable" ||
          stage.kind === "noChannel") && (
          <SedeAwaiting
            origin={errand.origin}
            asks={asks}
            moment={stage.kind === "waiting" ? "waiting" : "unreachable"}
            localCaMissing={stage.kind === "noChannel" && stage.reason === "localCaMissing"}
            onInstallLocalCa={onInstallLocalCa}
            onCancel={onCancel}
          />
        )}
        {stage.kind === "oldWebClient" && (
          <SedeOutdatedPage
            origin={errand.origin}
            asks={asks}
            onDismiss={onDismissWarning}
            onCancel={onCancel}
          />
        )}
        {stage.kind === "consent" && (
          <SedeReceivedConsent
            origin={errand.origin}
            asks={asks}
            terminalDocument={errand.terminalOrder?.documentPath}
            received={received}
            certificates={stage.certificates}
            liveCertificates={liveCertificates}
            reader={reader}
            narrowed={stage.narrowed}
            sha1ToAllow={stage.sha1ToAllow}
            countdown={consentCountdown}
            actions={actions}
            failure={receivedFailure}
            onExpandWindow={onExpandWindow}
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
          <SedeSigningProgress
            origin={errand.origin}
            asks={asks}
            terminal={errand.terminalOrder !== undefined}
            phase={stage.phase}
            onCancel={onCancel}
          />
        )}
        {(stage.kind === "saving" || stage.kind === "loading") && (
          <SedeFileTransfer origin={errand.origin} transfer={stage} />
        )}
        {stage.kind === "outcome" && (
          <SedeEnding
            origin={errand.origin}
            outcome={stage.outcome}
            onClose={onClose}
            onOpenHelp={onOpenHelp}
          />
        )}
        {stage.kind === "noCertificate" && (
          <SedeMissingCertificate
            origin={errand.origin}
            asks={asks}
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
