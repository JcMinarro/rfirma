import { describe, expect, it } from "vitest";
import {
  previousSignaturesState,
  previousSignaturesTally,
  receivedCount,
  receivedOf,
} from "./received";
import { previousSignature, previousSignaturesReport } from "./testing/fixtures/previousSignatures";
import {
  BATCH_DOCUMENTS,
  DESIGN_CERTIFICATES,
  RESOLUTION_DOCUMENT,
  withYourSignature,
  yourSignature,
} from "./testing/fixtures/received";
import { consentStage, signedDocument } from "./testing/fixtures/sedeWindow";

const [PERSON_CERTIFICATE, REPRESENTATIVE_CERTIFICATE] = DESIGN_CERTIFICATES;
const nobody = { sameCertificate: 0, otherCertificate: 0 };

describe("previousSignaturesState", () => {
  it("is none without signatures", () => {
    expect(previousSignaturesState(previousSignaturesReport([]))).toBe("none");
  });

  it("is signed when every signature is valid", () => {
    expect(previousSignaturesState(previousSignaturesReport([previousSignature()]))).toBe("signed");
  });

  it.each(["expired", "invalid"] as const)("is troubled with an %s signature", (validity) => {
    const report = previousSignaturesReport([previousSignature(), previousSignature({ validity })]);
    expect(previousSignaturesState(report)).toBe("troubled");
  });

  it("is troubled with an invalid countersignature", () => {
    const report = previousSignaturesReport([
      previousSignature({ countersignatures: [previousSignature({ validity: "invalid" })] }),
    ]);
    expect(previousSignaturesState(report)).toBe("troubled");
  });

  it("is troubled with a finding", () => {
    const report = previousSignaturesReport([previousSignature()], {
      findings: ["modifiedAfterLastSignature"],
    });
    expect(previousSignaturesState(report)).toBe("troubled");
  });
});

describe("receivedCount", () => {
  it("counts the remote batch by its number", () => {
    expect(receivedCount({ kind: "remoteBatch", count: 4 })).toBe(4);
  });
});

describe("receivedOf", () => {
  const documentsOf = (stage: Parameters<typeof receivedOf>[0]) => {
    const received = receivedOf(stage);
    return received?.kind === "documents" ? received.documents : [];
  };

  it("gives the consented document with its previous signatures as the port sent them", () => {
    const previousSignatures = previousSignaturesReport([previousSignature()]);
    const stage = consentStage({ document: { ...signedDocument, previousSignatures } });

    const [document, ...rest] = documentsOf(stage);

    expect(rest).toEqual([]);
    expect(document?.name).toBe("Solicitud de subvención 2026");
    expect(document?.previousSignatures).toBe(previousSignatures);
  });

  it.each([null, "  "])("leaves the document without a name when its title is %j", (title) => {
    const [document] = documentsOf(consentStage({ document: { ...signedDocument, title } }));

    expect(document?.name).toBeNull();
  });

  it.each(["xml", "invoice"] as const)("gives one unnamed document for %s", (signing) => {
    const [document, ...rest] = documentsOf(consentStage({ document: null, signing }));

    expect(rest).toEqual([]);
    expect(document?.name).toBeNull();
    expect(document?.previousSignatures.signatures).toEqual([]);
  });

  it("gives one unnamed document for a PDF that could not be read", () => {
    expect(documentsOf(consentStage({ document: null, signing: "pdf" }))).toHaveLength(1);
  });

  it("gives the challenge for whatever the window counts as one", () => {
    expect(receivedOf(consentStage({ document: null, signing: "challenge" }))).toEqual({
      kind: "challenge",
    });
  });

  it("gives only the count of a remote batch", () => {
    const stage = consentStage({ document: null, signing: null, signs: 4 });

    expect(receivedOf(stage)).toEqual({ kind: "remoteBatch", count: 4 });
  });

  it("gives only the count of a local batch, like the remote one", () => {
    const item = { signing: "pdf", round: { kind: "sign" } } as const;
    const stage = consentStage({
      document: null,
      signing: null,
      signs: 2,
      items: [
        { id: "001", ...item },
        { id: "002", ...item },
      ],
    });

    expect(receivedOf(stage)).toEqual({ kind: "remoteBatch", count: 2 });
  });

  it("gives nothing when the site asks for your data", () => {
    expect(receivedOf(consentStage({ document: null, signing: null }))).toBeNull();
  });
});

describe("previousSignaturesTally", () => {
  it("counts every document with signatures and those with a troubled one", () => {
    expect(previousSignaturesTally(BATCH_DOCUMENTS)).toEqual({
      byOthers: 3,
      ...nobody,
      troubled: 1,
    });
  });

  it("counts a troubled document among the signed ones", () => {
    expect(previousSignaturesTally([RESOLUTION_DOCUMENT])).toEqual({
      byOthers: 1,
      ...nobody,
      troubled: 1,
    });
  });

  it("is empty without previous signatures", () => {
    expect(previousSignaturesTally([])).toEqual({ byOthers: 0, ...nobody, troubled: 0 });
  });

  it("counts what you signed with the chosen certificate apart from the others", () => {
    const documents = withYourSignature(BATCH_DOCUMENTS, yourSignature("sameCertificate"));
    expect(previousSignaturesTally(documents, PERSON_CERTIFICATE ?? null)).toEqual({
      byOthers: 3,
      sameCertificate: 2,
      otherCertificate: 0,
      troubled: 1,
    });
  });

  it("counts what you signed with another certificate of yours", () => {
    const documents = withYourSignature(BATCH_DOCUMENTS, yourSignature("otherCertificate"));
    expect(previousSignaturesTally(documents, PERSON_CERTIFICATE ?? null)).toEqual({
      byOthers: 3,
      sameCertificate: 0,
      otherCertificate: 2,
      troubled: 1,
    });
  });

  it("counts your signature as another person's when you sign for an entity", () => {
    const documents = withYourSignature(BATCH_DOCUMENTS, yourSignature("sameCertificate"));
    expect(previousSignaturesTally(documents, REPRESENTATIVE_CERTIFICATE ?? null)).toEqual({
      byOthers: 4,
      ...nobody,
      troubled: 1,
    });
  });
});
