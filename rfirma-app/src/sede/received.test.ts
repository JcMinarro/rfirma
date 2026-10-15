import { describe, expect, it } from "vitest";
import { previousSignaturesState, previousSignaturesTally, receivedCount } from "./received";
import { previousSignature, previousSignaturesReport } from "./testing/fixtures/previousSignatures";
import { BATCH_DOCUMENTS, RESOLUTION_DOCUMENT } from "./testing/fixtures/received";

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

describe("previousSignaturesTally", () => {
  it("counts every document with signatures and those with a troubled one", () => {
    expect(previousSignaturesTally(BATCH_DOCUMENTS)).toEqual({ signed: 3, troubled: 1 });
  });

  it("counts a troubled document among the signed ones", () => {
    expect(previousSignaturesTally([RESOLUTION_DOCUMENT])).toEqual({ signed: 1, troubled: 1 });
  });

  it("is empty without previous signatures", () => {
    expect(previousSignaturesTally([])).toEqual({ signed: 0, troubled: 0 });
  });
});
