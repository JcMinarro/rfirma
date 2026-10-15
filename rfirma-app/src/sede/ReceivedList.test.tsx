import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithCatalog } from "../testing/render";
import { ReceivedList } from "./ReceivedList";
import { BATCH_DOCUMENTS, receivedActions } from "./testing/fixtures/received";

function renderList(selected: string, onSelect = vi.fn()) {
  renderWithCatalog(
    <ReceivedList
      documents={BATCH_DOCUMENTS}
      actions={receivedActions}
      selected={selected}
      onSelect={onSelect}
    />,
  );
}

async function menuOf(name: string) {
  await userEvent.click(screen.getByRole("button", { name: `Acciones de ${name}` }));
  return within(screen.getByRole("menu"))
    .getAllByRole("menuitem")
    .map((item) => item.textContent);
}

describe("ReceivedList", () => {
  it("offers to open, save and copy the hash of a document", async () => {
    renderList("resolution");
    expect(await menuOf("Resolución 2026-0412.pdf")).toEqual([
      "Abrir con…",
      "Guardar copia",
      "Copiar SHA-256",
    ]);
  });

  it("does not offer to open a type rFirma does not know", async () => {
    renderList("poster");
    expect(await menuOf("Cartel de obra.jpg")).toEqual(["Guardar copia", "Copiar SHA-256"]);
  });

  it("changes the document of the viewer from another row", async () => {
    const onSelect = vi.fn();
    renderList("resolution", onSelect);
    expect(screen.getByRole("button", { current: true })).toHaveTextContent(
      "Resolución 2026-0412.pdf",
    );
    expect(screen.getAllByRole("button", { name: /^Acciones de/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Anexo II · Baremo.xml" }));
    expect(onSelect).toHaveBeenCalledWith("baremo");
  });
});
