import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NO_PREVIOUS_SIGNATURES } from "../signing/previousSignatures";
import { renderWithCatalog } from "../testing/render";
import { SedeBody } from "./SedeFrame";
import { SignaturesStrip } from "./SignaturesStrip";
import { PADES_SIGNATURES, XADES_SIGNATURES } from "./testing/fixtures/received";

function renderInMoment(onEscape = vi.fn()) {
  renderWithCatalog(
    <SedeBody footer={null} onEscape={onEscape}>
      <SignaturesStrip report={PADES_SIGNATURES}>
        <p>visor</p>
      </SignaturesStrip>
    </SedeBody>,
  );
  return onEscape;
}

describe("SignaturesStrip", () => {
  it("counts the signatures and each validity", () => {
    renderInMoment();
    expect(screen.getByText("3 firmas")).toBeInTheDocument();
    expect(screen.getByText("1 válida")).toBeInTheDocument();
    expect(screen.getByText("1 caducada")).toBeInTheDocument();
    expect(screen.getByText("1 no válida")).toBeInTheDocument();
  });

  it("counts countersignatures apart, as the panel does", () => {
    renderWithCatalog(
      <SignaturesStrip report={XADES_SIGNATURES}>
        <p>visor</p>
      </SignaturesStrip>,
    );
    expect(screen.getByText("2 firmas · 1 contrafirma")).toBeInTheDocument();
    expect(screen.getByText("3 válidas")).toBeInTheDocument();
  });

  it("opens the panel with the format and the cards", async () => {
    renderInMoment();
    await userEvent.click(screen.getByRole("button", { name: "Ver firmas" }));
    expect(screen.getByRole("dialog", { name: "Firmas del documento" })).toBeInTheDocument();
    expect(screen.getByText("PAdES · 3 firmas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar firmas" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("closes the panel with Escape without cancelling the errand", async () => {
    const onEscape = renderInMoment();
    await userEvent.click(screen.getByRole("button", { name: "Ver firmas" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onEscape).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledOnce();
  });

  it("closes the panel when pressing outside it", async () => {
    renderInMoment();
    await userEvent.click(screen.getByRole("button", { name: "Ver firmas" }));
    await userEvent.click(screen.getByText("visor"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("leaves the viewer alone without signatures", () => {
    renderWithCatalog(
      <SignaturesStrip report={NO_PREVIOUS_SIGNATURES}>
        <p>visor</p>
      </SignaturesStrip>,
    );
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByText("visor")).toBeInTheDocument();
  });
});
