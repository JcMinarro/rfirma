import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { type Drop, type FakeDocumentDrops, inMemoryDocumentDrops } from "./documents/drops";
import { inMemoryRecents } from "./documents/recents";
import { document, pdfsOf, renderApp, row } from "./testing/harness";

const DROP_ZONE = /Arrastra un PDF o pulsa para abrirlo/;

const viewer = () => screen.getByRole("region", { name: "Visor del documento" });

const welcomeArrives = () => within(viewer()).findByRole("heading", { name: "Empezar" });

const welcomeShown = () => screen.queryByRole("heading", { name: "Empezar" }) !== null;

describe("App, la bienvenida del arranque", () => {
  it("shows the welcome when it starts without a document and the preference is on", async () => {
    renderApp({ settings: { showWelcome: true } });

    expect(await welcomeArrives()).toBeInTheDocument();
    expect(
      within(viewer()).getByRole("checkbox", { name: "Mostrar la bienvenida al abrir" }),
    ).toBeChecked();
  });

  it("shows only the drop zone when the preference is off", async () => {
    renderApp({ settings: { showWelcome: false }, recents: inMemoryRecents([row("a.pdf")]) });

    expect(within(viewer()).getByRole("button", { name: DROP_ZONE })).toBeInTheDocument();
    await screen.findByRole("button", { name: "Abiertos recientemente" });
    expect(welcomeShown()).toBe(false);
    expect(
      within(viewer()).queryByRole("region", { name: "Abiertos recientemente" }),
    ).not.toBeInTheDocument();
  });

  it("never shows the welcome when it starts with an invoked document", async () => {
    let answer: (invoked: Drop | null) => void = () => {};
    const base = inMemoryDocumentDrops();
    const drops: FakeDocumentDrops = {
      ...base,
      pending: () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    };
    renderApp({
      settings: { showWelcome: true },
      pdfs: pdfsOf({ "contrato.pdf": 3 }),
      drops,
    });

    expect(welcomeShown()).toBe(false);
    answer({ document: document("contrato.pdf"), alsoEntering: [], failure: null, discarded: 0 });
    await waitFor(() => expect(welcomeShown()).toBe(false));
    expect(
      await screen.findByRole("tab", { name: "contrato.pdf", selected: true }),
    ).toBeInTheDocument();
    expect(welcomeShown()).toBe(false);
  });

  it("shows the drop zone, not the welcome, once the last tab is closed", async () => {
    const user = userEvent.setup();
    renderApp({
      settings: { showWelcome: true },
      documents: [document("factura.pdf")],
      pdfs: pdfsOf({ "factura.pdf": 2 }),
    });
    await welcomeArrives();

    await user.click(within(viewer()).getByRole("button", { name: "Abrir PDF…" }));
    await screen.findByRole("region", { name: "Panel de firma" });
    await user.click(screen.getByRole("button", { name: "Cerrar factura.pdf" }));

    expect(await within(viewer()).findByRole("button", { name: DROP_ZONE })).toBeInTheDocument();
    expect(welcomeShown()).toBe(false);
  });

  it("opens the picker from its drop zone", async () => {
    const user = userEvent.setup();
    renderApp({
      settings: { showWelcome: true },
      documents: [document("factura.pdf")],
      pdfs: pdfsOf({ "factura.pdf": 2 }),
    });
    await welcomeArrives();

    await user.click(within(viewer()).getByRole("button", { name: DROP_ZONE }));

    expect(
      await screen.findByRole("tab", { name: "factura.pdf", selected: true }),
    ).toBeInTheDocument();
  });

  it("opens the status view from Estado de rFirma", async () => {
    const user = userEvent.setup();
    renderApp({ settings: { showWelcome: true } });
    await welcomeArrives();

    await user.click(within(viewer()).getByRole("button", { name: "Estado de rFirma" }));

    expect(await screen.findByRole("heading", { name: "Estado de rFirma" })).toBeInTheDocument();
  });

  it("saves showWelcome off when its checkbox is unticked", async () => {
    const user = userEvent.setup();
    const { preferences } = renderApp({ settings: { showWelcome: true } });
    await waitFor(async () => expect((await preferences.read()).showWelcome).toBe(true));

    await user.click(screen.getByRole("checkbox", { name: "Mostrar la bienvenida al abrir" }));

    await waitFor(async () => expect((await preferences.read()).showWelcome).toBe(false));
    expect(
      screen.getByRole("checkbox", { name: "Mostrar la bienvenida al abrir" }),
    ).not.toBeChecked();
  });

  it("says there are no recents yet when it remembers the activity", async () => {
    renderApp({ settings: { showWelcome: true } });

    expect(
      await within(viewer()).findByText("Aún no has abierto ningún documento"),
    ).toBeInTheDocument();
  });

  it("opens a recent from its column in a tab", async () => {
    const user = userEvent.setup();
    renderApp({
      settings: { showWelcome: true },
      recents: inMemoryRecents([row("a.pdf")]),
      pdfs: pdfsOf({ "a.pdf": 3 }),
    });
    const recents = await within(viewer()).findByRole("region", {
      name: "Abiertos recientemente",
    });
    expect(welcomeShown()).toBe(true);

    await user.click(within(recents).getByRole("button", { name: /^a\.pdf/ }));

    expect(await screen.findByRole("tab", { name: "a.pdf", selected: true })).toBeInTheDocument();
  });

  it("leaves the recents column empty when the activity is not remembered", async () => {
    renderApp({
      settings: { showWelcome: true, rememberActivity: false },
      recents: inMemoryRecents([row("a.pdf")]),
    });

    await waitFor(() =>
      expect(
        within(viewer()).queryByRole("region", { name: "Abiertos recientemente" }),
      ).not.toBeInTheDocument(),
    );
    expect(welcomeShown()).toBe(true);
    expect(screen.queryByText("Aún no has abierto ningún documento")).not.toBeInTheDocument();
    expect(screen.queryByText("a.pdf")).not.toBeInTheDocument();
  });

  it("gives way to the drop zone with its notice when a dropped file cannot be opened", async () => {
    const { drops } = renderApp({ settings: { showWelcome: true } });
    await welcomeArrives();

    act(() =>
      drops.drop({
        document: null,
        alsoEntering: [],
        failure: { situation: "notAPdf", detail: "notas.txt" },
        discarded: 0,
      }),
    );

    expect(await within(viewer()).findByRole("alert")).toBeInTheDocument();
    expect(within(viewer()).getByRole("button", { name: DROP_ZONE })).toBeInTheDocument();
    expect(welcomeShown()).toBe(false);
  });
});
