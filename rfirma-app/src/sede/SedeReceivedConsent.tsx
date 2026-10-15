//! El consentimiento de sede con lo que la sede manda a firmar, en sus dos formas: la compacta de 520 × 420 y la ampliada de 1080 × 660 con el visor; hoy solo lo pintan las historias.

import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { useDefaultButton } from "../design-system/useDefaultButton";
import { CertificateSelect } from "../signing/CertificateSelect";
import {
  type Certificate,
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
import "./SedeReceivedConsent.css";

interface ConsentBasics {
  origin: string | null;
  actions: ReceivedActions;
  certificates: readonly Certificate[];
  reader?: ReaderStatus;
  /** Qué pide: la firma o, con `selectcert`, los datos del certificado. */
  asks?: "signature" | "identity";
  /** La sede acotó los certificados: lo dice al pie de la lista abierta. */
  narrowed?: boolean;
  /** La sede pide SHA-1 sin permiso en Preferencias: el aviso, «Firmar solo esta vez» y la cuenta atrás obligada. */
  sha1ToAllow?: boolean;
  countdown?: boolean;
  onConsent: (certificateId: string) => void;
  onCancel: () => void;
}

/** La ventana compacta: el origen, el desplegable bajo él y, pegados al pie, el aviso y el recuento con su descarga, y con documentos de una sede, «Ver documentos»; si pide los datos, lo que se envía en vez de lo recibido. */
export function SedeConsentCompact({
  received,
  terminal = false,
  onExpand,
  ...basics
}: ConsentBasics & {
  received: Received;
  /** La firma la pide una orden de terminal: sin descarga ni vista ampliada, porque el fichero ya es suyo. */
  terminal?: boolean;
  onExpand?: () => void;
}) {
  const { t } = useTranslation();
  const consent = useConsent(basics);
  const identity = basics.asks === "identity";
  const documents =
    received.kind === "documents" && !terminal && !identity ? received.documents.length : 0;

  return (
    <SedeBody
      flush
      steadyFooter
      primary={consent.button}
      onEscape={basics.onCancel}
      footer={
        <>
          {documents > 0 && (
            <Button variant="ghost" className="sede-received__view" onClick={onExpand}>
              <Icon name="expandSide" size={16} strokeWidth={2} />
              {t("sede.consent.viewDocuments", { count: documents })}
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
              <ReceivedHeading
                received={received}
                onDownload={terminal ? undefined : basics.actions.onDownload}
              />
            </>
          )}
        </div>
      </ReceivedColumn>
    </SedeBody>
  );
}

/** La ventana ampliada: el documento a la izquierda, a todo lo alto, y el consentimiento en una columna de 360 px: el desplegable, el aviso de lo que ya firmaste tú y los documentos. */
export function SedeConsentExpanded({
  documents,
  defaultDocument,
  defaultSignaturesOpen = false,
  onCollapse,
  ...basics
}: ConsentBasics & {
  documents: readonly ReceivedDocument[];
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
            onOpenWith={basics.actions.onOpenWith}
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
              <Button variant="ghost" className="sede-received__view" onClick={onCollapse}>
                {t("sede.consent.hideDocuments")}
                <Icon name="collapseSide" size={16} strokeWidth={2} />
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
                onDownload={basics.actions.onDownload}
                withoutCount
              />
              {shown !== undefined && (
                <ReceivedList
                  documents={documents}
                  actions={basics.actions}
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
  certificates,
  reader = UNAVAILABLE_READER,
  narrowed = false,
  sha1ToAllow = false,
  countdown = false,
  onConsent,
  onCancel,
}: Omit<ConsentBasics, "actions">) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState(() => sitePreselection(certificates));
  const remaining = useConsentCountdown(countdown || sha1ToAllow);
  const ready = chosen !== null && remaining === 0;
  const button = useDefaultButton(ready);
  const action =
    asks === "identity"
      ? t("sede.consent.identify")
      : sha1ToAllow
        ? t("sede.consent.signOnce")
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
        <Button variant="ghost" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button
          ref={button}
          variant="primary"
          disabled={!ready}
          onClick={() => chosen !== null && onConsent(chosen.id)}
        >
          {remaining > 0 ? t("sede.consent.countdown", { action, seconds: remaining }) : action}
        </Button>
      </>
    ),
  };
}
