//! El aviso de estado `rf-admonition`: una línea con su icono, informativa, de advertencia o de error, con un título opcional delante del texto.

import type { ComponentPropsWithRef, ReactNode } from "react";
import { classNames } from "./classNames";
import { Icon } from "./icons";
import type { IconName } from "./icons/names";
import "./Admonition.css";

type AdmonitionTone = "info" | "warning" | "error";

const ICON_OF: Record<AdmonitionTone, IconName> = {
  info: "info",
  warning: "warning",
  error: "failure",
};

export type AdmonitionProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  tone?: AdmonitionTone;
  /** La frase en negrita que precede al texto. */
  title?: ReactNode;
};

export function Admonition({
  tone = "info",
  title,
  className,
  children,
  ...rest
}: AdmonitionProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={classNames("rf-admonition", tone === "error" && "rf-admonition--error", className)}
      {...rest}
    >
      <span className="rf-admonition__icon">
        <Icon name={ICON_OF[tone]} size={16} />
      </span>
      <p className="rf-body rf-admonition__text">
        {title !== undefined && <strong>{title}</strong>}
        {title !== undefined && children != null && " "}
        {children}
      </p>
    </div>
  );
}
