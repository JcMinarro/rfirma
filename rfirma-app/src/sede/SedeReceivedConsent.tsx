//! El consentimiento de sede con lo que la sede manda a firmar, en sus dos formas: la compacta de 520 × 420, la de la ventana real, y la ampliada de 1080 × 660 con el visor, que hoy solo pintan las historias.

import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { useDefaultButton } from "../design-system/useDefaultButton";
import { CertificateSelect } from "../signing/CertificateSelect";
import {
  type Certificate,
  type CertificateState,
  keptAcrossTheReader,
  type ReaderStatus,
  sitePreselection,
  UNAVAILABLE_READER,
} from "../signing/certificate";
import { ReaderLine } from "../signing/ReaderLine";
import { ReceivedHeading } from "./ReceivedHeading";
import { ReceivedList } from "./ReceivedList";
import { ReceivedSummary } from "./ReceivedSummary";
import { ReceivedViewer } from "./ReceivedViewer";
import type { Received, ReceivedActions, ReceivedDocument } from "./received";
import { SedeBody, useConsentCountdown } from "./SedeFrame";
import { SedeOrigin } from "./SedeOrigin";
import { TerminalDocumentHeading } from "./TerminalDocumentHeading";
import "./SedeReceivedConsent.css";

interface ConsentBasics {
  origin: string | null;
  certificates: readonly Certificate[];
  /** La lista que trajo un lector y sustituye a la de la sede, conservando lo elegido si sigue en ella. */
  liveCertificates?: readonly Certificate[] | null;
  reader?: ReaderStatus;
  /** Qué pide: la firma o, con `selectcert`, los datos del certificado. */
  asks?: "signature" | "identity";
  /** La sede acotó los certificados: lo dice al pie de la lista abierta. */
  narrowed?: boolean;
  /** La sede pide SHA-1 sin permiso en Preferencias: el aviso, «Firmar igualmente» y la cuenta atrás obligada. */
  sha1ToAllow?: boolean;
  countdown?: boolean;
  onConsent: (certificateId: string) => void;
  onCancel: () => void;
}

/** La ventana compacta: el origen, el desplegable bajo él y, pegados al pie, el aviso y el recuento, con su descarga si hay `onDownload`, y con documentos de una sede y `onExpand`, «Ver documentos»; si pide los datos, lo que se envía en vez de lo recibido. */
export function SedeConsentCompact({
  received,
  terminalDocument,
  onDownload,
  onExpand,
  ...basics
}: ConsentBasics & {
  /** `null` cuando la sede pide los datos y no hay nada que firmar. */
  received: Received | null;
  /** La ruta de `-i` cuando la firma la pide una orden de terminal: sin descarga ni vista ampliada, porque el fichero ya es suyo. */
  terminalDocument?: string;
  onDownload?: () => void;
  onExpand?: () => void;
}) {
  const { t } = useTranslation();
  const consent = useConsent(basics);
  const terminal = terminalDocument !== undefined;
  const identity = basics.asks === "identity" || received === null;
  const documents =
    received?.kind === "documents" && !terminal && !identity && onExpand !== undefined
      ? received.documents.length
      : 0;

  return (
    <SedeBody
      flush
      steadyFooter
      primary={consent.button}
      onEscape={basics.onCancel}
      footer={
        <>
          {documents > 0 && (
            <Button
              variant="ghost"
              className="sede-received__view"
              title={t("sede.consent.viewDocuments", { count: documents })}
              onClick={onExpand}
            >
              <Icon name="expandSide" size={20} />
              <span className="sede-received__view-label">
                {t("sede.consent.viewDocuments", { count: documents })}
              </span>
            </Button>
          )}
          {consent.footer}
        </>
      }
    >
      <ReceivedColumn
        origin={basics.origin}
        asks={basics.asks}
        terminal={terminal}
        certificate={consent.select}
      >
        <div className="sede-received__overview">
          {identity ? (
            <p className="rf-prose sede-received__sends">{t("sede.consent.willSend")}</p>
          ) : (
            <>
              <ReceivedSummary
                documents={received.kind === "documents" ? received.documents : []}
                certificate={consent.chosen}
                sha1ToAllow={basics.sha1ToAllow}
              />
              {terminal ? (
                <TerminalDocumentHeading documentPath={terminalDocument} />
              ) : (
                <ReceivedHeading received={received} onDownload={onDownload} />
              )}
            </>
          )}
        </div>
      </ReceivedColumn>
    </SedeBody>
  );
}

/** La ventana ampliada: el documento a la izquierda, a todo lo alto, y el consentimiento en una columna de 400 px: el desplegable, el aviso de lo que ya firmaste tú y los documentos. */
export function SedeConsentExpanded({
  documents,
  actions,
  defaultDocument,
  defaultSignaturesOpen = false,
  onCollapse,
  ...basics
}: ConsentBasics & {
  documents: readonly ReceivedDocument[];
  actions: ReceivedActions;
  defaultDocument?: string;
  defaultSignaturesOpen?: boolean;
  onCollapse?: () => void;
}) {
  const { t } = useTranslation();
  const consent = useConsent(basics);
  const [selected, setSelected] = useState(defaultDocument);
  const [signaturesOpen, setSignaturesOpen] = useState(defaultSignaturesOpen);
  const shown = documents.find((document) => document.id === selected) ?? documents[0];
  const select = (id: string) => {
    setSelected(id);
    setSignaturesOpen(false);
  };

  return (
    <div className="sede-received-wide">
      <div className="sede-received-wide__viewer">
        {shown !== undefined && (
          <ReceivedViewer
            document={shown}
            defaultSignaturesOpen={signaturesOpen}
            onOpenWith={actions.onOpenWith}
          />
        )}
      </div>
      <div className="sede-received-wide__side">
        <SedeBody
          flush
          steadyFooter
          primary={consent.button}
          onEscape={basics.onCancel}
          footer={
            <>
              <Button
                variant="ghost"
                className="sede-received__hide"
                aria-label={t("sede.consent.hideDocuments")}
                title={t("sede.consent.hideDocuments")}
                onClick={onCollapse}
              >
                <Icon name="collapseSide" size={20} />
              </Button>
              {consent.footer}
            </>
          }
        >
          <ReceivedColumn origin={basics.origin} certificate={consent.select}>
            <ReceivedSummary
              documents={documents}
              certificate={consent.chosen}
              sha1ToAllow={basics.sha1ToAllow}
              yoursOnly
            />
            <nav
              className="sede-received__documents"
              aria-label={t("sede.received.documents", { count: documents.length })}
            >
              <ReceivedHeading
                received={{ kind: "documents", documents }}
                onDownload={actions.onDownload}
                withoutCount
              />
              {shown !== undefined && (
                <ReceivedList
                  documents={documents}
                  actions={actions}
                  selected={shown.id}
                  onSelect={select}
                />
              )}
            </nav>
          </ReceivedColumn>
        </SedeBody>
      </div>
    </div>
  );
}

function ReceivedColumn({
  origin,
  asks,
  terminal,
  certificate,
  children,
}: {
  origin: string | null;
  asks?: "signature" | "identity";
  terminal?: boolean;
  certificate: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="sede-received">
      <SedeOrigin origin={origin} asks={asks} terminal={terminal} />
      <div className="sede-received__body">
        <div className="sede-received__certificate">{certificate}</div>
        {children}
      </div>
    </div>
  );
}

function useConsent({
  origin,
  asks = "signature",
  certificates: initial,
  liveCertificates = null,
  reader = UNAVAILABLE_READER,
  narrowed = false,
  sha1ToAllow = false,
  countdown = false,
  onConsent,
  onCancel,
}: ConsentBasics) {
  const { t } = useTranslation();
  const { certificates, chosen, setChosen } = useChosenCertificate(initial, liveCertificates);
  const remaining = useConsentCountdown(countdown || sha1ToAllow);
  const ready = chosen !== null && remaining === 0;
  const button = useDefaultButton(ready);
  const action =
    asks === "identity"
      ? t("sede.consent.identify")
      : sha1ToAllow
        ? t("sede.received.signAnyway")
        : t("actions.sign");
  const narrowedNote = !narrowed
    ? undefined
    : origin === null
      ? t("sede.received.narrowedUnknownOrigin")
      : t("sede.received.narrowed", { origin });

  return {
    chosen,
    button,
    select: (
      <>
        <CertificateSelect
          certificates={certificates}
          chosen={chosen}
          onChoose={setChosen}
          listMaxHeight={300}
          footer={narrowedNote}
        />
        <ReaderLine reader={reader} withoutHelp />
      </>
    ),
    footer: (
      <>
        <Button variant="ghost" className="sede-received__steady" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button
          ref={button}
          variant="primary"
          className="sede-received__steady"
          disabled={!ready}
          onClick={() => chosen !== null && onConsent(chosen.id)}
        >
          {remaining > 0 ? t("sede.consent.countdown", { action, seconds: remaining }) : action}
        </Button>
      </>
    ),
  };
}

/** Lo elegido y la última lista que trajo un lector, que decide si el cambio de lista pide recalcular. */
interface Held {
  live: readonly Certificate[] | null;
  chosen: Certificate | null;
}

/** La lista vigente, la de la sede o la del lector, y lo elegido en ella, que sigue a la tarjeta que entra o sale. */
function useChosenCertificate(
  initial: readonly Certificate[],
  liveCertificates: readonly Certificate[] | null,
) {
  const [held, setHeld] = useState<Held>(() => ({
    live: null,
    chosen: sitePreselection(initial),
  }));
  let current = held;
  if (liveCertificates !== null && held.live !== liveCertificates) {
    current = {
      live: liveCertificates,
      chosen: chosenAfterTheReader(held, initial, liveCertificates),
    };
    setHeld(current);
  }
  return {
    certificates: liveCertificates ?? initial,
    chosen: current.chosen,
    setChosen: (certificate: Certificate) => setHeld({ ...current, chosen: certificate }),
  };
}

function chosenAfterTheReader(
  held: Held,
  initial: readonly Certificate[],
  arrived: readonly Certificate[],
): Certificate | null {
  const before = held.live ?? initial;
  const previous: CertificateState =
    held.chosen === null
      ? { kind: "unchosen", certificates: before }
      : { kind: "chosen", certificate: held.chosen, certificates: before };
  const kept = keptAcrossTheReader(previous, arrived);
  return kept.kind === "chosen" ? kept.certificate : null;
}
