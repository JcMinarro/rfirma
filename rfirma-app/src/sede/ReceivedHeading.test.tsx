import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithCatalog } from "../testing/render";
import { ReceivedHeading } from "./ReceivedHeading";
import { BATCH, ONE_DOCUMENT, REMOTE_BATCH } from "./testing/fixtures/received";

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

  it("describes the download of a single document as it is, not as a .zip", () => {
    renderWithCatalog(<ReceivedHeading received={ONE_DOCUMENT} onDownload={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Descargar" })).toHaveAttribute(
      "title",
      "El documento tal cual, sin cambios",
    );
  });

  it("counts a single signature of a remote batch in the singular", () => {
    renderWithCatalog(
      <ReceivedHeading received={{ kind: "remoteBatch", count: 1 }} onDownload={vi.fn()} />,
    );
    expect(screen.getByText("Vas a hacer 1 firma")).toBeInTheDocument();
  });

  it("leaves only the download, without the count, when the documents are listed below", () => {
    renderWithCatalog(<ReceivedHeading received={BATCH} onDownload={vi.fn()} withoutCount />);
    expect(screen.queryByText(/^Vas a firmar/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar todo" })).toBeInTheDocument();
  });

  it("counts the signatures of a remote batch, not documents, and gives it no download", () => {
    renderWithCatalog(<ReceivedHeading received={REMOTE_BATCH} onDownload={vi.fn()} />);
    expect(screen.getByText("Vas a hacer 4 firmas")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
