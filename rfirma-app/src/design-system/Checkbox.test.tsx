import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("toggles when its label text is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="Mostrar la bienvenida" checked={false} onChange={onChange} />);

    await user.click(screen.getByText("Mostrar la bienvenida"));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("is a checkbox named by its label that reports its state", () => {
    render(<Checkbox label="Mostrar la bienvenida" checked onChange={vi.fn()} />);

    expect(screen.getByRole("checkbox", { name: "Mostrar la bienvenida" })).toBeChecked();
  });

  it("reflects the indeterminate state on the input", () => {
    const { rerender } = render(
      <Checkbox label="Todas" checked={false} indeterminate onChange={vi.fn()} />,
    );

    const box = screen.getByRole<HTMLInputElement>("checkbox", { name: "Todas" });
    expect(box.indeterminate).toBe(true);

    rerender(<Checkbox label="Todas" checked={false} onChange={vi.fn()} />);
    expect(box.indeterminate).toBe(false);
  });

  it("does not toggle while disabled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="Todas" checked disabled onChange={onChange} />);

    await user.click(screen.getByText("Todas"));

    expect(onChange).not.toHaveBeenCalled();
  });
});
