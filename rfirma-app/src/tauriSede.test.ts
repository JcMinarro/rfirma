import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());
const convertFileSrc = vi.hoisted(() =>
  vi.fn((path: string, protocol: string) => `${protocol}://localhost/${path}`),
);
vi.mock("@tauri-apps/api/core", () => ({ invoke, convertFileSrc }));

const { tauriSiteCommands } = await import("./tauriSede");

const INVOICE_XML = '<?xml version="1.0" encoding="UTF-8"?><fe:Facturae xmlns:fe="x"/>';

function answering(prepared: boolean) {
  invoke.mockImplementation(async (command: string) => {
    if (command === "read_document") return new TextEncoder().encode(INVOICE_XML).buffer;
    if (command === "site_prepare_invoice_view") return prepared;
    throw new Error(`orden inesperada: ${command}`);
  });
}

describe("the content of a site document over Tauri", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("points an invoice with a view at the invoice scheme, by its handle", async () => {
    answering(true);

    const content = await tauriSiteCommands().readContent("asa-1", "invoice");

    expect(invoke).toHaveBeenCalledWith("site_prepare_invoice_view", { document: "asa-1" });
    expect(content).toEqual({ kind: "invoice", src: "rfirma-invoice://localhost/asa-1" });
  });

  it("shows an invoice without a view as its XML", async () => {
    answering(false);

    const content = await tauriSiteCommands().readContent("asa-1", "invoice");

    expect(content).toEqual({ kind: "xml", text: INVOICE_XML });
  });
});
