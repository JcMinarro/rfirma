//! El botón del sistema de diseño: `rf-btn` con las variantes y el tamaño que usa la interfaz, `type="button"` por defecto.

import type { ComponentPropsWithRef } from "react";
import { classNames } from "./classNames";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonSize = "sm";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={classNames(
        "rf-btn",
        variant && `rf-btn--${variant}`,
        size && `rf-btn--${size}`,
        className,
      )}
      {...rest}
    />
  );
}
