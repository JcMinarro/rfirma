//! Las historias de `Icon`: un papel con controles y el catálogo de todos los papeles a su tamaño por defecto.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from ".";
import { ICON_NAMES, ICON_SIZES } from "./names";

const CELL = { padding: "6px 16px", textAlign: "left" } as const;

const meta = {
  title: "Primitivos/Icon",
  component: Icon,
  parameters: {
    docs: {
      description: {
        component: [
          "El icono de un papel de la interfaz: pides `name` («done», «warning», «document»…) y no el dibujo, y el sistema elige la familia que lo dibuja.",
          "Úsalo junto a una palabra que diga lo mismo: es decorativo (`aria-hidden`) y toma el color del texto que lo rodea.",
          "Props: `name`, uno de los papeles del catálogo; `size`, el lado en px, que por defecto es el de cada papel; `strokeWidth`, el grosor del contorno.",
          "No lo uses como único indicador de un estado ni le pongas color propio: icono y palabra van del mismo color. No dibujes un SVG suelto si el papel ya existe.",
        ].join("\n\n"),
      },
    },
  },
  args: { name: "done" },
  argTypes: {
    name: { control: "select", options: ICON_NAMES },
    size: { control: "number" },
    strokeWidth: { control: "number" },
  },
} satisfies Meta<typeof Icon>;

export default meta;

export const Single: StoryObj<typeof meta> = { args: { size: 24 } };

export const Catalogue: StoryObj<typeof meta> = {
  render: () => (
    <table className="rf-body" style={{ borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th scope="col" style={CELL}>
            name
          </th>
          <th scope="col" style={CELL}>
            size
          </th>
          <th scope="col" style={CELL}>
            Icono
          </th>
        </tr>
      </thead>
      <tbody>
        {ICON_NAMES.map((name) => (
          <tr key={name}>
            <th scope="row" style={CELL}>
              <code>{name}</code>
            </th>
            <td style={CELL}>{ICON_SIZES[name]}</td>
            <td style={CELL}>
              <Icon name={name} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};
