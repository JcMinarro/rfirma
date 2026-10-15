import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Admonition } from "./Admonition";

describe("Admonition", () => {
  it("is a status with its text by default", () => {
    render(<Admonition>Trae firmas de otras personas</Admonition>);

    const admonition = screen.getByRole("status");
    expect(admonition).toHaveClass("rf-admonition");
    expect(admonition).not.toHaveClass("rf-admonition--error");
    expect(admonition).toHaveTextContent(/^Trae firmas de otras personas$/);
  });

  it("is an alert with the strong border when it tells an error", () => {
    render(<Admonition tone="error">Tiene una firma que no es válida</Admonition>);

    expect(screen.getByRole("alert")).toHaveClass("rf-admonition", "rf-admonition--error");
  });

  it("warns as a status, without the error border", () => {
    render(<Admonition tone="warning">Esta sede usa un método de firma poco seguro</Admonition>);

    expect(screen.getByRole("status")).not.toHaveClass("rf-admonition--error");
  });

  it("puts its title in bold before the text, separated by a space", () => {
    render(
      <Admonition tone="error" title="Tiene una firma que no es válida.">
        Trae firmas de otras personas
      </Admonition>,
    );

    const admonition = screen.getByRole("alert");
    expect(admonition).toHaveTextContent(
      /^Tiene una firma que no es válida\. Trae firmas de otras personas$/,
    );
    expect(screen.getByText("Tiene una firma que no es válida.").tagName).toBe("STRONG");
  });

  it("can be only a title", () => {
    render(<Admonition tone="error" title="Tiene una firma que no es válida." />);

    expect(screen.getByRole("alert")).toHaveTextContent(/^Tiene una firma que no es válida\.$/);
  });
});
