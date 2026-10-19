//! Los trámites de sede que montan las pruebas de la ventana, uno por momento y variante.

import type { Errand, ErrandStage, SiteOutcome } from "../../errand";
import { previousSignature, previousSignaturesReport } from "./previousSignatures";
import { LOCAL_BATCH_DOCUMENTS } from "./received";
import { sedeErrand } from "./sedeView";
import { certificate, consentStage, signedDocument } from "./sedeWindow";

function errandStory(errand: Errand) {
  return { args: {}, parameters: { errand } };
}

type ConsentStage = Extract<ErrandStage, { kind: "consent" }>;

const terminalOrder = { documentPath: "/home/ada/contratos/convenio.pdf" };

const consenting = (stage: ConsentStage, errand: Partial<Errand> = {}) =>
  errandStory(sedeErrand(stage, errand));

const outcome = (result: SiteOutcome) =>
  errandStory(sedeErrand({ kind: "outcome", outcome: result }));

const confirming = (messageCode: string) =>
  errandStory(sedeErrand({ kind: "confirming", messageCode }));

export const OldWebClient = errandStory(sedeErrand({ kind: "oldWebClient" }));

export const Waiting = errandStory(sedeErrand({ kind: "waiting" }, { origin: null }));

export const Unreachable = errandStory(sedeErrand({ kind: "unreachable" }));

export const NoChannel = errandStory(sedeErrand({ kind: "noChannel", reason: "channelNotOpened" }));

export const Consent = consenting(consentStage());

export const PrecalculatedHash = consenting(
  consentStage({ document: { ...signedDocument, precalculatedHash: true } }),
);

export const Batch = consenting(consentStage({ document: null, signs: 3, signing: null }));

export const LocalBatch = consenting(
  consentStage({
    document: null,
    signs: 5,
    signing: null,
    items: LOCAL_BATCH_DOCUMENTS,
  }),
);

export const IdentityData = consenting(consentStage({ document: null, signing: null }), {
  operation: "selectcert",
});

export const PreviousSignaturesWithProblem = consenting(
  consentStage({
    document: {
      ...signedDocument,
      round: { kind: "cosign" },
      previousSignatures: previousSignaturesReport(
        [
          previousSignature(),
          previousSignature({
            name: "Grace Brewster Hopper",
            idNumber: "00056780Q",
            certificateSerialNumber: "2",
            validity: "invalid",
            validityReason: { kind: "modifiedAfterSigning" },
          }),
        ],
        { warningCount: 1, tone: "attention" },
      ),
    },
  }),
);

export const TerminalOrder = consenting(consentStage({ narrowed: true }), {
  origin: null,
  terminalOrder,
});

export const ShadowAttackSuspect = confirming("pdfShadowAttackSuspect");

export const Signing = errandStory(
  sedeErrand({ kind: "signing", certificate: certificate(), phase: "signing" }),
);

export const Returning = errandStory(
  sedeErrand({ kind: "signing", certificate: certificate(), phase: "returning" }),
);

export const NoneInstalled = errandStory(
  sedeErrand({ kind: "noCertificate", reason: "none", owned: 0 }),
);

export const ExcludedBySite = errandStory(
  sedeErrand({ kind: "noCertificate", reason: "excluded", owned: 2 }),
);

export const TerminalExcludedByFilter = errandStory(
  sedeErrand(
    { kind: "noCertificate", reason: "excluded", owned: 2 },
    { origin: null, terminalOrder },
  ),
);

export const UnreadableDocument = errandStory(sedeErrand({ kind: "marking", pdf: null }));

export const Signed = outcome({ kind: "signed", document: signedDocument });

export const Cancelled = outcome({ kind: "cancelled", document: signedDocument });

export const RefusedContactSite = outcome({
  kind: "refused",
  situation: "missingFormat",
  detail: "SAF_01: falta el parámetro format",
});

export const RefusedCloseOther = outcome({
  kind: "refused",
  situation: "portsTaken",
  detail: "SAF_09: puertos ocupados",
});

export const RefusedUnknown = outcome({
  kind: "refused",
  situation: "unknown",
  detail: "error inesperado",
});
