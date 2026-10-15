//! El documento recibido en la vista ampliada de la sede: la franja de sus firmas y, debajo, el visor de PDF, su texto literal, su imagen o el aviso de que no tiene vista previa.

import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import { DocumentViewer } from "../viewer/DocumentViewer";
import { type ReceivedDocument, receivedName } from "./received";
import { SignaturesStrip } from "./SignaturesStrip";
import "./ReceivedViewer.css";

/** El documento que se mira, a todo lo alto, con sus firmas encima. */
export function ReceivedViewer({
  document,
  defaultSignaturesOpen = false,
  onOpenWith,
}: {
  document: ReceivedDocument;
  defaultSignaturesOpen?: boolean;
  onOpenWith?: (document: ReceivedDocument) => void;
}) {
  return (
    <SignaturesStrip
      key={document.id}
      report={document.previousSignatures}
      defaultOpen={defaultSignaturesOpen}
    >
      <div className="received-viewer">
        <Content document={document} onOpenWith={onOpenWith} />
      </div>
    </SignaturesStrip>
  );
}

function Content({
  document,
  onOpenWith,
}: {
  document: ReceivedDocument;
  onOpenWith?: (document: ReceivedDocument) => void;
}) {
  const { t } = useTranslation();
  const { content } = document;
  const name = receivedName(t, document);

  switch (content.kind) {
    case "pdf":
      return (
        <DocumentViewer
          key={document.id}
          pdf={content.pdf}
          placement={null}
          canPlace={false}
          onOpen={noop}
        />
      );
    case "text":
      return (
        <div className="received-viewer__scroll">
          <pre className="rf-body received-viewer__sheet received-viewer__text">{content.text}</pre>
        </div>
      );
    case "image":
      return (
        <div className="received-viewer__scroll">
          <figure className="received-viewer__sheet received-viewer__image">
            <img src={dataUrl(content.mediaType, content.bytes)} alt={name} />
          </figure>
        </div>
      );
    case "none":
      return (
        <div className="received-viewer__scroll">
          <section
            className="received-viewer__sheet received-viewer__without-preview"
            aria-label={name}
          >
            <Icon name="document" size={48} strokeWidth={1.2} />
            <p className="rf-body received-viewer__name">{name}</p>
            <p className="rf-body rf-text-muted">{t("sede.received.noPreview")}</p>
            {document.knownType && onOpenWith && (
              <Button variant="ghost" onClick={() => onOpenWith(document)}>
                <Icon name="externalLink" />
                {t("sede.received.openWith")}
              </Button>
            )}
          </section>
        </div>
      );
  }
}

function dataUrl(mediaType: string, bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${mediaType};base64,${btoa(binary)}`;
}

function noop() {}
