//! La historia de `MenuItem`: una entrada sencilla, una con contenido rico y una desactivada, dentro de su `role="menu"`.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MenuItem } from "./Menu";

const meta = {
  title: "Primitivos/MenuItem",
  component: MenuItem,
  parameters: {
    docs: {
      description: {
        component: [
          'Una entrada de `Menu`: un botón con `role="menuitem"`, fuera del orden de tabulación, al que `Menu` lleva el foco con las flechas, Inicio y Fin.',
          'Úsala solo como hija directa de `Menu`; para separar grupos de entradas, un `<hr className="rf-divider" />` entre ellas.',
          "No le pongas `role` ni `tabIndex`: los fija ella. No la uses fuera de un `Menu`, que es quien la hace navegable.",
        ].join("\n\n"),
      },
    },
  },
  decorators: [
    (Story) => (
      <div role="menu" aria-label="Acciones" className="rf-menu" style={{ minWidth: 260 }}>
        <Story />
      </div>
    ),
  ],
  args: { children: "Preferencias…", onClick: fn() },
} satisfies Meta<typeof MenuItem>;

export default meta;

export const Plain: StoryObj<typeof meta> = {};
export const Disabled: StoryObj<typeof meta> = { args: { disabled: true } };
export const RichContent: StoryObj<typeof meta> = {
  args: {
    children: (
      <>
        <span style={{ display: "flex", flex: 1, flexDirection: "column", gap: 3 }}>
          <span>Solicitud de subvención.pdf</span>
          <small className="rf-text-muted">Documentos</small>
        </span>
        <small className="rf-text-muted">hoy</small>
      </>
    ),
  },
};
