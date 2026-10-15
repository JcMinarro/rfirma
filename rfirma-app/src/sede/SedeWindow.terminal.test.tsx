import { composeStories } from "@storybook/react-vite";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithCatalog } from "../testing/render";
import * as consentModule from "./SedeConsent.stories";
import * as noCertificateModule from "./SedeNoCertificate.stories";
import { SedeWindow } from "./SedeWindow";
import { scriptedFrom } from "./testing/fixtures/sedeWindow";

/** Grada A: la variante de origen «orden de terminal» de la ventana de sede (`-certgui`). */

const { TerminalOrder } = composeStories(consentModule);
const { TerminalExcludedByFilter } = composeStories(noCertificateModule);

describe("terminal order origin", () => {
  it("says only that a terminal order asks, with nothing addressed to a site", () => {
    const { port } = scriptedFrom(TerminalOrder);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    expect(screen.getByText("Una orden de terminal")).toBeInTheDocument();
    expect(screen.queryByText(/^Te pide/)).not.toBeInTheDocument();
    expect(screen.getByText("Vas a firmar 1 documento")).toBeInTheDocument();
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
