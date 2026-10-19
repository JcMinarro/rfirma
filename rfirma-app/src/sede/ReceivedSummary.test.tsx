import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithCatalog } from "../testing/render";
import { ReceivedSummary } from "./ReceivedSummary";
import {
  BATCH_DOCUMENTS,
  DESIGN_CERTIFICATES,
  RESOLUTION_DOCUMENT,
  withPreviousSignatures,
  withYourSignature,
  yourSignature,
} from "./testing/fixtures/received";

const [PERSON_CERTIFICATE, REPRESENTATIVE_CERTIFICATE] = DESIGN_CERTIFICATES;

function admonitions() {
  return [...screen.queryAllByRole("status"), ...screen.queryAllByRole("alert")];
}

function title() {
  return document.querySelector(".rf-admonition__title")?.textContent ?? null;
}

describe("ReceivedSummary", () => {
  it("leads a batch with the invalid signatures as the title, as an error", () => {
    renderWithCatalog(<ReceivedSummary documents={BATCH_DOCUMENTS} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /^1 tiene una firma que no es válida\.3 traen firmas de otras personas\.$/,
    );
    expect(title()).toBe("1 tiene una firma que no es válida.");
  });

  it("puts the invalid signatures in the plural", () => {
    const again = { ...RESOLUTION_DOCUMENT, id: "again" };
    renderWithCatalog(<ReceivedSummary documents={[RESOLUTION_DOCUMENT, again]} />);
    expect(screen.getByText("2 tienen una firma que no es válida.")).toBeInTheDocument();
  });

  it("tells a single fact without a title, as information", () => {
    const valid = BATCH_DOCUMENTS.filter((document) => document.id !== "resolution");
    renderWithCatalog(<ReceivedSummary documents={valid} />);
    expect(screen.getByRole("status")).toHaveTextContent(/^2 traen firmas de otras personas\.$/);
    expect(title()).toBeNull();
  });

  it("speaks of a single document without numbers", () => {
    renderWithCatalog(<ReceivedSummary documents={[RESOLUTION_DOCUMENT]} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /^Tiene una firma que no es válida\.Trae firmas de otras personas\.$/,
    );
  });

  it("says nothing without previous signatures", () => {
    const unsigned = BATCH_DOCUMENTS.filter((document) => document.id === "beneficiaries");
    renderWithCatalog(<ReceivedSummary documents={unsigned} />);
    expect(admonitions()).toEqual([]);
  });

  it("puts what you signed between the invalid signatures and those of other people", () => {
    const documents = withYourSignature(BATCH_DOCUMENTS, yourSignature("sameCertificate"));
    renderWithCatalog(<ReceivedSummary documents={documents} certificate={PERSON_CERTIFICATE} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /^1 tiene una firma que no es válida\.2 llevan tu firma con este certificado\. 3 traen firmas de otras personas\.$/,
    );
  });

  it("adds what you signed with another certificate of yours to a batch", () => {
    const documents = withYourSignature(BATCH_DOCUMENTS, yourSignature("otherCertificate"));
    renderWithCatalog(<ReceivedSummary documents={documents} certificate={PERSON_CERTIFICATE} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "2 llevan tu firma con otro certificado tuyo.",
    );
  });

  it("leads with what you signed when nothing is invalid", () => {
    const documents = withYourSignature(
      withPreviousSignatures(BATCH_DOCUMENTS, "signed"),
      yourSignature("sameCertificate"),
    );
    renderWithCatalog(<ReceivedSummary documents={documents} certificate={PERSON_CERTIFICATE} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(title()).toBe("2 llevan tu firma con este certificado.");
  });

  it("says only that you signed a document whose signatures are all yours", () => {
    const documents = withYourSignature(
      withPreviousSignatures([RESOLUTION_DOCUMENT], "none"),
      yourSignature("sameCertificate"),
    );
    renderWithCatalog(<ReceivedSummary documents={documents} certificate={PERSON_CERTIFICATE} />);
    expect(screen.getByRole("status")).toHaveTextContent(/^Lo firmaste tú con este certificado\.$/);
  });

  it("follows the chosen certificate", () => {
    const documents = withYourSignature(
      withPreviousSignatures([RESOLUTION_DOCUMENT], "none"),
      yourSignature("sameCertificate"),
    );
    renderWithCatalog(
      <ReceivedSummary documents={documents} certificate={REPRESENTATIVE_CERTIFICATE} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/^Trae firmas de otras personas\.$/);
  });

  it("warns of SHA-1 after the invalid signatures and before the rest, in the same box", () => {
    renderWithCatalog(<ReceivedSummary documents={[RESOLUTION_DOCUMENT]} sha1ToAllow />);
    expect(admonitions()).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /^Tiene una firma que no es válida\.Esta sede usa un método de firma poco seguro\. Trae firmas de otras personas\.$/,
    );
  });

  it("warns of SHA-1 alone, without documents", () => {
    renderWithCatalog(<ReceivedSummary documents={[]} sha1ToAllow />);
    expect(screen.getByRole("status")).toHaveTextContent(
      /^Esta sede usa un método de firma poco seguro\.$/,
    );
  });

  it("leaves the invalid signatures and those of other people out when asked for yours only", () => {
    const documents = withYourSignature([RESOLUTION_DOCUMENT], yourSignature("sameCertificate"));
    renderWithCatalog(
      <ReceivedSummary documents={documents} certificate={PERSON_CERTIFICATE} yoursOnly />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/^Lo firmaste tú con este certificado\.$/);
  });

  it("says nothing when asked for yours only and you signed nothing", () => {
    renderWithCatalog(<ReceivedSummary documents={BATCH_DOCUMENTS} yoursOnly />);
    expect(admonitions()).toEqual([]);
  });

  it("tells the site server prepares the signature, as information", () => {
    renderWithCatalog(<ReceivedSummary documents={[]} throughSiteServer />);
    expect(screen.getByRole("status")).toHaveTextContent(
      /^El servidor de la sede prepara la firma con este documento\.$/,
    );
  });

  it("puts the site server after the other facts without lowering their tone", () => {
    renderWithCatalog(<ReceivedSummary documents={BATCH_DOCUMENTS} throughSiteServer />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /3 traen firmas de otras personas\. El servidor de la sede prepara la firma con este documento\.$/,
    );
  });

  it("keeps SHA-1 first, with its tone, beside the site server", () => {
    renderWithCatalog(<ReceivedSummary documents={[]} sha1ToAllow throughSiteServer />);
    expect(admonitions()).toHaveLength(1);
    expect(title()).toBe("Esta sede usa un método de firma poco seguro.");
    expect(document.querySelector(".rf-admonition")).toHaveTextContent(
      "El servidor de la sede prepara la firma con este documento.",
    );
  });

  it.each([
    ["none", "sameCertificate"],
    ["signed", "sameCertificate"],
    ["troubled", "otherCertificate"],
  ] as const)("never paints two boxes, with %s signatures and yours with %s", (state, yours) => {
    const documents = withYourSignature(
      withPreviousSignatures(BATCH_DOCUMENTS, state),
      yourSignature(yours),
    );
    renderWithCatalog(
      <ReceivedSummary documents={documents} certificate={PERSON_CERTIFICATE} sha1ToAllow />,
    );
    expect(admonitions()).toHaveLength(1);
  });
});
