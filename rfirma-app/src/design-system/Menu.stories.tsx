//! La historia de `Menu`: un menú anclado a su botón, abierto o cerrado, con dos grupos de entradas y una de contenido rico.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useId, useRef, useState } from "react";
import { Button } from "./Button";
import { Menu, MenuItem } from "./Menu";

interface MenuDemoProps {
  startsOpen: boolean;
  inPortal: boolean;
  opens: "down" | "up";
}

function MenuDemo({ startsOpen, inPortal, opens }: MenuDemoProps) {
  const [open, setOpen] = useState(startsOpen);
  const menuId = useId();
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  return (
    <div
      ref={anchor}
      style={
        inPortal
          ? { display: "inline-block", margin: opens === "up" ? "220px 0 0 320px" : "0 0 0 320px" }
          : { display: "inline-block", minWidth: 260 }
      }
    >
      <Button
        ref={trigger}
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((was) => !was)}
      >
        Acciones
      </Button>
      <Menu
        open={open}
        onClose={close}
        anchorRef={anchor}
        returnFocusRef={trigger}
        id={menuId}
        aria-label="Acciones"
        portal={inPortal ? { opens } : undefined}
      >
        <MenuItem onClick={close}>
          <span style={{ display: "flex", flex: 1, flexDirection: "column", gap: 3 }}>
            <span>Solicitud de subvención.pdf</span>
            <small className="rf-text-muted">Documentos</small>
          </span>
          <small className="rf-text-muted">hoy</small>
        </MenuItem>
        <hr className="rf-divider" />
        <MenuItem onClick={close}>Preferencias…</MenuItem>
        <MenuItem onClick={close}>Acerca de</MenuItem>
      </Menu>
    </div>
  );
}

const meta = {
  title: "Primitivos/Menu",
  component: MenuDemo,
  parameters: {
    docs: {
      description: {
        component: [
          'El menú desplegable sobre `Popover`, con `role="menu"`: lleva el foco a la primera entrada, se recorre con flechas, Inicio y Fin, y devuelve el foco al cerrarse.',
          "Úsalo para una lista de acciones que cuelga de un botón. Para elegir un valor, `Select` o `Combobox`; para una acción principal con alternativas, `SplitButton`.",
          'En portal se pinta a la medida de sus entradas y pegado al borde derecho de su ancla, sin clase de posición; `opens: "up"` lo abre encima, para el «⋯» de una fila al pie de una lista.',
          "No metas en él controles que no sean `MenuItem`. No le pongas `role` ni `tabIndex`: los fija él.",
        ].join("\n\n"),
      },
    },
  },
  args: { startsOpen: true, inPortal: false, opens: "down" },
  argTypes: {
    startsOpen: { control: "boolean" },
    inPortal: { control: "boolean" },
    opens: { control: "inline-radio", options: ["down", "up"], if: { arg: "inPortal" } },
  },
} satisfies Meta<typeof MenuDemo>;

export default meta;

export const Open: StoryObj<typeof meta> = {};
export const Closed: StoryObj<typeof meta> = { args: { startsOpen: false } };
export const InPortalUp: StoryObj<typeof meta> = { args: { inPortal: true, opens: "up" } };
