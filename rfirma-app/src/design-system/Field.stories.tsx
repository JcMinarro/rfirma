//! La historia de `Field`: una etiqueta, un control y su ayuda.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field } from "./Field";

const meta = {
  title: "Primitivos/Field",
  component: Field,
  parameters: {
    docs: {
      description: {
        component: [
          "El campo de formulario `rf-field`: apila la etiqueta, el control y la ayuda con su hueco.",
          'Úsalo para cada control de formulario con etiqueta. Si el campo tiene un error, ponle `className="rf-field--error"`.',
          'Aportas `children`: un `<label className="rf-label">` con su `htmlFor`, el control (`rf-input` u otro primitivo) y, si hace falta, un `<span className="rf-hint">`. Además, lo de un `<div>`.',
          "No dejes un control sin su etiqueta asociada. No señales el error solo con color: el texto de ayuda dice qué pasa.",
        ].join("\n\n"),
      },
    },
  },
  render: (args) => (
    <Field {...args}>
      <label className="rf-label" htmlFor="field-story-input">
        Nombre
      </label>
      <input className="rf-input" id="field-story-input" />
      <span className="rf-hint">Como aparece en el certificado</span>
    </Field>
  ),
} satisfies Meta<typeof Field>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
