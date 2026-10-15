import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SiteErrandView } from "./siteErrandView";
import { certificate } from "./testing/fixtures/sedeWindow";

const invoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const listen = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/event", () => ({ listen }));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ setTheme: async () => {} }),
}));

const configuration = {
  language: "es",
  destination: "Documentos",
  destinationMode: "next_to_the_original",
  rememberVisibleSignature: true,
  rememberActivity: true,
  notifyNewVersion: true,
  theme: "system",
  offersTheOriginalFolder: false,
  setupWizardSeen: false,
  consentCountdown: false,
  honourAutomaticSelection: false,
  allowSha1: false,
};

describe("el punto de entrada de la ventana de sede", () => {
  let pushErrand: ((view: SiteErrandView) => void) | undefined;

  beforeEach(() => {
    vi.resetModules();
    invoke.mockReset();
    listen.mockReset();
    pushErrand = undefined;

    document.body.innerHTML = '<div id="root"></div>';

    invoke.mockImplementation(async (command: string) => {
      if (command === "read_configuration") return configuration;
      if (command === "read_site_errand") return null;
      return null;
    });
    listen.mockImplementation(
      async (_event: string, handler: (event: { payload: SiteErrandView }) => void) => {
        pushErrand = (view) => handler({ payload: view });
        return () => {};
      },
    );
  });

  it("never asks about a new version while the window is idle", async () => {
    await import("./main");

    await waitFor(() => expect(invoke).toHaveBeenCalledWith("read_configuration"));

    expect(invoke.mock.calls.map(([command]) => command)).not.toContain("check_for_new_version");
  });

  it("never asks about a new version through the normal course of an errand", async () => {
    await import("./main");
    await waitFor(() => expect(listen).toHaveBeenCalled());

    pushErrand?.({
      origin: "sede.ejemplo.gob.es",
      stage: {
        kind: "askingForConsent",
        certificates: [certificate()],
        narrowed: false,
        notAccepted: 0,
      },
    });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    expect(invoke.mock.calls.map(([command]) => command)).not.toContain("check_for_new_version");
  });

  describe("opened by a terminal order", () => {
    beforeEach(() => {
      window.history.replaceState(null, "", "/sede.html?origin=terminal");
      invoke.mockImplementation(async (command: string) => {
        if (command === "read_terminal_configuration") return configuration;
        if (command === "read_terminal_choice") {
          return {
            document: "/home/ada/contratos/convenio.pdf",
            detected: "pdf",
            signing: "pdf",
            stage: { kind: "askingToSign", certificates: [certificate()] },
          };
        }
        if (command === "terminal_choose_certificate") return { kind: "notNeeded" };
        return null;
      });
    });

    afterEach(() => {
      window.history.replaceState(null, "", "/");
    });

    it("shows the consent of the terminal order", async () => {
      await import("./main");

      expect(await screen.findByText("Una orden de terminal")).toBeInTheDocument();
      expect(screen.getByText("Firmar convenio.pdf")).toBeInTheDocument();
      expect(invoke.mock.calls.map(([command]) => command)).not.toContain("read_configuration");
    });

    it("hands the chosen certificate to the terminal order", async () => {
      await import("./main");

      await userEvent.click(await screen.findByRole("button", { name: "Firmar" }));

      expect(invoke).toHaveBeenCalledWith("terminal_choose_certificate", {
        certificate: "handle-1",
      });
    });

    it("cancels the terminal order", async () => {
      await import("./main");

      await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

      expect(invoke).toHaveBeenCalledWith("terminal_cancel");
    });
  });
});
