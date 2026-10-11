//! La historia de `Badge`, con control para su variante.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";

const meta = {
  title: "Primitivos/Badge",
  component: Badge,
  parameters: {
    docs: {
      description: {
        component: [
          "Una insignia corta que acompaña a otro texto: una versión, un recuento o una marca de estado.",
          "Úsala para un dato de una o dos palabras pegado a lo que califica. Si el texto es una frase, va en `rf-caption` o `rf-hint`.",
          "Aportas `children`, el texto, y `variant`: sin ella es neutra; `primary` la rellena con el color primario. Además, lo de un `<span>`.",
          "No la uses como botón ni la hagas clicable. No hay variantes de éxito ni de error: el estado lo dicen la palabra y su icono.",
        ].join("\n\n"),
      },
    },
  },
  args: { children: "v1.2.3" },
  argTypes: { variant: { control: "select", options: [undefined, "primary"] } },
} satisfies Meta<typeof Badge>;

export default meta;

export const Neutral: StoryObj<typeof meta> = {};
export const Primary: StoryObj<typeof meta> = { args: { variant: "primary" } };
