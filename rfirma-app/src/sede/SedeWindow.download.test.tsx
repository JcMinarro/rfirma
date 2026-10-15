import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithCatalog } from "../testing/render";
import type { SiteDocument } from "./errand";
import { SedeWindow } from "./SedeWindow";
import { Batch, TerminalOrder } from "./testing/fixtures/sedeErrands";
import {
  consentStage,
  scriptedErrand,
  scriptedFrom,
  signedDocument,
} from "./testing/fixtures/sedeWindow";

/** Grada A: lo que piden al puerto «Descargar» y «Abrir con…» del consentimiento de sede. */

const BAREMO: SiteDocument = {
  ...signedDocument,
  handle: "baremo-handle",
  name: "Baremo.xml",
  detected: "xml",
  content: { kind: "text", text: "<baremo/>" },
};

const UNKNOWN: SiteDocument = {
  ...signedDocument,
  handle: "unknown-handle",
  name: "Expediente.bin",
  detected: "unknown",
  content: { kind: "none" },
};

const SPREADSHEET: SiteDocument = {
  ...signedDocument,
  handle: "sheet-handle",
  name: "Beneficiarios.xlsx",
  detected: "xlsx",
  content: { kind: "none" },
};

function consenting(document: SiteDocument) {
  return scriptedErrand(consentStage({ document }));
}

describe("downloading and opening what the site sends", () => {
  it("downloads the document from the compact form", async () => {
    const user = userEvent.setup();
    const { port, calls } = consenting(BAREMO);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    await user.click(screen.getByRole("button", { name: "Descargar" }));

    expect(calls.downloadDocument).toHaveBeenCalledWith("baremo-handle");
    expect(calls.downloadAll).not.toHaveBeenCalled();
  });

  it("downloads the document from the expanded form", async () => {
    const user = userEvent.setup();
    const { port, calls } = consenting(BAREMO);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);
    await user.click(screen.getByRole("button", { name: "Ver documento" }));

    await user.click(screen.getByRole("button", { name: "Descargar" }));

    expect(calls.downloadDocument).toHaveBeenCalledWith("baremo-handle");
  });

  it("downloads the document from the row menu", async () => {
    const user = userEvent.setup();
    const { port, calls } = consenting(BAREMO);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);
    await user.click(screen.getByRole("button", { name: "Ver documento" }));

    await user.click(screen.getByRole("button", { name: /^Acciones de/ }));
    await user.click(screen.getByRole("menuitem", { name: "Guardar copia" }));

    expect(calls.downloadDocument).toHaveBeenCalledWith("baremo-handle");
  });

  it("opens a recognised type with the system from the row menu", async () => {
    const user = userEvent.setup();
    const { port, calls } = consenting(BAREMO);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);
    await user.click(screen.getByRole("button", { name: "Ver documento" }));

    await user.click(screen.getByRole("button", { name: /^Acciones de/ }));
    await user.click(screen.getByRole("menuitem", { name: "Abrir con…" }));

    expect(calls.openWith).toHaveBeenCalledWith("baremo-handle");
  });

  it("opens a recognised type without preview from under its sheet", async () => {
    const user = userEvent.setup();
    const { port, calls } = consenting(SPREADSHEET);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);
    await user.click(screen.getByRole("button", { name: "Ver documento" }));

    await user.click(screen.getByRole("button", { name: "Abrir con…" }));

    expect(calls.openWith).toHaveBeenCalledWith("sheet-handle");
  });

  it("offers no «Abrir con…» for a type it does not recognise", async () => {
    const user = userEvent.setup();
    const { port } = consenting(UNKNOWN);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);
    await user.click(screen.getByRole("button", { name: "Ver documento" }));
    await user.click(screen.getByRole("button", { name: /^Acciones de/ }));

    expect(screen.queryByRole("menuitem", { name: "Abrir con…" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Guardar copia" })).toBeInTheDocument();
  });

  it.each([
    ["a remote batch", Batch],
    ["a terminal order", TerminalOrder],
  ])("offers no download for %s", (_, story) => {
    const { port } = scriptedFrom(story);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    expect(screen.queryByRole("button", { name: /^Descargar/ })).not.toBeInTheDocument();
  });
});
