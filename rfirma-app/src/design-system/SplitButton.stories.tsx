//! La historia de `SplitButton`: la acción de abrir con la flecha de los recientes, y la acción sola.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { MenuItem } from "./Menu";
import { SplitButton } from "./SplitButton";

function SplitButtonDemo({ withItems }: { withItems: boolean }) {
  return (
    <div style={{ minHeight: 160 }}>
      <SplitButton
        onAction={() => {}}
        menuLabel="Abiertos recientemente"
        items={
          withItems ? (
            <>
              <MenuItem>Solicitud de subvención.pdf</MenuItem>
              <MenuItem>Memoria técnica.pdf</MenuItem>
            </>
          ) : undefined
        }
      >
        Abrir PDF…
      </SplitButton>
    </div>
  );
}

const meta = {
  title: "Primitivos/SplitButton",
  component: SplitButtonDemo,
  parameters: {
    docs: {
      description: {
        component: [
          "El botón partido: una acción principal y, a su lado, una flecha que abre un menú con las alternativas.",
          "Úsalo cuando una acción tiene una forma habitual y otras menos frecuentes. Si todas pesan igual, un `Menu` colgado de un `Button`.",
          "Aportas `children`, el contenido de la acción principal; `onAction`; `menuLabel`, el nombre accesible de la flecha; `items`, las entradas `MenuItem` (sin ellas solo se pinta la acción); y, si hace falta, `variant`, `title`, `className` y `menuClassName`. Elegir una entrada cierra el menú.",
          "No metas en `items` la misma acción que el botón principal. No lo montes a mano con dos `Button`: la semántica del menú ya está resuelta aquí.",
        ].join("\n\n"),
      },
    },
  },
  args: { withItems: true },
  argTypes: { withItems: { control: "boolean" } },
} satisfies Meta<typeof SplitButtonDemo>;

export default meta;

export const WithMenu: StoryObj<typeof meta> = {};
export const ActionOnly: StoryObj<typeof meta> = { args: { withItems: false } };
