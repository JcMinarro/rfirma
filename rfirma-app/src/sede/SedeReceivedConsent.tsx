//! El consentimiento de sede con lo que la sede manda a firmar, en sus dos formas: la compacta de 520 × 420 y la ampliada de 1080 × 660 con el visor; hoy solo lo pintan las historias.

import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { useDefaultButton } from "../design-system/useDefaultButton";
import { CertificateSelect } from "../signing/CertificateSelect";
import { type Certificate, sitePreselection } from "../signing/certificate";
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
  countdown?: boolean;
  onConsent: (certificateId: string) => void;
  onCancel: () => void;
}

/** La ventana compacta: el origen, el recuento con su descarga, el resumen de las firmas previas, el desplegable fijo encima del pie y, con documentos, «Ver documentos». */
export function SedeConsentCompact({
  received,
  onExpand,
  ...basics
}: ConsentBasics & { received: Received; onExpand?: () => void }) {
  const { t } = useTranslation();
  const consent = useConsent(basics);
  const documents = received.kind === "documents" ? received.documents.length : 0;

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
      <ReceivedColumn origin={basics.origin} certificate={consent.select}>
        <div className="sede-received__overview">
          <ReceivedHeading received={received} onDownload={basics.actions.onDownload} />
          {received.kind === "documents" && <ReceivedSummary documents={received.documents} />}
        </div>
      </ReceivedColumn>
    </SedeBody>
  );
}

/** La ventana ampliada: el documento a la izquierda, a todo lo alto, y el consentimiento en una columna de 360 px. */
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
          <ReceivedViewer document={shown} defaultSignaturesOpen={signaturesOpen} />
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
            <nav
              className="sede-received__documents"
              aria-label={t("sede.received.documents", { count: documents.length })}
            >
              <ReceivedHeading
                received={{ kind: "documents", documents }}
                onDownload={basics.actions.onDownload}
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
  certificate,
  children,
}: {
  origin: string | null;
  certificate: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="sede-received">
      <SedeOrigin origin={origin} />
      <div className="sede-received__body">
        {children}
        <div className="sede-received__certificate">{certificate}</div>
      </div>
    </div>
  );
}

function useConsent({
  certificates,
  countdown = false,
  onConsent,
  onCancel,
}: Pick<ConsentBasics, "certificates" | "countdown" | "onConsent" | "onCancel">) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState(() => sitePreselection(certificates));
  const remaining = useConsentCountdown(countdown);
  const ready = chosen !== null && remaining === 0;
  const button = useDefaultButton(ready);
  const action = t("actions.sign");

  return {
    button,
    select: (
      <CertificateSelect
        certificates={certificates}
        chosen={chosen}
        onChoose={setChosen}
        listMaxHeight={300}
        opens="up"
      />
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
