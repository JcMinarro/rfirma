import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithCatalog } from "../testing/render";
import { ReceivedViewer } from "./ReceivedViewer";
import {
  BATCH_DOCUMENTS,
  RESOLUTION_DOCUMENT,
  UNKNOWN_TYPE_DOCUMENT,
} from "./testing/fixtures/received";

const beneficiaries = BATCH_DOCUMENTS.find((document) => document.id === "beneficiaries");
const poster = BATCH_DOCUMENTS.find((document) => document.id === "poster");

describe("ReceivedViewer", () => {
  it("opens a PDF fitted to its width", () => {
    renderWithCatalog(<ReceivedViewer document={RESOLUTION_DOCUMENT} />);
    expect(screen.getByRole("button", { name: "Ajustar al ancho" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows an image by its name", () => {
    if (!poster) throw new Error("the batch has no poster");
    renderWithCatalog(<ReceivedViewer document={poster} />);
    expect(screen.getByRole("img", { name: "Cartel de obra.jpg" })).toHaveAttribute(
      "src",
      expect.stringMatching(/^data:image\/svg\+xml;base64,/),
    );
  });

  it("offers to open a recognised type it cannot preview", async () => {
    if (!beneficiaries) throw new Error("the batch has no spreadsheet");
    const onOpenWith = vi.fn();
    renderWithCatalog(<ReceivedViewer document={beneficiaries} onOpenWith={onOpenWith} />);
    expect(screen.getByText("Este tipo de archivo no se puede mostrar aquí.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abrir con…" }));
    expect(onOpenWith).toHaveBeenCalledWith(beneficiaries);
  });

  it("does not offer to open a type rFirma does not recognise", () => {
    renderWithCatalog(<ReceivedViewer document={UNKNOWN_TYPE_DOCUMENT} onOpenWith={vi.fn()} />);
    expect(screen.getByText("Este tipo de archivo no se puede mostrar aquí.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Abrir con…" })).not.toBeInTheDocument();
  });
});
