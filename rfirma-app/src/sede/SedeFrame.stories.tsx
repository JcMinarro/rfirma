//! Las historias de `SedeBody`, el marco de un momento de la ventana de sede: con su pie de acciones y con el pie fijo vacío.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import { Button } from "../design-system/Button";
import { Stack } from "../design-system/Stack";
import { SedeBody } from "./SedeFrame";

const meta = {
  title: "Dominio/Sede/SedeBody",
  ...sedeMomentMeta,
  parameters: {
    ...sedeMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "El marco de un momento de la ventana de sede: el cuerpo, que se desplaza, y el pie con las acciones, con Intro en la principal y Escape en la salida.",
          "Úsalo para diseñar un momento nuevo de la ventana de sede, dentro de su superficie de 520 × 420 con la clase `sede-window`: todos los momentos que existen se pintan dentro de él.",
          "No pongas acciones en el cuerpo salvo una microacción en línea, ni más de un botón primario en el pie. En los momentos de firma y de salida, fija el pie para que aparecer o desaparecer «Cancelar» no mueva nada.",
        ].join("\n\n"),
      },
    },
  },
  component: SedeBody,
  args: {
    onEscape: fn(),
    children: (
      <Stack gap="xs">
        <p className="rf-title">Firmar en sede.ejemplo.gob.es</p>
        <p className="rf-body rf-text-muted">
          El contenido del momento va aquí: lo que se pide y lo que hay que decidir.
        </p>
      </Stack>
    ),
    footer: (
      <>
        <Button variant="ghost">Cancelar</Button>
        <Button variant="primary">Continuar</Button>
      </>
    ),
  },
  argTypes: { children: { control: false }, footer: { control: false } },
} satisfies Meta<typeof SedeBody>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithActions: Story = {};
export const SteadyEmptyFooter: Story = { args: { footer: null, steadyFooter: true } };
