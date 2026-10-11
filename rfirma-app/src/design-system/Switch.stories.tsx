//! La historia de `Switch`: con su texto, con la ayuda, a la derecha del rótulo, encendido y bloqueado, y desnudo.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Switch } from "./Switch";

function SwitchDemo({
  initial,
  disabled,
  wide,
  trailing,
  hint,
  bare,
}: {
  initial: boolean;
  disabled: boolean;
  wide: boolean;
  trailing: boolean;
  hint: boolean;
  bare: boolean;
}) {
  const [checked, setChecked] = useState(initial);
  return (
    <div style={{ minWidth: 320 }}>
      {bare ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Switch
            labelledBy="switch-story-owner"
            checked={checked}
            disabled={disabled}
            onChange={setChecked}
          />
          <span id="switch-story-owner">Con rúbrica</span>
        </div>
      ) : (
        <Switch
          label="Recordar mi elección"
          hint={hint ? "Se guarda en este equipo." : undefined}
          checked={checked}
          disabled={disabled}
          wide={wide}
          trailing={trailing}
          title={disabled ? "Bloqueado en su valor actual" : undefined}
          onChange={setChecked}
        />
      )}
    </div>
  );
}

const meta = {
  title: "Primitivos/Switch",
  component: SwitchDemo,
  parameters: {
    docs: {
      description: {
        component: [
          'El interruptor con `role="switch"`, para que el lector de pantalla diga «activado» y no «marcado».',
          "Úsalo para un ajuste que se aplica en el acto. Si la opción no actúa hasta confirmar un formulario, una casilla.",
          "Aportas `checked` y `onChange`, y su nombre: `label`, el texto a su lado, o `labelledBy`, el `id` de otro elemento que lo nombra (entonces va desnudo). Si hace falta, `hint`, `disabled`, `title`, `wide` (la separación de Preferencias) y `trailing` (el interruptor detrás del texto).",
          "No le pases a la vez `label` y `labelledBy`. No decide su estado: `checked` y `disabled` llegan de fuera, y puede estar encendido y bloqueado a la vez.",
        ].join("\n\n"),
      },
    },
  },
  args: { initial: false, disabled: false, wide: false, trailing: false, hint: false, bare: false },
  argTypes: {
    initial: { control: "boolean" },
    disabled: { control: "boolean" },
    wide: { control: "boolean" },
    trailing: { control: "boolean" },
    hint: { control: "boolean" },
    bare: { control: "boolean" },
  },
} satisfies Meta<typeof SwitchDemo>;

export default meta;

export const Off: StoryObj<typeof meta> = {};
export const On: StoryObj<typeof meta> = { args: { initial: true } };
export const WithHint: StoryObj<typeof meta> = { args: { wide: true, hint: true } };
export const Trailing: StoryObj<typeof meta> = { args: { trailing: true, initial: true } };
export const OnAndDisabled: StoryObj<typeof meta> = { args: { initial: true, disabled: true } };
export const Bare: StoryObj<typeof meta> = { args: { bare: true, initial: true } };
