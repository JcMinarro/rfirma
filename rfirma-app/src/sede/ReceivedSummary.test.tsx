import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithCatalog } from "../testing/render";
import { ReceivedSummary } from "./ReceivedSummary";
import { BATCH_DOCUMENTS, RESOLUTION_DOCUMENT } from "./testing/fixtures/received";

describe("ReceivedSummary", () => {
  it("counts the documents with signatures and those with an invalid one", () => {
    renderWithCatalog(<ReceivedSummary documents={BATCH_DOCUMENTS} />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "3 ya traen firmas de otras personas",
      "1 tiene una firma que no es válida",
    ]);
  });

  it("puts the invalid signatures in the plural", () => {
    const again = { ...RESOLUTION_DOCUMENT, id: "again" };
    renderWithCatalog(<ReceivedSummary documents={[RESOLUTION_DOCUMENT, again]} />);
    expect(screen.getByText("2 tienen una firma que no es válida")).toBeInTheDocument();
  });

  it("says nothing of invalid signatures when every one is valid", () => {
    const valid = BATCH_DOCUMENTS.filter((document) => document.id !== "resolution");
    renderWithCatalog(<ReceivedSummary documents={valid} />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "2 ya traen firmas de otras personas",
    ]);
  });

  it("speaks of a single document without numbers", () => {
    renderWithCatalog(<ReceivedSummary documents={[RESOLUTION_DOCUMENT]} />);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Ya trae firmas de otras personas",
      "Tiene una firma que no es válida",
    ]);
  });

  it("says nothing without previous signatures", () => {
    const unsigned = BATCH_DOCUMENTS.filter((document) => document.id === "beneficiaries");
    renderWithCatalog(<ReceivedSummary documents={unsigned} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
