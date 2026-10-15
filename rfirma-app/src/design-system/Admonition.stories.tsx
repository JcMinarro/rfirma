//! Las historias de `Admonition`, con controles para su tono, su título, su acción y su contenido, y el detalle técnico para la sede como ejemplo.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Admonition } from "./Admonition";
import { Button } from "./Button";
import { Icon } from "./icons";

const COPY_BUTTON = (
  <Button variant="ghost">
    <Icon name="copy" size={14} />
    Copiar
  </Button>
);

const BLOCKS = (
  <>
    <p className="rf-body">
      La contrafirma solo existe en CAdES, CMS y XAdES; en otro formato, pedid una cofirma (cosign).
    </p>
    <code className="rf-body">SAF_06: contrafirma no admitida</code>
  </>
);

const meta = {
  title: "Primitivos/Admonition",
  component: Admonition,
  parameters: {
    docs: {
      description: {
        component: [
          'Una caja sobre `--rf-surface` con borde fino, igual en todos los tonos: el tono solo cambia el icono y el rol. `info` y `warning`, con su icono y `role="status"`; `error`, con el aspa y `role="alert"`; `neutral`, sin icono ni rol, para un bloque de consulta como el detalle técnico.',
          "Sin título, el icono y el texto van en una línea. Con título, este ocupa su propia fila en negrita y en el color del texto, al tamaño del cuerpo, con el icono delante, y el contenido va debajo alineado con él. La acción, un botón discreto como «Copiar», va a la derecha de esa fila sin hacerla más alta.",
          "El contenido va en `rf-body` y en el color del texto: texto suelto, que se pinta como un párrafo, o bloques: una nota, un `<code>`.",
          "Úsalo para un hecho que la persona debe ver antes de actuar —firmas previas, un algoritmo poco seguro— o para el detalle que se lleva a quien mantiene la sede. No apiles dos: si hay varios hechos, van en uno solo con el más importante como título. No hay color que gastar: el tono lo dice el icono.",
        ].join("\n\n"),
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 440 }}>
        <Story />
      </div>
    ),
  ],
  args: { tone: "info", children: "3 traen firmas de otras personas." },
  argTypes: {
    tone: {
      description: "El tono: decide el icono y el rol",
      control: "inline-radio",
      options: ["info", "warning", "error", "neutral"],
    },
    title: {
      description: "La frase de la fila de arriba; vacío, el aviso es una sola línea",
      control: "text",
    },
    action: {
      description: "Lo que va a la derecha de la fila del título",
      control: "inline-radio",
      options: ["none", "copy"],
      mapping: { none: null, copy: COPY_BUTTON },
      labels: { none: "Ninguna", copy: "Botón «Copiar»" },
    },
    children: {
      description: "El contenido: una frase suelta o bloques, una nota y un `<code>`",
      control: "inline-radio",
      options: ["sentence", "blocks"],
      mapping: { sentence: "3 traen firmas de otras personas.", blocks: BLOCKS },
      labels: { sentence: "Frase", blocks: "Nota y código" },
    },
  },
} satisfies Meta<typeof Admonition>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Warning: Story = {
  args: { tone: "warning", children: "Esta sede usa un método de firma poco seguro." },
};

export const ErrorWithTitle: Story = {
  args: {
    tone: "error",
    title: "Tiene una firma que no es válida.",
    children: "Trae firmas de otras personas.",
  },
};

export const TechnicalDetail: Story = {
  args: {
    tone: "neutral",
    title: "Detalle técnico para la sede",
    action: COPY_BUTTON,
    children: BLOCKS,
  },
};
