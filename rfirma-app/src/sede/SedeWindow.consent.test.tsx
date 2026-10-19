import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { elapse } from "../testing/elapse";
import { renderWithCatalog } from "../testing/render";
import { SedeWindow } from "./SedeWindow";
import { previousSignature, previousSignaturesReport } from "./testing/fixtures/previousSignatures";
import { LOCAL_BATCH_DOCUMENTS } from "./testing/fixtures/received";
import {
  Batch,
  Consent,
  IdentityData,
  LocalBatch,
  PrecalculatedHash,
  PreviousSignaturesWithProblem,
} from "./testing/fixtures/sedeErrands";
import {
  certificate,
  consentStage,
  errandOf,
  scriptedErrand,
  scriptedFrom,
  signedDocument,
} from "./testing/fixtures/sedeWindow";

/** Grada A: el momento 2, el consentimiento compacto, con su aviso único y su cuenta atrás. */

const grace = certificate({
  id: "grace",
  holderName: "GRACE BREWSTER HOPPER",
  stampedSigner: "GRACE BREWSTER HOPPER",
  givenName: "GRACE",
  surname: "BREWSTER HOPPER",
  idNumber: "00056780Q",
  certificateSerialNumber: "987654321",
});

const signedByAdaWithThisCertificate = {
  ...signedDocument,
  previousSignatures: previousSignaturesReport([
    previousSignature({
      issuer: certificate().issuer,
      certificateSerialNumber: certificate().certificateSerialNumber,
    }),
  ]),
};

describe("2 · consent", () => {
  it("is not laid under the dialog scrim, which would cover the certificate list", () => {
    const { port } = scriptedFrom(Consent);
    const { container } = renderWithCatalog(<SedeWindow errands={port} />);

    expect(container.querySelector(".rf-scrim")).toBeNull();
  });

  it("orders who asks, then the certificate, then what is signed", () => {
    const { port } = scriptedFrom(Consent);
    const { container } = renderWithCatalog(<SedeWindow errands={port} />);

    const text = container.textContent ?? "";
    expect(text.indexOf("Te pide la firma")).toBeLessThan(text.indexOf("Certificado"));
    expect(text.indexOf("Certificado")).toBeLessThan(text.indexOf("Vas a firmar 1 documento"));
  });

  it.each([
    ["a remote batch", Batch, "Vas a firmar 3 documentos"],
    ["a local batch", LocalBatch, "Vas a firmar 5 documentos"],
  ])("sums up %s with its count alone", (_, story, count) => {
    const { port } = scriptedFrom(story);
    renderWithCatalog(<SedeWindow errands={port} />);

    expect(screen.getByText(count)).toBeInTheDocument();
    expect(screen.queryByText("001")).not.toBeInTheDocument();
  });

  it("offers the document and its download", () => {
    const { port } = scriptedFrom(Consent);
    renderWithCatalog(<SedeWindow errands={port} />);

    expect(screen.getByRole("button", { name: "Ver documento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descargar" })).toBeInTheDocument();
  });

  it("labels the selector «Certificado» also when handing over identity data", () => {
    const { port } = scriptedFrom(IdentityData);
    renderWithCatalog(<SedeWindow errands={port} />);

    expect(screen.getByRole("combobox", { name: "Certificado" })).toBeInTheDocument();
  });

  it("says what it sends when handing over identity data, and nothing about what is signed", () => {
    const { port } = scriptedFrom(IdentityData);
    renderWithCatalog(<SedeWindow errands={port} />);

    expect(screen.getByText("Te pide tus datos")).toBeInTheDocument();
    expect(screen.queryByText(/^Vas a firmar/)).not.toBeInTheDocument();
  });

  it.each([
    ["a signature", Consent],
    ["a batch", Batch],
    ["identity data", IdentityData],
    [
      "a document whose previous signature is broken, with no intermediate dialogue",
      PreviousSignaturesWithProblem,
    ],
  ])("consents with the chosen certificate's handle for %s", async (_, story) => {
    const user = userEvent.setup();
    const { port, calls } = scriptedFrom(story);
    renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

    await user.click(screen.getByRole("button", { name: /^(Firmar|Enviar mis datos)$/ }));

    expect(calls.consent).toHaveBeenCalledWith("handle-1");
  });

  describe("a site asking for SHA-1 the person has not allowed", () => {
    it.each([
      ["a single signature", consentStage({ sha1ToAllow: true })],
      [
        "a local batch",
        consentStage({
          document: null,
          signs: 1,
          signing: null,
          sha1ToAllow: true,
          items: LOCAL_BATCH_DOCUMENTS.slice(1, 2),
        }),
      ],
    ])("signs anyway for %s, with the countdown even when it is turned off", (_, stage) => {
      const { port } = scriptedErrand(stage);
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

      expect(screen.getByRole("button", { name: /^Firmar igualmente \(\d+\)$/ })).toBeDisabled();
      expect(screen.getByRole("status")).toHaveTextContent(
        /^Esta sede usa un método de firma poco seguro\.$/,
      );
    });

    it("says nothing about SHA-1 once the person allowed it", () => {
      const { port } = scriptedErrand(consentStage({ sha1Allowed: true }));
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

      expect(screen.queryByText(/SHA-1|poco seguro/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Firmar" })).toBeEnabled();
    });
  });

  describe("a precalculated hash instead of the document", () => {
    it("says the site only sends the hash and names it as a hash", () => {
      const { port } = scriptedFrom(PrecalculatedHash);
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

      expect(screen.getByRole("status")).toHaveTextContent(
        /^La sede solo envía la huella del documento, así que rFirma no puede enseñártelo\.$/,
      );
      expect(screen.getByText("Una huella del documento")).toBeInTheDocument();
      expect(screen.queryByText("Un documento sin título")).not.toBeInTheDocument();
    });

    it("offers neither the viewer nor the download", () => {
      const { port } = scriptedFrom(PrecalculatedHash);
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

      expect(screen.queryByRole("button", { name: "Ver documento" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Descargar" })).not.toBeInTheDocument();
      expect(screen.queryByText("Vas a firmar 1 documento")).not.toBeInTheDocument();
    });

    it("keeps the notice quiet about a document that is not a hash, whatever its size", () => {
      const { port } = scriptedErrand(
        consentStage({ document: { ...signedDocument, sizeBytes: 32 } }),
      );
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

      expect(screen.queryByText(/huella/)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ver documento" })).toBeInTheDocument();
    });
  });

  describe("the facts of the previous signatures", () => {
    it("tells them in one notice, the invalid signature first, with the tone of the worst", () => {
      const errand = errandOf(PreviousSignaturesWithProblem);
      if (errand.stage.kind !== "consent") throw new Error("la historia no es un consentimiento");
      const stage = { ...errand.stage, sha1ToAllow: true };
      const { port } = scriptedErrand(stage, { ...errand, stage });
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Tiene una firma que no es válida." +
          "Esta sede usa un método de firma poco seguro. " +
          "Lo firmaste tú con otro certificado tuyo. " +
          "Trae firmas de otras personas.",
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("changes what you already signed when another certificate is chosen", async () => {
      const user = userEvent.setup();
      const { port } = scriptedErrand(
        consentStage({
          document: signedByAdaWithThisCertificate,
          certificates: [certificate({ remembered: true }), grace],
        }),
      );
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);
      expect(screen.getByRole("status")).toHaveTextContent(
        /^Lo firmaste tú con este certificado\.$/,
      );

      await user.click(screen.getByRole("combobox", { name: "Certificado" }));
      await user.click(screen.getByRole("option", { name: /GRACE BREWSTER HOPPER/ }));

      expect(screen.getByRole("status")).toHaveTextContent(/^Trae firmas de otras personas\.$/);
    });

    it("draws no notice when the document brings no signature", () => {
      const { port } = scriptedFrom(Consent);
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("preselection", () => {
    const expired = { kind: "expired", notAfter: 1_600_000_000 } as const;

    it("comes with the remembered certificate chosen", async () => {
      const user = userEvent.setup();
      const { port, calls } = scriptedErrand(
        consentStage({
          certificates: [
            certificate({ id: "first", holderName: "ANA" }),
            certificate({ id: "remembered", holderName: "ZOE", remembered: true }),
          ],
        }),
      );
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

      await user.click(screen.getByRole("button", { name: "Firmar" }));

      expect(calls.consent).toHaveBeenCalledWith("remembered");
    });

    it("comes with the first usable one when the remembered certificate cannot be used", async () => {
      const user = userEvent.setup();
      const { port, calls } = scriptedErrand(
        consentStage({
          certificates: [
            certificate({ id: "remembered", holderName: "ANA", remembered: true, status: expired }),
            certificate({ id: "zoe", holderName: "ZOE" }),
            certificate({ id: "bea", holderName: "BEA" }),
          ],
        }),
      );
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

      await user.click(screen.getByRole("button", { name: "Firmar" }));

      expect(calls.consent).toHaveBeenCalledWith("bea");
    });
  });

  describe("the countdown before signing", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    const elapseCountdown = async () => {
      for (let second = 0; second < 3; second++) await elapse(1000);
    };

    it("counts Firmar (3), (2), (1) down disabled, and enables Firmar after three seconds", async () => {
      const { port } = scriptedFrom(Consent);
      renderWithCatalog(<SedeWindow errands={port} />);

      expect(screen.getByRole("button", { name: "Firmar (3)" })).toBeDisabled();
      await elapse(1000);
      expect(screen.getByRole("button", { name: "Firmar (2)" })).toBeDisabled();
      await elapse(1000);
      expect(screen.getByRole("button", { name: "Firmar (1)" })).toBeDisabled();
      await elapse(1000);
      expect(screen.getByRole("button", { name: "Firmar" })).toBeEnabled();
    });

    it("focuses Firmar once the countdown ends, so Enter signs with the remembered certificate", async () => {
      const { port, calls } = scriptedErrand(
        consentStage({
          certificates: [
            certificate(),
            certificate({ id: "handle-2", label: "Otro", remembered: true }),
          ],
        }),
      );
      renderWithCatalog(<SedeWindow errands={port} />);

      await elapseCountdown();
      expect(screen.getByRole("button", { name: "Firmar" })).toHaveFocus();
      fireEvent.click(document.activeElement as HTMLElement);

      expect(calls.consent).toHaveBeenCalledWith("handle-2");
    });

    it("does not take the focus back from what the person moved it to during the countdown", async () => {
      const { port } = scriptedFrom(Consent);
      renderWithCatalog(<SedeWindow errands={port} />);

      screen.getByRole("button", { name: "Cancelar" }).focus();
      await elapseCountdown();

      expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
    });

    it("counts down «Enviar mis datos» too: sending an identity is no less final", () => {
      const { port } = scriptedFrom(IdentityData);
      renderWithCatalog(<SedeWindow errands={port} />);

      expect(screen.getByRole("button", { name: "Enviar mis datos (3)" })).toBeDisabled();
    });

    it("starts enabled and focused, with no number, when the person turned the countdown off", () => {
      const { port } = scriptedFrom(Consent);
      renderWithCatalog(<SedeWindow errands={port} consentCountdown={false} />);

      const sign = screen.getByRole("button", { name: "Firmar" });
      expect(sign).toBeEnabled();
      expect(sign).toHaveFocus();
    });
  });
});
