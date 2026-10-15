import { composeStories } from "@storybook/react-vite";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithCatalog } from "../testing/render";
import { CHROME_LOCAL_NETWORK_SETTINGS, noErrand } from "./errand";
import * as oldWebClientModule from "./SedeOldWebClient.stories";
import * as waitingModule from "./SedeWaiting.stories";
import { SedeWindow } from "./SedeWindow";
import { sedeErrand } from "./testing/fixtures/sedeView";
import { scriptedFrom } from "./testing/fixtures/sedeWindow";

/**
 * Grada A: la ventana de sede entera, **por su puerto**, en los momentos de antes
 * de la petición. Cada estado se monta desde su historia y las conductas se leen
 * en la pantalla; lo que enseña cada historia está en `SedeWindow.presentation.test.tsx`.
 */

const { OldWebClient } = composeStories(oldWebClientModule);
const { Waiting, Unreachable, NoChannel } = composeStories(waitingModule);

const LocalCaMissing = {
  args: {},
  parameters: { errand: sedeErrand({ kind: "noChannel", reason: "localCaMissing" }) },
};

describe("SedeWindow", () => {
  it("does not mount at all when no site has called", () => {
    renderWithCatalog(<SedeWindow errands={noErrand()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  describe("the old web client warning", () => {
    it("is dismissed with its only button, without cancelling or closing the errand", () => {
      const { port, calls } = scriptedFrom(OldWebClient);
      renderWithCatalog(<SedeWindow errands={port} />);

      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      expect(calls.dismissWarning).toHaveBeenCalledOnce();
      expect(calls.cancel).not.toHaveBeenCalled();
      expect(calls.close).not.toHaveBeenCalled();
    });

    it("focuses Continue, so Enter dismisses it", () => {
      const { port } = scriptedFrom(OldWebClient);
      renderWithCatalog(<SedeWindow errands={port} />);

      expect(screen.getByRole("button", { name: "Continuar" })).toHaveFocus();
    });
  });

  describe("1 · waiting for the channel", () => {
    it("abandons the errand when closed while waiting, with no confirmation", () => {
      const { port, calls } = scriptedFrom(Waiting);
      renderWithCatalog(<SedeWindow errands={port} />);

      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(calls.cancel).toHaveBeenCalledOnce();
    });

    it("never closes by itself when published as «the request has not arrived»", () => {
      const { port, calls } = scriptedFrom(Unreachable);
      renderWithCatalog(<SedeWindow errands={port} />);

      expect(calls.close).not.toHaveBeenCalled();
      expect(calls.cancel).not.toHaveBeenCalled();
    });

    it("offers the two recipes as tabs, each with its panel, and never diagnoses which one is the problem", () => {
      const { port } = scriptedFrom(Unreachable);
      renderWithCatalog(<SedeWindow errands={port} />);

      expect(screen.getByRole("tab", { name: "Chrome" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tab", { name: "Firefox" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByRole("tabpanel")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: "Firefox" }));

      expect(screen.getByRole("tab", { name: "Firefox" })).toHaveAttribute("aria-selected", "true");
    });

    it("says nothing about the local CA when rFirma does not know it is missing", () => {
      const { port } = scriptedFrom(Unreachable);
      renderWithCatalog(<SedeWindow errands={port} />);

      expect(screen.queryByText("Falta la CA local")).toBeNull();
      expect(screen.queryByRole("button", { name: "Instalar" })).toBeNull();
      expect(screen.getByRole("button", { name: "Cerrar" })).toHaveClass("rf-btn--primary");
    });

    it("gives the local CA the screen's only main action, because nothing works without it", () => {
      const { port, calls } = scriptedFrom(LocalCaMissing);
      renderWithCatalog(<SedeWindow errands={port} />);

      const install = screen.getByRole("button", { name: "Instalar" });
      expect(install).toHaveClass("rf-btn--primary");
      expect(screen.getByRole("button", { name: "Cerrar" })).not.toHaveClass("rf-btn--primary");
      fireEvent.click(install);
      expect(calls.installLocalCa).toHaveBeenCalledOnce();
    });

    it("focuses the local CA's install, so Enter installs it", () => {
      const { port } = scriptedFrom(LocalCaMissing);
      renderWithCatalog(<SedeWindow errands={port} />);

      expect(screen.getByRole("button", { name: "Instalar" })).toHaveFocus();
    });
  });

  describe("1b · the channel that will never open", () => {
    it("gives Chrome's local-network address to copy, and never as something to click", () => {
      const { port } = scriptedFrom(NoChannel);
      renderWithCatalog(<SedeWindow errands={port} />);

      expect(screen.getByText(CHROME_LOCAL_NETWORK_SETTINGS).closest("a")).toBeNull();
    });

    it("abandons the errand when closed: nothing has been answered", () => {
      const { port, calls } = scriptedFrom(NoChannel);
      renderWithCatalog(<SedeWindow errands={port} />);

      fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

      expect(calls.cancel).toHaveBeenCalledOnce();
      expect(calls.close).not.toHaveBeenCalled();
    });
  });
});
