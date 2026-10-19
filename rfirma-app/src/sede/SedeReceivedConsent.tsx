//! El consentimiento de sede con lo que la sede manda a firmar, en sus dos formas: la compacta de 520 × 420 y la ampliada de 1080 × 660 con el visor, que abre «Ver documentos».

import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Admonition } from "../design-system/Admonition";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { useDefaultButton } from "../design-system/useDefaultButton";
import type { NamedFailure } from "../errors/classify";
import { errorText } from "../errors/errorMessage";
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
  /** El servidor trifásico de la sede prepara la firma: el aviso y el botón «Ver el documento enviado». */
  throughSiteServer?: boolean;
  countdown?: boolean;
  onConsent: (certificateId: string) => void;
  onCancel: () => void;
}

/** El consentimiento con lo recibido: la compacta y, con documentos de una sede, la ampliada que abre «Ver documentos»; las dos comparten lo elegido y la cuenta atrás. */
export function SedeReceivedConsent({
  received,
  terminalDocument,
  actions,
  failure = null,
  onExpandWindow,
  defaultExpanded = false,
  defaultDocument,
  defaultSignaturesOpen,
  ...basics
}: ConsentBasics & {
  /** `null` cuando la sede pide los datos y no hay nada que firmar. */
  received: Received | null;
  /** La ruta de `-i` cuando la firma la pide una orden de terminal: sin descarga ni vista ampliada, porque el fichero ya es suyo. */
  terminalDocument?: string;
  actions: ReceivedActions;
  /** Por qué no se descargó o no se abrió lo recibido la última vez que se pidió. */
  failure?: NamedFailure | null;
  /** Pide a la ventana ampliarse a 1080 × 660 o volver a su tamaño. */
  onExpandWindow: (expanded: boolean) => void;
  defaultExpanded?: boolean;
  defaultDocument?: string;
  defaultSignaturesOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const viewable = viewableDocuments(received, terminalDocument, basics.asks);
  const shownExpanded = expanded && viewable.length > 0;
  const giveTheWindowBack = () => {
    if (shownExpanded) onExpandWindow(false);
  };
  const consent = useConsent({
    ...basics,
    onConsent: (certificateId) => {
      giveTheWindowBack();
      basics.onConsent(certificateId);
    },
    onCancel: () => {
      giveTheWindowBack();
      basics.onCancel();
    },
  });
  const expand = (next: boolean) => {
    setExpanded(next);
    onExpandWindow(next);
  };

  return shownExpanded ? (
    <SedeConsentExpanded
      origin={basics.origin}
      sha1ToAllow={basics.sha1ToAllow}
      throughSiteServer={basics.throughSiteServer}
      consent={consent}
      documents={viewable}
      actions={actions}
      failure={failure}
      defaultDocument={defaultDocument}
      defaultSignaturesOpen={defaultSignaturesOpen}
      onCollapse={() => expand(false)}
    />
  ) : (
    <SedeConsentCompact
      origin={basics.origin}
      asks={basics.asks}
      sha1ToAllow={basics.sha1ToAllow}
      throughSiteServer={basics.throughSiteServer}
      consent={consent}
      received={received}
      terminalDocument={terminalDocument}
      onDownload={actions.onDownload}
      failure={failure}
      documents={viewable.length}
      onExpand={() => expand(true)}
    />
  );
}

/** Los documentos que se pueden ver en la ampliada: los de una sede que pide la firma, nunca los de una orden de terminal. */
function viewableDocuments(
  received: Received | null,
  terminalDocument: string | undefined,
  asks: ConsentBasics["asks"],
): readonly ReceivedDocument[] {
  if (received?.kind !== "documents" || terminalDocument !== undefined || asks === "identity") {
    return [];
  }
  return received.documents;
}

type Consent = ReturnType<typeof useConsent>;

/** La ventana compacta: el origen, el desplegable bajo él y, pegados al pie, el aviso y el recuento, con su descarga si hay `onDownload`, y con `documents`, «Ver documentos»; si pide los datos, lo que se envía en vez de lo recibido. */
function SedeConsentCompact({
  origin,
  asks,
  sha1ToAllow,
  throughSiteServer,
  consent,
  received,
  terminalDocument,
  onDownload,
  failure,
  documents,
  onExpand,
}: Pick<ConsentBasics, "origin" | "asks" | "sha1ToAllow" | "throughSiteServer"> & {
  consent: Consent;
  received: Received | null;
  terminalDocument?: string;
  onDownload?: () => void;
  failure: NamedFailure | null;
  documents: number;
  onExpand: () => void;
}) {
  const { t } = useTranslation();
  const terminal = terminalDocument !== undefined;
  const identity = asks === "identity" || received === null;
  const viewLabel = t(
    throughSiteServer ? "sede.consent.viewSentDocuments" : "sede.consent.viewDocuments",
    { count: documents },
  );

  return (
    <SedeBody
      flush
      steadyFooter
      primary={consent.button}
      onEscape={consent.onCancel}
      footer={
        <>
          {documents > 0 && (
            <Button
              variant="ghost"
              className="sede-received__view"
              title={viewLabel}
              onClick={onExpand}
            >
              <Icon name="expandSide" size={20} />
              <span className="sede-received__view-label">{viewLabel}</span>
            </Button>
          )}
          {consent.footer}
        </>
      }
    >
      <ReceivedColumn origin={origin} asks={asks} terminal={terminal} certificate={consent.select}>
        <div className="sede-received__overview">
          {identity ? (
            <p className="rf-prose sede-received__sends">{t("sede.consent.willSend")}</p>
          ) : (
            <>
              <ReceivedSummary
                documents={received.kind === "documents" ? received.documents : []}
                certificate={consent.chosen}
                sha1ToAllow={sha1ToAllow}
                throughSiteServer={throughSiteServer}
              />
              {terminal ? (
                <TerminalDocumentHeading documentPath={terminalDocument} />
              ) : (
                <ReceivedHeading received={received} onDownload={onDownload} />
              )}
              {failure !== null && <ReceivedFailure failure={failure} />}
            </>
          )}
        </div>
      </ReceivedColumn>
    </SedeBody>
  );
}

/** La ventana ampliada: el documento a la izquierda, a todo lo alto, y el consentimiento en una columna de 400 px: el desplegable, el aviso de lo que ya firmaste tú y los documentos. */
function SedeConsentExpanded({
  origin,
  sha1ToAllow,
  throughSiteServer,
  consent,
  documents,
  actions,
  failure,
  defaultDocument,
  defaultSignaturesOpen = false,
  onCollapse,
}: Pick<ConsentBasics, "origin" | "sha1ToAllow" | "throughSiteServer"> & {
  consent: Consent;
  documents: readonly ReceivedDocument[];
  actions: ReceivedActions;
  failure: NamedFailure | null;
  defaultDocument?: string;
  defaultSignaturesOpen?: boolean;
  onCollapse: () => void;
}) {
  const { t } = useTranslation();
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
          onEscape={consent.onCancel}
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
          <ReceivedColumn origin={origin} certificate={consent.select}>
            <ReceivedSummary
              documents={documents}
              certificate={consent.chosen}
              sha1ToAllow={sha1ToAllow}
              throughSiteServer={throughSiteServer}
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
              {failure !== null && <ReceivedFailure failure={failure} />}
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

/** El aviso en línea de lo recibido que no se pudo descargar ni abrir. */
function ReceivedFailure({ failure }: { failure: NamedFailure }) {
  const { t } = useTranslation();
  const message = errorText(failure.situation, t);

  return (
    <Admonition tone="error" title={message.title}>
      {message.body !== undefined && <p className="rf-body">{message.body}</p>}
    </Admonition>
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
    onCancel,
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
