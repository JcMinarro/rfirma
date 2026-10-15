//! Los documentos de la vista ampliada del consentimiento de sede: una fila por documento, que cambia el del visor, y el menú «⋯» en la activa.

import type { TFunction } from "i18next";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../design-system/Button";
import { Icon } from "../design-system/icons";
import type { IconName } from "../design-system/icons/names";
import { Menu, MenuItem } from "../design-system/Menu";
import type { ReceivedActions, ReceivedDocument } from "./received";
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
  const content = (
    <>
      <span className="received-list__icon">
        <Icon name="document" />
      </span>
      <span className="rf-body received-list__name" title={document.name}>
        {document.name}
      </span>
    </>
  );

  return active ? (
    <li className="received-list__item received-list__item--active">
      <button type="button" className="received-list__pick" aria-current="true">
        {content}
      </button>
      <RowActions name={document.name} items={documentActions(t, document, actions)} />
    </li>
  ) : (
    <li className="received-list__item">
      <button type="button" className="received-list__pick" onClick={onSelect}>
        {content}
      </button>
    </li>
  );
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
  return [
    ...(document.knownType
      ? [
          {
            icon: "externalLink" as const,
            label: t("sede.received.openWith"),
            onSelect: () => actions.onOpenWith(document),
          },
        ]
      : []),
    {
      icon: "folder",
      label: t("sede.received.saveCopy"),
      onSelect: () => actions.onSaveCopy(document),
    },
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
        portal={{ opens: "up" }}
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
