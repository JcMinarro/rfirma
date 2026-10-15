//! Los documentos de la vista ampliada del consentimiento de sede: una fila por documento, con el icono de su tipo, que cambia el del visor, y el menú «⋯» en la activa.

import type { TFunction } from "i18next";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import type { IconName } from "../design-system/icons/names";
import { Menu, MenuItem } from "../design-system/Menu";
import {
  hasKnownType,
  previousSignaturesState,
  type ReceivedActions,
  type ReceivedDocument,
  receivedName,
} from "./received";
import "./ReceivedList.css";

/** La lista seleccionable de documentos; la fila de `selected` lleva el menú con sus acciones. */
export function ReceivedList({
  documents,
  actions,
  selected,
  onSelect,
}: {
  documents: readonly ReceivedDocument[];
  actions: ReceivedActions;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="received-list">
      {documents.map((document) => (
        <DocumentRow
          key={document.id}
          document={document}
          actions={actions}
          active={document.id === selected}
          onSelect={() => onSelect(document.id)}
        />
      ))}
    </ul>
  );
}

function DocumentRow({
  document,
  actions,
  active,
  onSelect,
}: {
  document: ReceivedDocument;
  actions: ReceivedActions;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const name = receivedName(t, document);
  const signatures = previousSignaturesState(document.previousSignatures);
  const signed = signatures !== "none";
  const sealId = useId();
  const described = signed ? sealId : undefined;
  const content = (
    <>
      <span className="received-list__icon">
        <Icon name={documentIcon(document)} />
        {signed && (
          <span className="received-list__seal">
            <Icon name={signatures === "troubled" ? "sealedWarning" : "sealed"} />
          </span>
        )}
      </span>
      <span
        className={`rf-body received-list__name${document.name === null ? " rf-text-muted" : ""}`}
        title={name}
      >
        {name}
      </span>
    </>
  );
  const sealLabel = signed && (
    <span id={sealId} className="received-list__seal-label">
      {signatures === "troubled"
        ? t("sede.received.withTroubledSignatures")
        : t("sede.received.withSignatures")}
    </span>
  );

  return active ? (
    <li className="received-list__item received-list__item--active">
      <button
        type="button"
        className="received-list__pick"
        aria-current="true"
        aria-describedby={described}
      >
        {content}
      </button>
      {sealLabel}
      <RowActions name={name} items={documentActions(t, document, actions)} />
    </li>
  ) : (
    <li className="received-list__item">
      <button
        type="button"
        className="received-list__pick"
        aria-describedby={described}
        onClick={onSelect}
      >
        {content}
      </button>
      {sealLabel}
    </li>
  );
}

function documentIcon(document: ReceivedDocument): IconName {
  switch (document.detected) {
    case "pdf":
      return "documentPdf";
    case "xml":
    case "text":
      return "documentXml";
    case "png":
    case "jpeg":
    case "gif":
    case "webp":
      return "documentImage";
    default:
      return "document";
  }
}

interface RowAction {
  icon: IconName;
  label: string;
  onSelect: () => void;
}

function documentActions(
  t: TFunction,
  document: ReceivedDocument,
  actions: ReceivedActions,
): RowAction[] {
  const { onOpenWith, onSaveCopy } = actions;
  return [
    ...(hasKnownType(document) && onOpenWith
      ? [
          {
            icon: "externalLink" as const,
            label: t("sede.received.openWith"),
            onSelect: () => onOpenWith(document),
          },
        ]
      : []),
    ...(onSaveCopy
      ? [
          {
            icon: "folder" as const,
            label: t("sede.received.saveCopy"),
            onSelect: () => onSaveCopy(document),
          },
        ]
      : []),
    {
      icon: "copy",
      label: t("sede.received.copySha256"),
      onSelect: () => actions.onCopy(document.sha256),
    },
  ];
}

function RowActions({ name, items }: { name: string; items: readonly RowAction[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const label = t("sede.received.actionsOf", { name });

  return (
    <>
      <Button
        ref={trigger}
        variant="ghost"
        size="sm"
        className="received-list__actions"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        <Icon name="moreActions" />
      </Button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={trigger}
        returnFocusRef={trigger}
        portal={{ opens: "down" }}
        aria-label={label}
      >
        {items.map((item) => (
          <MenuItem
            key={item.label}
            onClick={() => {
              setOpen(false);
              item.onSelect();
            }}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
