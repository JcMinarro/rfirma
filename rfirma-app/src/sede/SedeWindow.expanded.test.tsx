import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { elapse } from "../testing/elapse";
import { renderWithCatalog } from "../testing/render";
import type { SiteDocument } from "./errand";
import { SedeWindow } from "./SedeWindow";
import { PADES_SIGNATURES } from "./testing/fixtures/received";
import { Batch, IdentityData, TerminalOrder } from "./testing/fixtures/sedeErrands";
import {
  certificate,
  consentStage,
  scriptedErrand,
  scriptedFrom,
  signedDocument,
} from "./testing/fixtures/sedeWindow";

/** Grada A: la ampliada del consentimiento, que abre «Ver documentos» y cierra «Ocultar». */

const BAREMO: SiteDocument = {
  ...signedDocument,
  name: "Baremo.xml",
  detected: "xml",
  content: { kind: "text", text: '<baremo convocatoria="FACHADAS-2026"/>' },
};

function consenting(document: SiteDocument = BAREMO) {
  return scriptedErrand(consentStage({ document }));
}

function footerButtons() {
  const footer = document.querySelector("footer");
  if (footer === null) throw new Error("falta el pie");
  return within(footer).getAllByRole("button");
}

describe("2 · the expanded consent", () => {
  it("puts «Ver documento» first in the footer and asks the window to grow", async () => {
    const user = userEvent.setup();
    const { port, calls } = consenting();
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    const view = screen.getByRole("button", { name: "Ver documento" });
    expect(footerButtons()[0]).toBe(view);
    await user.click(view);

    expect(calls.expandWindow).toHaveBeenCalledWith(true);
    expect(footerButtons()[0]).toBe(screen.getByRole("button", { name: "Ocultar" }));
    expect(screen.getByText('<baremo convocatoria="FACHADAS-2026"/>')).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Vas a firmar 1 documento" }),
    ).toBeInTheDocument();
  });

  it("goes back to the compact with «Ocultar», in the same place, and asks the window to shrink", async () => {
    const user = userEvent.setup();
    const { port, calls } = consenting();
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    await user.click(screen.getByRole("button", { name: "Ver documento" }));
    await user.click(screen.getByRole("button", { name: "Ocultar" }));

    expect(calls.expandWindow).toHaveBeenLastCalledWith(false);
    expect(footerButtons()[0]).toBe(screen.getByRole("button", { name: "Ver documento" }));
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("keeps the chosen certificate across both forms", async () => {
    const user = userEvent.setup();
    const { port, calls } = scriptedErrand(
      consentStage({
        document: BAREMO,
        certificates: [
          certificate({ id: "first", holderName: "ANA" }),
          certificate({ id: "second", holderName: "ZOE" }),
        ],
      }),
    );
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    await user.click(screen.getByRole("combobox", { name: "Certificado" }));
    await user.click(screen.getByRole("option", { name: /ZOE/ }));
    await user.click(screen.getByRole("button", { name: "Ver documento" }));
    await user.click(screen.getByRole("button", { name: "Firmar" }));

    expect(calls.consent).toHaveBeenCalledWith("second");
  });

  it("gives the window back its size when consenting from the expanded form", async () => {
    const user = userEvent.setup();
    const { port, calls } = consenting();
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    await user.click(screen.getByRole("button", { name: "Ver documento" }));
    await user.click(screen.getByRole("button", { name: "Firmar" }));

    expect(calls.consent).toHaveBeenCalledWith("handle-1");
    expect(calls.expandWindow).toHaveBeenLastCalledWith(false);
  });

  it("does not ask the window to shrink when it was never expanded", async () => {
    const user = userEvent.setup();
    const { port, calls } = consenting();
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    await user.click(screen.getByRole("button", { name: "Firmar" }));

    expect(calls.expandWindow).not.toHaveBeenCalled();
  });

  it.each([
    ["a remote batch", Batch],
    ["a request for your details", IdentityData],
    ["a terminal order", TerminalOrder],
  ])("offers no «Ver documentos» for %s", (_, story) => {
    const { port } = scriptedFrom(story);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    expect(screen.queryByRole("button", { name: /^Ver documento/ })).not.toBeInTheDocument();
  });

  describe("the viewer", () => {
    async function expandWith(document: SiteDocument) {
      const user = userEvent.setup();
      const { port } = consenting(document);
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);
      await user.click(screen.getByRole("button", { name: "Ver documento" }));
    }

    it("shows an image on its sheet, named after the document", async () => {
      await expandWith({
        ...signedDocument,
        name: "Cartel.png",
        detected: "png",
        content: { kind: "image", mediaType: "image/png", bytes: new Uint8Array([1, 2, 3]) },
      });

      expect(screen.getByRole("img", { name: "Cartel.png" })).toHaveAttribute(
        "src",
        "data:image/png;base64,AQID",
      );
    });

    it("says a document without preview cannot be shown, with its name", async () => {
      await expandWith({ ...signedDocument, name: "Beneficiarios.xlsx", detected: "xlsx" });

      const sheet = screen.getByRole("region", { name: "Beneficiarios.xlsx" });
      expect(sheet).toHaveTextContent("Este tipo de archivo no se puede mostrar aquí.");
    });

    it("marks the row with the icon and the seal of the document", async () => {
      await expandWith({ ...BAREMO, previousSignatures: PADES_SIGNATURES });

      expect(screen.getByRole("button", { current: true })).toHaveAccessibleDescription(
        "Con firmas con incidencias",
      );
    });

    it("closes the signatures panel with Escape without cancelling the errand", async () => {
      const user = userEvent.setup();
      const { port, calls } = consenting({ ...BAREMO, previousSignatures: PADES_SIGNATURES });
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);
      await user.click(screen.getByRole("button", { name: "Ver documento" }));
      await user.click(screen.getByRole("button", { name: "Ver firmas" }));

      fireEvent.keyDown(document, { key: "Escape" });

      expect(screen.queryByRole("dialog", { name: "Firmas del documento" })).toBeNull();
      expect(calls.cancel).not.toHaveBeenCalled();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(calls.cancel).toHaveBeenCalledOnce();
    });
  });

  describe("the countdown", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("goes on counting when expanding and hiding", async () => {
      const { port } = consenting();
      renderWithCatalog(<SedeWindow errands={port} />);

      await elapse(1000);
      fireEvent.click(screen.getByRole("button", { name: "Ver documento" }));
      expect(screen.getByRole("button", { name: "Firmar (2)" })).toBeDisabled();

      await elapse(1000);
      fireEvent.click(screen.getByRole("button", { name: "Ocultar" }));
      expect(screen.getByRole("button", { name: "Firmar (1)" })).toBeDisabled();

      await elapse(1000);
      expect(screen.getByRole("button", { name: "Firmar" })).toBeEnabled();
    });
  });
});
