import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { browserStore } from "../signing/testing/storeMarks";
import { renderWithCatalog } from "../testing/render";
import { StatusView } from "./StatusView";
import type { SignalRow, StoreDetail } from "./status";
import { caMissing, sitesHandledByRfirma, versionUpToDate } from "./testing/fixtures";

const noop = () => {};

function renderView(onClose: () => void = noop) {
  return renderWithCatalog(
    <StatusView
      rows={[versionUpToDate, sitesHandledByRfirma]}
      onClose={onClose}
      onRecheck={noop}
      onAction={noop}
      onChooseSiteSignatureHandler={noop}
      onWithdraw={noop}
    />,
  );
}

describe("StatusView", () => {
  it("asks to close from the footer button", async () => {
    const onClose = vi.fn();
    renderView(onClose);

    await userEvent.setup().click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps the close button in a footer that is sibling to the scrollable body (WCAG 2.4.11)", () => {
    const { container } = renderView();

    const body = container.querySelector(".status-view__body");
    const footer = container.querySelector(".status-view__footer");

    expect(body).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(body?.nextElementSibling).toBe(footer);
    expect(footer?.parentElement).toBe(body?.parentElement);
  });

  it("repaints the trust list line for line when two stores share a browser and channel", async () => {
    const trustRow = (stores: StoreDetail[]): SignalRow => ({
      ...caMissing,
      detail: { kind: "trust", stores },
    });
    const view = (stores: StoreDetail[]) => (
      <StatusView
        rows={[trustRow(stores)]}
        onClose={noop}
        onRecheck={noop}
        onAction={noop}
        onChooseSiteSignatureHandler={noop}
        onWithdraw={noop}
      />
    );
    const { container, rerender } = renderWithCatalog(
      view([
        { brand: browserStore("Firefox"), trusted: false },
        { brand: browserStore("Firefox"), trusted: true },
        { brand: "sharedChromium", trusted: false },
      ]),
    );
    const toggle = container.querySelector(
      '[aria-controls="status-view__detail-localCaCertificate"]',
    );
    await userEvent.setup().click(toggle as HTMLElement);

    rerender(
      view([
        { brand: "sharedChromium", trusted: true },
        { brand: browserStore("Firefox"), trusted: true },
      ]),
    );

    const lines = [...container.querySelectorAll(".status-view__detail-item .rf-prose")].map(
      (line) => line.textContent,
    );
    expect(lines).toEqual(["Chrome y derivados", "Firefox"]);
  });
});
