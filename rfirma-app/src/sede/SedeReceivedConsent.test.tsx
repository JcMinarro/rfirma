import { composeStories } from "@storybook/react-vite";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithCatalog } from "../testing/render";
import * as stories from "./SedeConsentExpandable.stories";

const {
  CompactDigest,
  CompactRemoteBatch,
  CompactOneDocument,
  CompactSeveralDocuments,
  ExpandedSeveralDocuments,
  ExpandedOneDocument,
  ExpandedXmlDocument,
} = composeStories(stories);

async function choose(onBehalfOfTheCouncil: boolean) {
  await userEvent.click(screen.getByRole("combobox", { name: "Certificado" }));
  const option = screen
    .getAllByRole("option")
    .find((each) => (each.textContent?.includes("Villaejemplo") === true) === onBehalfOfTheCouncil);
  if (option === undefined) throw new Error("falta el certificado");
  await userEvent.click(option);
}

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
    expect(screen.getByRole("alert")).toHaveTextContent(
      /^1 tiene una firma que no es válida\. 3 traen firmas de otras personas\.$/,
    );
    expect(screen.queryByText("Resolución 2026-0412.pdf")).not.toBeInTheDocument();
  });

  it("summarises the previous signatures of one document without numbers", () => {
    renderWithCatalog(<CompactOneDocument />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /^Tiene una firma que no es válida\. Trae firmas de otras personas\.$/,
    );
  });

  it.each([
    ["sameCertificate", "one", "Lo firmaste tú con este certificado"],
    ["sameCertificate", "several", "Lo firmaste tú con este certificado"],
    ["otherCertificate", "one", "Lo firmaste tú con otro certificado tuyo"],
    ["otherCertificate", "several", "Lo firmaste tú con otro certificado tuyo"],
  ] as const)(
    "tells that you already signed with %s, choosing among %s certificates, in both views",
    (yours, certificates, line) => {
      const { unmount } = renderWithCatalog(
        <CompactOneDocument yourSignature={yours} certificates={certificates} />,
      );
      expect(screen.getByRole("alert")).toHaveTextContent(`${line}.`);
      unmount();

      renderWithCatalog(<ExpandedOneDocument yourSignature={yours} certificates={certificates} />);
      expect(screen.getByRole("status")).toHaveTextContent(new RegExp(`^${line}\\.$`));
      expect(screen.getByRole("region", { name: /firmas/i })).not.toHaveTextContent(/firmaste/);
    },
  );

  it.each([
    ["the compact", CompactSeveralDocuments],
    ["the expanded", ExpandedSeveralDocuments],
  ])("never paints two admonitions in %s view", (_, Story) => {
    renderWithCatalog(<Story yourSignature="sameCertificate" sha1ToAllow />);
    expect(document.querySelectorAll(".rf-admonition")).toHaveLength(1);
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

  it("collapses with «Ocultar» as an icon alone", () => {
    renderWithCatalog(<ExpandedSeveralDocuments />);
    const hide = screen.getByRole("button", { name: "Ocultar" });
    expect(hide).toHaveAttribute("title", "Ocultar");
    expect(hide).toHaveTextContent(/^$/);
  });

  it("says only what an authentication challenge is", () => {
    renderWithCatalog(<CompactSeveralDocuments received="challenge" />);
    expect(screen.getByText("Vas a firmar un reto de autenticación")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Descargar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ver documento/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("names a document without a name or a title as untitled", () => {
    renderWithCatalog(<ExpandedSeveralDocuments received="untitled" />);
    expect(screen.getByRole("button", { current: true })).toHaveTextContent("Un PDF sin título");
  });

  it("warns on the seal of a document whose signatures have issues only while the control says so", () => {
    const { unmount } = renderWithCatalog(
      <ExpandedSeveralDocuments previousSignatures="troubled" />,
    );
    expect(screen.getByRole("button", { current: true })).toHaveAccessibleDescription(
      "Con firmas con incidencias",
    );
    unmount();

    renderWithCatalog(<ExpandedSeveralDocuments previousSignatures="signed" />);
    expect(screen.getByRole("button", { current: true })).toHaveAccessibleDescription("Con firmas");
  });

  it("names the local batch items by their identifiers", () => {
    renderWithCatalog(<ExpandedSeveralDocuments received="localBatch" />);
    expect(
      screen.getByRole("navigation", { name: "Vas a firmar 5 documentos" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "003" })).toBeInTheDocument();
  });

  it.each([
    ["the compact", CompactSeveralDocuments],
    ["the expanded", ExpandedSeveralDocuments],
  ])("leaves the help out of an unreadable card in %s view", (_, Story) => {
    renderWithCatalog(<Story reader="unreadable" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      /^rFirma no puede leer la tarjeta del lector$/,
    );
  });

  it("follows the chosen certificate with what you already signed", async () => {
    renderWithCatalog(
      <CompactSeveralDocuments previousSignatures="none" yourSignature="sameCertificate" />,
    );
    await choose(false);
    expect(screen.getByText(/^1 lo firmaste tú con este certificado\.$/)).toBeInTheDocument();
    expect(screen.queryByText(/de otras personas/)).not.toBeInTheDocument();

    await choose(true);
    expect(screen.getByText(/^1 trae firmas de otras personas\.$/)).toBeInTheDocument();
    expect(screen.queryByText(/firmaste tú/)).not.toBeInTheDocument();
  });

  it("says that the site narrowed the certificates at the foot of the open list", async () => {
    renderWithCatalog(<CompactSeveralDocuments siteFiltersCertificates />);
    await userEvent.click(screen.getByRole("combobox", { name: "Certificado" }));
    expect(
      screen.getByText("sede.villaejemplo.es solo admite algunos certificados"),
    ).toBeInTheDocument();
  });

  it("says that an unidentified site narrowed the certificates", async () => {
    renderWithCatalog(<CompactSeveralDocuments siteFiltersCertificates withOrigin={false} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Certificado" }));
    expect(screen.getByText("La sede solo admite algunos certificados")).toBeInTheDocument();
  });

  it.each([
    ["the compact", CompactOneDocument],
    ["the expanded", ExpandedOneDocument],
  ])("starts the countdown in %s view when the control turns it on", (_, Story) => {
    const { rerender } = renderWithCatalog(<Story />);
    expect(screen.getByRole("button", { name: "Firmar" })).toBeEnabled();

    rerender(<Story countdown />);

    const sign = screen.getByRole("button", { name: /^Firmar/ });
    expect(sign).toBeDisabled();
    expect(within(sign).getByText(/\d/)).toBeInTheDocument();
  });

  it.each([
    ["the compact", CompactSeveralDocuments],
    ["the expanded", ExpandedSeveralDocuments],
  ])("warns of SHA-1 and signs anyway after the countdown in %s view", (_, Story) => {
    renderWithCatalog(<Story sha1ToAllow />);
    expect(screen.getByText(/Esta sede usa un método de firma poco seguro\./)).toBeInTheDocument();
    const sign = screen.getByRole("button", { name: /^Firmar igualmente/ });
    expect(sign).toBeDisabled();
    expect(within(sign).getByText(/\d/)).toBeInTheDocument();
  });

  it("asks for your details with what it sends instead of what you sign", () => {
    renderWithCatalog(<CompactSeveralDocuments errand="identity" />);
    expect(screen.getByText("Te pide tus datos")).toBeInTheDocument();
    expect(screen.getByText(/^Se enviarán tu nombre, tu NIF/)).toBeInTheDocument();
    expect(screen.queryByText(/^Vas a firmar/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Descargar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ver documento/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar mis datos" })).toBeInTheDocument();
  });

  it("names an unidentified page when it asks for your details without an origin", () => {
    renderWithCatalog(<CompactSeveralDocuments errand="identity" withOrigin={false} />);
    expect(screen.getByText("Una página sin identificar")).toBeInTheDocument();
  });

  it("signs a terminal order without download or viewer, but with its previous signatures", () => {
    renderWithCatalog(<CompactSeveralDocuments errand="terminal" />);
    expect(screen.getByText("Te pide la firma")).toBeInTheDocument();
    expect(screen.getByText("Una orden de terminal")).toBeInTheDocument();
    expect(screen.getByText("Vas a firmar 1 documento")).toBeInTheDocument();
    expect(screen.getByText(/^Trae firmas de otras personas\.$/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Descargar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ver documento/ })).not.toBeInTheDocument();
  });
});
