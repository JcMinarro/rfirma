import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Icon } from "../design-system/icons";
import type { IconName } from "../design-system/icons/names";
import { renderWithCatalog } from "../testing/render";
import { ReceivedList } from "./ReceivedList";
import {
  BATCH_DOCUMENTS,
  RESOLUTION_DOCUMENT,
  receivedActions,
  UNKNOWN_TYPE_DOCUMENT,
  UNTITLED_DOCUMENT,
} from "./testing/fixtures/received";

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
    renderWithCatalog(
      <ReceivedList
        documents={[UNKNOWN_TYPE_DOCUMENT]}
        actions={receivedActions}
        selected="unknown"
        onSelect={vi.fn()}
      />,
    );
    expect(await menuOf("Expediente 2026-0412.bin")).toEqual(["Guardar copia", "Copiar SHA-256"]);
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

  it("seals a document with valid signatures, warns on one with issues and leaves one without them bare", () => {
    renderList("resolution");
    const seal = (name: string) =>
      screen.getByRole("button", { name }).querySelector(".received-list__seal svg");

    const troubled = screen.getByRole("button", { name: "Resolución 2026-0412.pdf" });
    expect(troubled).toHaveAccessibleDescription("Con firmas con incidencias");
    expect(seal("Resolución 2026-0412.pdf")?.querySelector("circle")).not.toBeNull();

    const valid = screen.getByRole("button", { name: "Informe de intervención.pdf" });
    expect(valid).toHaveAccessibleDescription("Con firmas");
    expect(seal("Informe de intervención.pdf")).not.toBeNull();
    expect(seal("Informe de intervención.pdf")?.querySelector("circle")).toBeNull();

    const unsigned = screen.getByRole("button", { name: "Anexo I · Beneficiarios.xlsx" });
    expect(unsigned).not.toHaveAccessibleDescription();
    expect(seal("Anexo I · Beneficiarios.xlsx")).toBeNull();
  });

  it("marks each row with the icon of its type", () => {
    renderList("resolution");
    const iconOf = (name: string) =>
      screen.getByRole("button", { name }).querySelector(".received-list__icon > svg")?.outerHTML;
    const drawn = (icon: IconName) => render(<Icon name={icon} />).container.innerHTML;

    expect(iconOf("Resolución 2026-0412.pdf")).toBe(drawn("documentPdf"));
    expect(iconOf("Anexo II · Baremo.xml")).toBe(drawn("documentXml"));
    expect(iconOf("Cartel de obra.jpg")).toBe(drawn("documentImage"));
    expect(iconOf("Anexo I · Beneficiarios.xlsx")).toBe(drawn("document"));
  });

  it("takes the icon from the detected type, not from what the viewer could paint", () => {
    renderWithCatalog(
      <ReceivedList
        documents={[{ ...RESOLUTION_DOCUMENT, content: { kind: "none" } }]}
        actions={receivedActions}
        selected="resolution"
        onSelect={vi.fn()}
      />,
    );
    const icon = screen
      .getByRole("button", { current: true })
      .querySelector(".received-list__icon > svg")?.outerHTML;

    expect(icon).toBe(render(<Icon name="documentPdf" />).container.innerHTML);
  });

  it("offers only the actions the window has", async () => {
    renderWithCatalog(
      <ReceivedList
        documents={[RESOLUTION_DOCUMENT]}
        actions={{ onCopy: vi.fn() }}
        selected="resolution"
        onSelect={vi.fn()}
      />,
    );
    expect(await menuOf("Resolución 2026-0412.pdf")).toEqual(["Copiar SHA-256"]);
  });

  it("names a document without a name or a title as untitled", () => {
    renderWithCatalog(
      <ReceivedList
        documents={[UNTITLED_DOCUMENT, RESOLUTION_DOCUMENT]}
        actions={receivedActions}
        selected="untitled"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { current: true })).toHaveTextContent("Un PDF sin título");
    expect(
      screen.getByRole("button", { name: "Acciones de Un PDF sin título" }),
    ).toBeInTheDocument();
  });
});
