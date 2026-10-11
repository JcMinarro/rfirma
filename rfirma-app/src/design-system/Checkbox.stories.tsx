//! Las historias de `Checkbox`: desmarcada, marcada, indeterminada, bloqueada y en cada rol de texto.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox, type CheckboxTextRole } from "./Checkbox";

function CheckboxDemo({
  initial,
  indeterminate,
  disabled,
  textRole,
}: {
  initial: boolean;
  indeterminate: boolean;
  disabled: boolean;
  textRole: CheckboxTextRole;
}) {
  const [checked, setChecked] = useState(initial);
  return (
    <Checkbox
      label="Mostrar la bienvenida al abrir"
      checked={checked}
      indeterminate={indeterminate}
      disabled={disabled}
      textRole={textRole}
      onChange={setChecked}
    />
  );
}

const meta = {
  title: "Primitivos/Checkbox",
  component: CheckboxDemo,
  parameters: {
    docs: {
      description: {
        component: [
          "La casilla nativa dentro de su etiqueta: pulsar el texto también la marca, y la casilla mide 1 em del rol de texto que elijas.",
          "Úsala para una opción ligada a lo que hay en pantalla, como «Mostrar la bienvenida al abrir» al pie de la bienvenida, o para una opción de un formulario que no actúa hasta confirmarlo. Para un ajuste de Preferencias o de un panel que se aplica en el acto, `Switch`.",
          "No decide su estado: `checked`, `indeterminate` y `disabled` llegan de fuera.",
        ].join("\n\n"),
      },
    },
  },
  args: { initial: false, indeterminate: false, disabled: false, textRole: "body" },
  argTypes: {
    initial: { control: "boolean" },
    indeterminate: { control: "boolean" },
    disabled: { control: "boolean" },
    textRole: { control: "inline-radio", options: ["caption", "body", "ui"] },
  },
} satisfies Meta<typeof CheckboxDemo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};
export const Checked: Story = { args: { initial: true } };
export const Indeterminate: Story = { args: { indeterminate: true } };
export const Disabled: Story = { args: { initial: true, disabled: true } };
export const CaptionRole: Story = { args: { initial: true, textRole: "caption" } };
export const BodyRole: Story = { args: { initial: true, textRole: "body" } };
export const UiRole: Story = { args: { initial: true, textRole: "ui" } };
