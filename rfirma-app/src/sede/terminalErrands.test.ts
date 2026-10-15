import { describe, expect, it, vi } from "vitest";
import type { Errand } from "./errand";
import { type TerminalChoiceView, type TerminalCommands, terminalErrands } from "./terminalErrands";
import { certificate } from "./testing/fixtures/sedeWindow";

function commandsFor(
  choice: TerminalChoiceView,
  chosen: Awaited<ReturnType<TerminalCommands["chooseCertificate"]>> = {
    ok: true,
    value: { kind: "notNeeded" },
  },
) {
  const calls = {
    chooseCertificate: vi.fn(async () => chosen),
    cancel: vi.fn(async () => {}),
  };
  const commands: TerminalCommands = {
    readChoice: async () => choice,
    chooseCertificate: calls.chooseCertificate,
    cancel: calls.cancel,
  };
  return { calls, port: terminalErrands(commands) };
}

function firstErrand(port: ReturnType<typeof terminalErrands>): Promise<Errand | null> {
  return new Promise((resolve) => {
    port.watch(resolve);
  });
}

const asking: TerminalChoiceView = {
  document: "/home/ada/contratos/convenio.pdf",
  detected: "pdf",
  signing: "pdf",
  stage: { kind: "askingToSign", certificates: [certificate()] },
};

describe("the terminal order as an errand", () => {
  it("shows the consent of the order with its document and certificates", async () => {
    const { port } = commandsFor(asking);

    const errand = await firstErrand(port);

    expect(errand).toMatchObject({
      origin: null,
      operation: "sign",
      terminalOrder: { documentPath: "/home/ada/contratos/convenio.pdf" },
      stage: {
        kind: "consent",
        certificates: [certificate()],
        document: { name: "convenio.pdf" },
        signs: null,
      },
    });
  });

  it.each([
    ["none", "none"],
    ["allExpired", "none"],
    ["excluded", "excluded"],
  ] as const)("shows no certificate when the order offers %s", async (reason, shown) => {
    const { port } = commandsFor({
      document: "/tmp/a.pdf",
      detected: "pdf",
      signing: "pdf",
      stage: { kind: "noCertificate", reason, owned: 2 },
    });

    const errand = await firstErrand(port);

    expect(errand?.stage).toEqual({ kind: "noCertificate", reason: shown, owned: 2 });
  });

  it("shows the consent with the type and the format of the order", async () => {
    const { port } = commandsFor({
      ...asking,
      document: "/home/ada/facturas/factura.xml",
      detected: "xml",
      signing: "invoice",
    });

    const errand = await firstErrand(port);

    expect(errand?.stage).toMatchObject({
      kind: "consent",
      document: { name: "factura.xml", detected: "xml" },
      signing: "invoice",
    });
  });

  it("hands the chosen certificate to the order", async () => {
    const { port, calls } = commandsFor(asking);

    await port.consent("handle-1");

    expect(calls.chooseCertificate).toHaveBeenCalledWith("handle-1");
  });

  it("cancels the order", async () => {
    const { port, calls } = commandsFor(asking);

    await port.cancel();

    expect(calls.cancel).toHaveBeenCalledOnce();
  });

  it("closing the window is cancelling the order", async () => {
    const { port, calls } = commandsFor(asking);

    await port.close();

    expect(calls.cancel).toHaveBeenCalledOnce();
  });

  it("shows the refusal and leaves the failure to the order when choosing the certificate fails", async () => {
    const { port, calls } = commandsFor(asking, {
      ok: false,
      failure: { situation: "tokenAbsent", detail: "sin tarjeta", attemptsLeft: null },
    });
    const seen: (Errand | null)[] = [];
    port.watch((errand) => seen.push(errand));
    await vi.waitFor(() => expect(seen).toHaveLength(1));

    await port.consent("handle-1");

    expect(seen.at(-1)?.stage).toMatchObject({
      kind: "outcome",
      outcome: { kind: "refused", situation: "tokenAbsent", detail: "sin tarjeta" },
    });
    expect(calls.cancel).not.toHaveBeenCalled();
  });

  it("shows a refusal when the choice of the order cannot be read", async () => {
    const port = terminalErrands({
      readChoice: async () => {
        throw new Error("boom");
      },
      chooseCertificate: async () => ({ ok: true, value: { kind: "notNeeded" } }),
      cancel: async () => {},
    });

    const errand = await firstErrand(port);

    expect(errand?.stage).toMatchObject({ kind: "outcome", outcome: { kind: "refused" } });
  });
});
