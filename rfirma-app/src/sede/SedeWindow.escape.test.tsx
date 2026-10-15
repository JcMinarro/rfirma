import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { elapse } from "../testing/elapse";
import { renderWithCatalog } from "../testing/render";
import { SedeWindow } from "./SedeWindow";
import {
  Consent,
  NoneInstalled,
  OldWebClient,
  Returning,
  ShadowAttackSuspect,
  Signed,
  Signing,
  Unreachable,
  UnreadableDocument,
  Waiting,
} from "./testing/fixtures/sedeErrands";
import { sedeErrand } from "./testing/fixtures/sedeView";
import { scriptedFrom } from "./testing/fixtures/sedeWindow";

/** Grada A: Escape es el botón de cancelar o cerrar de cada momento, e Intro su acción principal. */

const LocalCaMissing = {
  args: {},
  parameters: { errand: sedeErrand({ kind: "noChannel", reason: "localCaMissing" }) },
};

const pressEscape = () => fireEvent.keyDown(document, { key: "Escape" });
const pressEnter = () => fireEvent.keyDown(document, { key: "Enter" });

describe("Escape", () => {
  it.each([
    ["waiting", Waiting],
    ["unreachable", Unreachable],
    ["consent", Consent],
    ["confirming", ShadowAttackSuspect],
    ["signing", Signing],
    ["noCertificate", NoneInstalled],
  ])("cancels the errand in %s", (_, story) => {
    const { port, calls } = scriptedFrom(story);
    renderWithCatalog(<SedeWindow errands={port} />);

    pressEscape();

    expect(calls.cancel).toHaveBeenCalledOnce();
  });

  it("closes the outcome", () => {
    const { port, calls } = scriptedFrom(Signed);
    renderWithCatalog(<SedeWindow errands={port} />);

    pressEscape();

    expect(calls.close).toHaveBeenCalledOnce();
  });

  it("marks no area when the site asked for one, like Cancelar", () => {
    const { port, calls } = scriptedFrom(UnreadableDocument);
    renderWithCatalog(<SedeWindow errands={port} />);

    pressEscape();

    expect(calls.markArea).toHaveBeenCalledWith(null);
  });

  it("does nothing while the signature goes back to the site, where there is no Cancelar", () => {
    const { port, calls } = scriptedFrom(Returning);
    renderWithCatalog(<SedeWindow errands={port} />);

    pressEscape();

    expect(calls.cancel).not.toHaveBeenCalled();
  });

  it("cancels the errand from the old web client warning, without dismissing it", () => {
    const { port, calls } = scriptedFrom(OldWebClient);
    renderWithCatalog(<SedeWindow errands={port} />);

    pressEscape();

    expect(calls.dismissWarning).not.toHaveBeenCalled();
    expect(calls.cancel).toHaveBeenCalledOnce();
  });

  it("closes the open certificate list without cancelling the errand", () => {
    const { port, calls } = scriptedFrom(Consent);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);
    fireEvent.click(screen.getByRole("combobox"));

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(calls.cancel).not.toHaveBeenCalled();
  });
});

describe("Enter", () => {
  it.each([
    ["confirming", ShadowAttackSuspect, "confirmSignatures"],
    ["noCertificate", NoneInstalled, "installCertificate"],
    ["unreachable with the local CA missing", LocalCaMissing, "installLocalCa"],
    ["outcome", Signed, "close"],
    ["oldWebClient", OldWebClient, "dismissWarning"],
  ] as const)("presses the main action in %s", (_, story, action) => {
    const { port, calls } = scriptedFrom(story);
    renderWithCatalog(<SedeWindow errands={port} />);

    pressEnter();

    expect(calls[action]).toHaveBeenCalledOnce();
    expect(calls.cancel).not.toHaveBeenCalled();
  });

  it.each([
    ["waiting", Waiting],
    ["signing", Signing],
    ["returning", Returning],
  ])("does nothing in %s, which has no main action", (_, story) => {
    const { port, calls } = scriptedFrom(story);
    renderWithCatalog(<SedeWindow errands={port} />);

    pressEnter();

    for (const call of Object.values(calls)) expect(call).not.toHaveBeenCalled();
  });

  it("opens the certificate list at consent, without signing, when it has the focus", async () => {
    const user = userEvent.setup();
    const { port, calls } = scriptedFrom(Consent);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);
    screen.getByRole("combobox").focus();

    await user.keyboard("{Enter}");

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(calls.consent).not.toHaveBeenCalled();
  });

  describe("at consent", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("does nothing while the countdown runs", async () => {
      const { port, calls } = scriptedFrom(Consent);
      renderWithCatalog(<SedeWindow errands={port} />);
      await elapse(1000);

      pressEnter();

      expect(calls.consent).not.toHaveBeenCalled();
    });

    it("signs once the countdown ends", async () => {
      const { port, calls } = scriptedFrom(Consent);
      renderWithCatalog(<SedeWindow errands={port} />);
      for (let second = 0; second < 3; second++) await elapse(1000);

      pressEnter();

      expect(calls.consent).toHaveBeenCalledOnce();
    });
  });
});
