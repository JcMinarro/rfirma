import { composeStories } from "@storybook/react-vite";
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithCatalog } from "../testing/render";
import * as stories from "./SedeConsentExpandable.stories";

const {
  CompactDigest,
  CompactRemoteBatch,
  CompactOneDocument,
  CompactSeveralDocuments,
  ExpandedSeveralDocuments,
  ExpandedXmlDocument,
} = composeStories(stories);

describe("the expandable site consent", () => {
  it.each([
    ["a digest", CompactDigest],
    ["a remote batch", CompactRemoteBatch],
  ])("offers no viewer for %s", (_, Story) => {
    renderWithCatalog(<Story />);
    expect(screen.queryByRole("button", { name: /^Ver documento/ })).not.toBeInTheDocument();
  });

  it.each([
    ["one document", CompactOneDocument, "Ver documento"],
    ["several documents", CompactSeveralDocuments, "Ver documentos"],
  ])("offers the viewer for %s", (_, Story, label) => {
    renderWithCatalog(<Story />);
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("summarises the previous signatures of a batch without listing its documents", () => {
    renderWithCatalog(<CompactSeveralDocuments />);
    expect(screen.getByText("3 ya traen firmas de otras personas")).toBeInTheDocument();
    expect(screen.getByText("1 tiene una firma que no es válida")).toBeInTheDocument();
    expect(screen.queryByText("Resolución 2026-0412.pdf")).not.toBeInTheDocument();
  });

  it("summarises the previous signatures of one document without numbers", () => {
    renderWithCatalog(<CompactOneDocument />);
    expect(screen.getByText("Ya trae firmas de otras personas")).toBeInTheDocument();
    expect(screen.getByText("Tiene una firma que no es válida")).toBeInTheDocument();
  });

  it("offers the hashes of a digest as a reference", () => {
    renderWithCatalog(<CompactDigest />);
    expect(screen.getByText("Vas a firmar 1 referencia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar huellas" })).toBeInTheDocument();
  });

  it("offers nothing to download from a remote batch", () => {
    renderWithCatalog(<CompactRemoteBatch />);
    expect(screen.getByText("Vas a firmar 4 documentos")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Descargar/ })).not.toBeInTheDocument();
  });

  it("names who asks for the signature, or says it is unidentified", () => {
    renderWithCatalog(<CompactDigest />);
    expect(screen.getByText("Una página sin identificar")).toBeInTheDocument();
  });

  it("shows an XML document as literal text", () => {
    renderWithCatalog(<ExpandedXmlDocument />);
    expect(screen.getByText(/<baremo convocatoria="FACHADAS-2026">/)).toBeInTheDocument();
  });

  it("collapses with «Ocultar»", () => {
    renderWithCatalog(<ExpandedSeveralDocuments />);
    expect(screen.getByRole("button", { name: "Ocultar" })).toBeInTheDocument();
  });
});
