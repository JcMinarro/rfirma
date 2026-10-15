import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithCatalog } from "../testing/render";
import { SignatureCards } from "./SignatureCards";
import { aSignature } from "./testing/storyReports";

describe("SignatureCards", () => {
  it("names the signer without the NIF and the entity by its name", () => {
    renderWithCatalog(
      <SignatureCards
        signatures={[
          aSignature({
            organizationIdentifier: "B12345678",
            entityName: "Reformas Martín SL",
          }),
        ]}
        findings={[]}
      />,
    );

    expect(screen.getByText("ADA LOVELACE")).toBeVisible();
    expect(screen.queryByText(/00000000T/)).not.toBeInTheDocument();
    expect(screen.getByText("Reformas Martín SL")).toBeVisible();
    expect(screen.queryByText("B12345678")).not.toBeInTheDocument();
  });

  it("falls back to the entity identifier when the certificate carries no name", () => {
    renderWithCatalog(
      <SignatureCards
        signatures={[aSignature({ organizationIdentifier: "B12345678" })]}
        findings={[]}
      />,
    );

    expect(screen.getByText("B12345678")).toBeVisible();
  });

  it("puts the closing note after the reason", () => {
    renderWithCatalog(
      <SignatureCards
        signatures={[
          aSignature({
            closesDocument: true,
            validity: "invalid",
            validityReason: { kind: "damaged" },
          }),
        ]}
        findings={[]}
      />,
    );

    const closes = screen.getByText("No admite más firmas");
    const reason = screen.getByText("Motivo");
    expect(reason.compareDocumentPosition(closes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
