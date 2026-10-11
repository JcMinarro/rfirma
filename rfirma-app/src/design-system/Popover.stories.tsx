//! La historia de `Popover`: un panel anclado a su botón, abierto o cerrado, con su cierre por Escape y por pulsar fuera.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { Popover } from "./Popover";

function PopoverDemo({ startsOpen, inPortal }: { startsOpen: boolean; inPortal: boolean }) {
  const [open, setOpen] = useState(startsOpen);
  const anchor = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div ref={anchor} style={{ display: "inline-block", minWidth: 220 }}>
      <Button ref={trigger} variant="secondary" onClick={() => setOpen((was) => !was)}>
        Abrir panel
      </Button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchor}
        returnFocusRef={trigger}
        tabIndex={-1}
        portal={inPortal ? { maxHeight: 240 } : undefined}
      >
        <Card elevated className="rf-body" style={{ marginTop: 4, padding: "8px 10px" }}>
          Contenido del panel
        </Card>
      </Popover>
    </div>
  );
}

const meta = {
  title: "Primitivos/Popover",
  component: PopoverDemo,
  parameters: {
    docs: {
      description: {
        component: [
          "El panel flotante de los desplegables: se cierra al pulsar fuera, con Escape o tabulando desde dentro, y mueve el foco al abrirse y al cerrarse.",
          "Úsalo como base de un desplegable propio. Si lo que quieres es un menú o una lista de opciones, usa `Menu`, `Select` o `Combobox`, que ya lo llevan dentro.",
          "Aportas `open` y `onClose` (tú decides qué es «cerrado»), `anchorRef` (el disparador: pulsarlo no cierra), `initialFocus` y `returnFocusRef` para el foco, `restoreFocus` para cuándo vuelve y `portal`, que lo pinta en `body` bajo el ancla con un alto máximo. Además, `children` y lo de un `<div>` salvo `style`.",
          "No le pases `style`: la colocación es suya. No lo uses como diálogo: no es modal.",
        ].join("\n\n"),
      },
    },
    designSync: { cardMode: "single", primaryStory: "Open" },
  },
  args: { startsOpen: true, inPortal: false },
  argTypes: { startsOpen: { control: "boolean" }, inPortal: { control: "boolean" } },
} satisfies Meta<typeof PopoverDemo>;

export default meta;

export const Open: StoryObj<typeof meta> = {};
export const Closed: StoryObj<typeof meta> = { args: { startsOpen: false } };
export const InPortal: StoryObj<typeof meta> = { args: { inPortal: true } };
