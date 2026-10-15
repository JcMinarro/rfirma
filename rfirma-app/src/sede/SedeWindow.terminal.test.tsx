import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithCatalog } from "../testing/render";
import { SedeWindow } from "./SedeWindow";
import { TerminalExcludedByFilter, TerminalOrder } from "./testing/fixtures/sedeErrands";
import { errandOf, scriptedErrand, scriptedFrom } from "./testing/fixtures/sedeWindow";

/** Grada A: la variante de origen «orden de terminal» de la ventana de sede (`-certgui`). */

const DOCUMENT_PATH = errandOf(TerminalOrder).terminalOrder?.documentPath ?? "";

describe("terminal order origin", () => {
  it("says only that a terminal order asks, with nothing addressed to a site", () => {
    const { port } = scriptedFrom(TerminalOrder);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    expect(screen.getByText("Una orden de terminal")).toBeInTheDocument();
    expect(screen.queryByText(/^Te pide/)).not.toBeInTheDocument();
  });

  it("names the document in the title with its full path in the tooltip", () => {
    const { port } = scriptedFrom(TerminalOrder);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    expect(screen.getByText("Firmar convenio.pdf")).toHaveAttribute("title", DOCUMENT_PATH);
  });

  it("shortens a long name in the middle, keeping the start, the end and the extension", () => {
    const name = `${"a".repeat(30)}-informe-final-revisado.pdf`;
    const errand = errandOf(TerminalOrder);
    const { port } = scriptedErrand(errand.stage, {
      ...errand,
      terminalOrder: { documentPath: `/tmp/${name}` },
    });
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    const title = screen.getByText(/^Firmar a+….*\.pdf$/);
    expect(title).toHaveAttribute("title", `/tmp/${name}`);
    expect(title.textContent?.length).toBeLessThan(name.length);
  });

  it("consents with the chosen certificate", async () => {
    const user = userEvent.setup();
    const { port, calls } = scriptedFrom(TerminalOrder);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    await user.click(await screen.findByRole("button", { name: "Firmar" }));

    expect(calls.consent).toHaveBeenCalledWith("handle-1");
  });

  it("offers only to close when the filter leaves no certificate", async () => {
    const user = userEvent.setup();
    const { port, calls } = scriptedFrom(TerminalExcludedByFilter);
    renderWithCatalog(<SedeWindow errands={port} />);

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(calls.cancel).toHaveBeenCalledOnce();
  });
});
