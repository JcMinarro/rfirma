//! El documento recibido en la vista ampliada de la sede: la franja de sus firmas y, debajo, el visor de PDF o su texto literal.

import { DocumentViewer } from "../viewer/DocumentViewer";
import type { ReceivedDocument } from "./received";
import { SignaturesStrip } from "./SignaturesStrip";
import "./ReceivedViewer.css";

/** El documento que se mira, a todo lo alto, con sus firmas encima. */
export function ReceivedViewer({
  document,
  defaultSignaturesOpen = false,
}: {
  document: ReceivedDocument;
  defaultSignaturesOpen?: boolean;
}) {
  const { content } = document;

  return (
    <SignaturesStrip
      key={document.id}
      report={document.previousSignatures}
      defaultOpen={defaultSignaturesOpen}
    >
      <div className="received-viewer">
        {content.kind === "text" ? (
          <div className="received-viewer__text-scroll">
            <pre className="rf-body received-viewer__text">{content.text}</pre>
          </div>
        ) : (
          <DocumentViewer
            key={document.id}
            pdf={content.kind === "pdf" ? content.pdf : null}
            placement={null}
            canPlace={false}
            withoutPreview={content.kind === "none" ? document.name : null}
            onOpen={noop}
          />
        )}
      </div>
    </SignaturesStrip>
  );
}

function noop() {}
