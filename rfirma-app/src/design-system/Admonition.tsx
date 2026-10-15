//! El aviso `rf-admonition`: una caja informativa, de advertencia, de error o neutra, con un título opcional en su fila, una acción a su derecha y el contenido debajo.

import type { ComponentPropsWithRef, ReactNode } from "react";
import { classNames } from "./classNames";
import { Icon } from "./icons";
import type { IconName } from "./icons/names";
import "./Admonition.css";

type AdmonitionTone = "info" | "warning" | "error" | "neutral";

const ICON_OF: Record<AdmonitionTone, IconName | null> = {
  info: "info",
  warning: "warning",
  error: "failure",
  neutral: null,
};

const ROLE_OF: Record<AdmonitionTone, "status" | "alert" | undefined> = {
  info: "status",
  warning: "status",
  error: "alert",
  neutral: undefined,
};

export type AdmonitionProps = Omit<ComponentPropsWithRef<"div">, "title"> & {
  tone?: AdmonitionTone;
  /** La frase que encabeza la caja, en su propia fila. */
  title?: ReactNode;
  /** Un botón discreto a la derecha de la fila del título. */
  action?: ReactNode;
};

export function Admonition({
  tone = "info",
  title,
  action,
  className,
  children,
  ...rest
}: AdmonitionProps) {
  const role = ROLE_OF[tone];
  const icon = ICON_OF[tone];
  const titled = title != null && title !== "";
  const iconBox = icon !== null && (
    <span className="rf-admonition__icon">
      <Icon name={icon} size={16} />
    </span>
  );
  const actionBox = action != null && <span className="rf-admonition__action">{action}</span>;
  const body = children != null && (
    <div
      className={classNames(
        "rf-admonition__body",
        titled && icon !== null && "rf-admonition__body--indented",
      )}
    >
      {typeof children === "string" || typeof children === "number" ? (
        <p className="rf-body">{children}</p>
      ) : (
        children
      )}
    </div>
  );

  return (
    <div
      role={role}
      className={classNames(
        "rf-admonition",
        titled && "rf-admonition--titled",
        tone === "error" && "rf-admonition--error",
        className,
      )}
      {...rest}
    >
      {titled ? (
        <>
          <div className="rf-admonition__head">
            {iconBox}
            <span className="rf-label rf-admonition__title">{title}</span>
            {actionBox}
          </div>
          {body}
        </>
      ) : (
        <>
          {iconBox}
          {body}
          {actionBox}
        </>
      )}
    </div>
  );
}
