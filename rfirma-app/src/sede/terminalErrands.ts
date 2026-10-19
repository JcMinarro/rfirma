//! El adaptador de `SiteErrandPort` para `-certgui`: lee la elección de la terminal como un trámite con `terminalOrder` y manda lo elegido a las órdenes de la terminal; sin React ni Tauri.

import type { Certificate } from "../signing/certificate";
import type { StageResult } from "../signing/flow";
import { NO_PREVIOUS_SIGNATURES } from "../signing/previousSignatures";
import type { StoreSecret } from "../signing/secret";
import {
  type DocumentType,
  type Errand,
  type NoCertificateReason,
  noErrand,
  type SigningKind,
  type SiteDocument,
  type SiteErrandPort,
} from "./errand";
import { refusedBy } from "./errandConversion";

/** Por qué la orden no ofrece ningún certificado, tal como lo emite el backend. */
type TerminalNoCertificate = "none" | "allExpired" | "excluded";

/** `TerminalChoiceView`: el documento de `-i`, qué es según sus bytes, con qué formato se firma y el momento de la elección. */
export interface TerminalChoiceView {
  document: string;
  detected: DocumentType;
  signing: SigningKind;
  stage:
    | { kind: "askingToSign"; certificates: readonly Certificate[] }
    | { kind: "noCertificate"; reason: TerminalNoCertificate; owned: number };
}

/** Las órdenes de `-certgui`, una función por orden. */
export interface TerminalCommands {
  /** `read_terminal_choice`. */
  readChoice(): Promise<TerminalChoiceView>;
  /** `terminal_choose_certificate`: dice qué secreto pide el almacén; si falla, la orden ya sabe por qué y la ventana se cierra. */
  chooseCertificate(certificate: string): Promise<StageResult<StoreSecret>>;
  /** `terminal_cancel`: cancela la elección y cierra la ventana. */
  cancel(): Promise<void>;
}

const NO_CERTIFICATE_SHOWN_AS: Record<TerminalNoCertificate, NoCertificateReason> = {
  none: "none",
  allExpired: "none",
  excluded: "excluded",
};

/** Lo único que la ventana sabe del documento de `-i`: la ruta; el fichero es de la terminal y no cruza. */
function documentOfTheOrder(path: string, detected: DocumentType): SiteDocument {
  return {
    handle: "",
    name: path.split(/[\\/]/).pop() ?? path,
    detected,
    sha256: "",
    title: null,
    pages: 0,
    sizeBytes: 0,
    round: { kind: "sign" },
    previousSignatures: NO_PREVIOUS_SIGNATURES,
    content: { kind: "none" },
    precalculatedHash: false,
  };
}

function errandOf(choice: TerminalChoiceView): Errand {
  const terminalOrder = { documentPath: choice.document };
  const stage = choice.stage;
  if (stage.kind === "noCertificate") {
    return {
      origin: null,
      operation: "sign",
      terminalOrder,
      stage: {
        kind: "noCertificate",
        reason: NO_CERTIFICATE_SHOWN_AS[stage.reason],
        owned: stage.owned,
      },
    };
  }
  return {
    origin: null,
    operation: "sign",
    terminalOrder,
    stage: {
      kind: "consent",
      document: documentOfTheOrder(choice.document, choice.detected),
      signs: null,
      signing: choice.signing,
      items: null,
      certificates: stage.certificates,
      narrowed: false,
      sha1Allowed: false,
      sha1ToAllow: false,
    },
  };
}

/** El puerto de la ventana que abre `-certgui`; el resto de órdenes de la sede no tienen sentido aquí. */
export function terminalErrands(commands: TerminalCommands): SiteErrandPort {
  let listener: ((errand: Errand | null) => void) | null = null;
  let current: Errand | null = null;
  const publish = (errand: Errand) => {
    current = errand;
    listener?.(errand);
  };

  return {
    ...noErrand(),
    watch(onChange) {
      listener = onChange;
      commands.readChoice().then(
        (choice) => publish(errandOf(choice)),
        (thrown) =>
          publish({
            origin: null,
            operation: "sign",
            stage: {
              kind: "outcome",
              outcome: { kind: "refused", situation: "unknown", detail: String(thrown) },
            },
          }),
      );
      return () => {
        listener = null;
      };
    },
    async consent(certificate) {
      const chosen = await commands.chooseCertificate(certificate);
      if (chosen.ok || current === null) return;
      publish({
        ...current,
        stage: { kind: "outcome", outcome: refusedBy(chosen.failure) },
      });
    },
    cancel: () => commands.cancel(),
    close: () => commands.cancel(),
  };
}
