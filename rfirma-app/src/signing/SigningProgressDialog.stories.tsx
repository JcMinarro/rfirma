//! Las historias del diálogo de progreso de la firma, una por etapa en curso.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { inDialogWindow } from "../../.storybook/decorators/dialogWindow";
import { SigningProgressDialog } from "./SigningProgressDialog";

const meta = {
  title: "Pantallas/Firma/SigningProgressDialog",
  component: SigningProgressDialog,
  parameters: {
    docs: {
      description: {
        component: [
          "El diálogo de progreso de la firma, con sus tres etapas y la que está en curso.",
          "Ábrelo mientras la firma corre: bloquea la ventana entera.",
          "Aportas solo `stage`, la etapa en la que va la firma ahora mismo.",
          "No le pongas «Cancelar» ni cruz de cerrar: una firma empezada en la tarjeta no tiene marcha atrás. No escondas las etapas: una espera larga sin desglose parece un cuelgue.",
        ].join("\n\n"),
      },
    },
    layout: "centered",
  },
  decorators: [inDialogWindow],
  args: { stage: "presign" },
} satisfies Meta<typeof SigningProgressDialog>;

export default meta;

export const Presign: StoryObj<typeof meta> = {};

export const Sign: StoryObj<typeof meta> = { args: { stage: "sign" } };

export const Postsign: StoryObj<typeof meta> = { args: { stage: "postsign" } };
