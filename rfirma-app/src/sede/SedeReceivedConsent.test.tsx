import { composeStories } from "@storybook/react-vite";
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithCatalog } from "../testing/render";
import * as stories from "./SedeConsent.stories";

const {
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
  it.each([["a remote batch", CompactRemoteBatch]])("offers no viewer for %s", (_, Story) => {
    renderWithCatalog(<Story pendingActions />);
    expect(screen.queryByRole("button", { name: /^Ver documento/ })).not.toBeInTheDocument();
  });

  it.each([
    ["one document", CompactOneDocument, "Ver documento"],
    ["several documents", CompactSeveralDocuments, "Ver documentos"],
  ])("offers the viewer for %s", (_, Story, label) => {
    renderWithCatalog(<Story pendingActions />);
    expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
  });

  it("keeps the whole «Ver documentos» as its title when the footer cuts it short", () => {
    renderWithCatalog(<CompactSeveralDocuments pendingActions />);
    expect(screen.getByRole("button", { name: "Ver documentos" })).toHaveAttribute(
      "title",
      "Ver documentos",
    );
  });

  it("summarises the previous signatures of a batch without listing its documents", () => {
    renderWithCatalog(<CompactSeveralDocuments />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /^1 tiene una firma que no es válida\.3 traen firmas de otras personas\.$/,
    );
    expect(screen.queryByText("Resolución 2026-0412.pdf")).not.toBeInTheDocument();
  });

  it("summarises the previous signatures of one document without numbers", () => {
    renderWithCatalog(<CompactOneDocument />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      /^Tiene una firma que no es válida\.Trae firmas de otras personas\.$/,
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

  it("offers nothing to download from a remote batch", () => {
    renderWithCatalog(<CompactRemoteBatch pendingActions />);
    expect(screen.getByText("Vas a hacer 4 firmas")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Descargar/ })).not.toBeInTheDocument();
  });

  it("names who asks for the signature, or says it is unidentified", () => {
    renderWithCatalog(<CompactRemoteBatch withOrigin={false} />);
    expect(screen.getByText("Una página sin identificar")).toBeInTheDocument();
  });

  it("shows a one-line XML document indented, one element per line", () => {
    renderWithCatalog(<ExpandedXmlDocument />);
    expect(screen.getByText('<baremo convocatoria="FACHADAS-2026">')).toBeInTheDocument();
    expect(screen.getByText("<puntuacionMinima>50</puntuacionMinima>")).toBeInTheDocument();
    expect(screen.getByText("</baremo>")).toBeInTheDocument();
  });

  it("shows in the viewer the document picked in the list", async () => {
    renderWithCatalog(<ExpandedSeveralDocuments />);
    expect(screen.queryByText(/<baremo convocatoria="FACHADAS-2026">/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Anexo II · Baremo.xml" }));

    expect(screen.getByText(/<baremo convocatoria="FACHADAS-2026">/)).toBeInTheDocument();
    expect(screen.getByRole("button", { current: true })).toHaveTextContent(
      "Anexo II · Baremo.xml",
    );
  });

  it("keeps the countdown when picking another document", () => {
    vi.useFakeTimers();
    try {
      renderWithCatalog(<ExpandedSeveralDocuments countdown />);
      act(() => vi.advanceTimersByTime(1000));

      fireEvent.click(screen.getByRole("button", { name: "Anexo II · Baremo.xml" }));

      expect(screen.getByRole("button", { name: "Firmar (2)" })).toBeDisabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("collapses with «Ocultar» as an icon alone", () => {
    renderWithCatalog(<ExpandedSeveralDocuments />);
    const hide = screen.getByRole("button", { name: "Ocultar" });
    expect(hide).toHaveAttribute("title", "Ocultar");
    expect(hide).toHaveTextContent(/^$/);
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
    renderWithCatalog(<CompactSeveralDocuments errand="identity" pendingActions />);
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

  it("names a terminal order without saying who asks", () => {
    renderWithCatalog(<CompactOneDocument errand="terminal" />);
    expect(screen.getByText("Una orden de terminal")).toBeInTheDocument();
    expect(screen.queryByText("Te pide la firma")).not.toBeInTheDocument();
  });

  it("names the document of a terminal order, without download or viewer, but with its previous signatures", () => {
    renderWithCatalog(<CompactSeveralDocuments errand="terminal" pendingActions />);
    expect(screen.getByText("Firmar convenio.pdf")).toBeInTheDocument();
    expect(screen.getByText(/^Trae firmas de otras personas\.$/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Descargar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ver documento/ })).not.toBeInTheDocument();
  });
});
