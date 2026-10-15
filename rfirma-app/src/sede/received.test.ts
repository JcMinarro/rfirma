import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import type { DocumentType } from "./errand";
import {
  contentOf,
  previousSignaturesState,
  previousSignaturesTally,
  receivedActions,
  receivedCount,
  receivedName,
  receivedOf,
} from "./received";
import { previousSignature, previousSignaturesReport } from "./testing/fixtures/previousSignatures";
import {
  BATCH,
  BATCH_DOCUMENTS,
  DESIGN_CERTIFICATES,
  LOCAL_BATCH_DOCUMENTS,
  ONE_DOCUMENT,
  REMOTE_BATCH,
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

describe("receivedName", () => {
  const t = ((key: string) => key) as unknown as TFunction;
  const named = (detected: DocumentType) =>
    receivedName(t, { ...RESOLUTION_DOCUMENT, name: null, detected });

  it("keeps the name the document has", () => {
    expect(receivedName(t, { ...RESOLUTION_DOCUMENT, name: "Acta.pdf" })).toBe("Acta.pdf");
  });

  it.each([
    ["pdf", "sede.consent.untitled"],
    ["xml", "sede.consent.untitledXml"],
    ["png", "sede.consent.untitledImage"],
    ["webp", "sede.consent.untitledImage"],
    ["xlsx", "sede.consent.untitledDocument"],
    ["unknown", "sede.consent.untitledDocument"],
  ] as const)("names an untitled %s by what it is", (detected, key) => {
    expect(named(detected)).toBe(key);
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

  it("prefers the name the site proposes to the title of the PDF", () => {
    const [document] = documentsOf(
      consentStage({ document: { ...signedDocument, name: "Solicitud.pdf" } }),
    );

    expect(document?.name).toBe("Solicitud.pdf");
  });

  it("carries the detected type and the SHA-256 of the document", () => {
    const [document] = documentsOf(
      consentStage({ document: { ...signedDocument, detected: "xml", sha256: "ab12" } }),
    );

    expect(document?.detected).toBe("xml");
    expect(document?.sha256).toBe("ab12");
  });

  it("carries what the viewer paints of the document", () => {
    const content = { kind: "text", text: "<baremo/>" } as const;
    const [document] = documentsOf(consentStage({ document: { ...signedDocument, content } }));

    expect(document?.content).toEqual(content);
  });

  it("gives nothing to show when the document does not travel", () => {
    expect(receivedOf(consentStage({ document: null, signing: null }))).toBeNull();
  });

  it("gives only the count of a remote batch", () => {
    const stage = consentStage({ document: null, signing: null, signs: 4 });

    expect(receivedOf(stage)).toEqual({ kind: "remoteBatch", count: 4 });
  });

  it("gives the elements of a local batch as documents, like any other", () => {
    const stage = consentStage({
      document: null,
      signing: null,
      signs: 2,
      items: LOCAL_BATCH_DOCUMENTS.slice(0, 2),
    });

    expect(receivedOf(stage)).toEqual({
      kind: "documents",
      documents: LOCAL_BATCH_DOCUMENTS.slice(0, 2),
    });
  });

  it("gives nothing when the site asks for your data", () => {
    expect(receivedOf(consentStage({ document: null, signing: null }))).toBeNull();
  });
});

describe("contentOf", () => {
  const bytes = new TextEncoder().encode("<baremo>Antigüedad</baremo>");
  const pdf = { pageCount: 1, getPage: () => Promise.reject(new Error("sin páginas")) };
  const loadPdf = vi.fn(async () => pdf);

  it("opens a PDF to page through it", async () => {
    expect(await contentOf("pdf", bytes, loadPdf)).toEqual({ kind: "pdf", pdf });
    expect(loadPdf).toHaveBeenCalledWith(bytes);
  });

  it("gives nothing to show of a PDF that cannot be opened", async () => {
    const broken = async () => {
      throw new Error("no es un PDF");
    };

    expect(await contentOf("pdf", bytes, broken)).toEqual({ kind: "none" });
  });

  it("shows text as its literal text", async () => {
    expect(await contentOf("text", bytes, loadPdf)).toEqual({
      kind: "text",
      text: "<baremo>Antigüedad</baremo>",
    });
  });

  it("shows an XML as XML", async () => {
    expect(await contentOf("xml", bytes, loadPdf)).toEqual({
      kind: "xml",
      text: "<baremo>Antigüedad</baremo>",
    });
  });

  it("reads an XML with the encoding it declares", async () => {
    const declared = '<?xml version="1.0" encoding="ISO-8859-1"?><n>Peña</n>';
    const latin1 = Uint8Array.from(declared, (char) => char.charCodeAt(0));

    expect(await contentOf("xml", latin1, loadPdf)).toEqual({ kind: "xml", text: declared });
  });

  it.each([
    ["png", "image/png"],
    ["jpeg", "image/jpeg"],
    ["gif", "image/gif"],
    ["webp", "image/webp"],
  ] as const)("shows a %s as an image of %s", async (detected, mediaType) => {
    expect(await contentOf(detected, bytes, loadPdf)).toEqual({ kind: "image", mediaType, bytes });
  });

  it.each(["xlsx", "zip", "unknown"] as const)("has no preview of %s", async (detected) => {
    expect(await contentOf(detected, bytes, loadPdf)).toEqual({ kind: "none" });
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

describe("receivedActions", () => {
  const commands = () => ({ downloadDocument: vi.fn(), downloadAll: vi.fn(), openWith: vi.fn() });

  it("downloads a single document as it is", () => {
    const orders = commands();
    receivedActions(ONE_DOCUMENT, orders).onDownload?.();

    expect(orders.downloadDocument).toHaveBeenCalledWith(RESOLUTION_DOCUMENT.handle);
    expect(orders.downloadAll).not.toHaveBeenCalled();
  });

  it("downloads several documents all together", () => {
    const orders = commands();
    receivedActions(BATCH, orders).onDownload?.();

    expect(orders.downloadAll).toHaveBeenCalledOnce();
    expect(orders.downloadDocument).not.toHaveBeenCalled();
  });

  it("saves and opens the document of the row it is asked about", () => {
    const orders = commands();
    const [, second] = BATCH_DOCUMENTS;
    if (second === undefined) throw new Error("the batch has a second document");
    const actions = receivedActions(BATCH, orders);

    actions.onSaveCopy?.(second);
    actions.onOpenWith?.(second);

    expect(orders.downloadDocument).toHaveBeenCalledWith(second.handle);
    expect(orders.openWith).toHaveBeenCalledWith(second.handle);
  });

  it.each([
    ["a remote batch", REMOTE_BATCH],
    ["nothing received", null],
  ])("offers no download for %s", (_, received) => {
    const actions = receivedActions(received, commands());

    expect(actions.onDownload).toBeUndefined();
    expect(actions.onSaveCopy).toBeUndefined();
    expect(actions.onOpenWith).toBeUndefined();
  });

  it("offers no download of a local batch that could not be read", () => {
    const actions = receivedActions({ kind: "documents", documents: [] }, commands());

    expect(actions.onDownload).toBeUndefined();
  });
});
