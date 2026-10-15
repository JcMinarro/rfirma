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

  it("wraps loose text in a body paragraph", () => {
    render(<Admonition>Trae firmas de otras personas</Admonition>);

    const paragraph = screen.getByText("Trae firmas de otras personas");
    expect(paragraph.tagName).toBe("P");
    expect(paragraph).toHaveClass("rf-body");
  });

  it("keeps blocks as they come", () => {
    render(
      <Admonition>
        <code>SAF_03</code>
      </Admonition>,
    );

    expect(screen.getByText("SAF_03").parentElement?.tagName).toBe("DIV");
  });

  it("is an alert with the strong border when it tells an error", () => {
    render(<Admonition tone="error">Tiene una firma que no es válida</Admonition>);

    expect(screen.getByRole("alert")).toHaveClass("rf-admonition", "rf-admonition--error");
  });

  it("warns as a status, without the error border", () => {
    render(<Admonition tone="warning">Esta sede usa un método de firma poco seguro</Admonition>);

    expect(screen.getByRole("status")).not.toHaveClass("rf-admonition--error");
  });

  it("stays neutral without a role or an icon", () => {
    const { container } = render(<Admonition tone="neutral">SAF_03</Admonition>);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });

  it("puts its title in a row of its own above the content", () => {
    render(
      <Admonition tone="error" title="Tiene una firma que no es válida.">
        Trae firmas de otras personas.
      </Admonition>,
    );

    const admonition = screen.getByRole("alert");
    const title = screen.getByText("Tiene una firma que no es válida.");
    const body = screen.getByText("Trae firmas de otras personas.");
    expect(title.closest(".rf-admonition__head")).not.toBeNull();
    expect(body.closest(".rf-admonition__head")).toBeNull();
    expect(admonition).toHaveTextContent(
      /^Tiene una firma que no es válida\.Trae firmas de otras personas\.$/,
    );
  });

  it("can be only a title", () => {
    render(<Admonition tone="error" title="Tiene una firma que no es válida." />);

    expect(screen.getByRole("alert")).toHaveTextContent(/^Tiene una firma que no es válida\.$/);
  });

  it("paints its action in the title row", () => {
    render(
      <Admonition
        tone="neutral"
        title="Detalle técnico"
        action={<button type="button">Copiar</button>}
      >
        SAF_03
      </Admonition>,
    );

    const action = screen.getByRole("button", { name: "Copiar" });
    expect(action.closest(".rf-admonition__head")).toContainElement(
      screen.getByText("Detalle técnico"),
    );
  });
});
