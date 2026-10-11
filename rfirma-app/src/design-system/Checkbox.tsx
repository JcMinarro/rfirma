//! La casilla del sistema de diseño: un `<input type="checkbox">` nativo dentro de su etiqueta, con la casilla a la medida del rol de texto.

import { useEffect, useRef } from "react";
import { classNames } from "./classNames";
import "./Checkbox.css";

export type CheckboxTextRole = "caption" | "body" | "ui";

interface CheckboxProps {
  label: string;
  checked: boolean;
  /** Ni marcada ni desmarcada: una parte de lo que agrupa está marcada. */
  indeterminate?: boolean;
  /** El rol tipográfico de la etiqueta; la casilla mide 1 em de ese rol. */
  textRole?: CheckboxTextRole;
  disabled?: boolean;
  className?: string;
  onChange: (checked: boolean) => void;
}

const ROLE_CLASS: Record<CheckboxTextRole, string> = {
  caption: "rf-caption",
  body: "rf-body",
  ui: "checkbox--ui",
};

export function Checkbox({
  label,
  checked,
  indeterminate = false,
  textRole = "body",
  disabled = false,
  className,
  onChange,
}: CheckboxProps) {
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (box.current) box.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      className={classNames(
        "checkbox",
        ROLE_CLASS[textRole],
        disabled && "checkbox--disabled",
        className,
      )}
    >
      <input
        ref={box}
        type="checkbox"
        className="checkbox__box"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
