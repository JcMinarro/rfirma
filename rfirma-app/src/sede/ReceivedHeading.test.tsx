import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithCatalog } from "../testing/render";
import { ReceivedHeading } from "./ReceivedHeading";
import { BATCH, ONE_DIGEST, ONE_DOCUMENT, REMOTE_BATCH } from "./testing/fixtures/received";

describe("ReceivedHeading", () => {
  it("counts the documents and offers to download them all", () => {
    renderWithCatalog(<ReceivedHeading received={BATCH} onDownload={vi.fn()} />);
    expect(screen.getByText("Vas a firmar 5 documentos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar todo" })).toHaveAttribute(
      "title",
      "Los 5 documentos y sus huellas SHA-256, en un .zip",
    );
  });

  it("downloads a single document", async () => {
    const onDownload = vi.fn();
    renderWithCatalog(<ReceivedHeading received={ONE_DOCUMENT} onDownload={onDownload} />);
    expect(screen.getByText("Vas a firmar 1 documento")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Descargar" }));
    expect(onDownload).toHaveBeenCalledOnce();
  });

  it("counts a digest as a reference and offers its hashes", () => {
    renderWithCatalog(<ReceivedHeading received={ONE_DIGEST} onDownload={vi.fn()} />);
    expect(screen.getByText("Vas a firmar 1 referencia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar huellas" })).toBeInTheDocument();
  });

  it("gives a remote batch only its count", () => {
    renderWithCatalog(<ReceivedHeading received={REMOTE_BATCH} onDownload={vi.fn()} />);
    expect(screen.getByText("Vas a firmar 4 documentos")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
