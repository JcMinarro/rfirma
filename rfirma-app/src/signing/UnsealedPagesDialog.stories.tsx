//! Las historias del diálogo de páginas sin firma visible, según cuántas páginas se caen.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { inDialogWindow } from "../../.storybook/decorators/dialogWindow";
import { UnsealedPagesDialog } from "./UnsealedPagesDialog";

const meta = {
  title: "Pantallas/Firma/UnsealedPagesDialog",
  component: UnsealedPagesDialog,
  parameters: {
    docs: {
      description: {
        component: [
          "El diálogo que avisa de cuántas páginas del conjunto elegido se quedan sin firma visible.",
          "Ábrelo justo antes de firmar y solo cuando alguna página se va a quedar sin sello: es el único aviso, porque el visor no deja marca por página.",
          "Aportas `fallen`, cuántas páginas se quedan sin sello, y `onConfirm` y `onCancel`.",
          "No digas «recortadas»: la firma cubre el documento entero y lo que falta es la marca visible. No enumeres las páginas: basta el recuento.",
        ].join("\n\n"),
      },
    },
    layout: "centered",
  },
  decorators: [inDialogWindow],
  args: { fallen: 3, onConfirm: fn(), onCancel: fn() },
} satisfies Meta<typeof UnsealedPagesDialog>;

export default meta;

export const SeveralPages: StoryObj<typeof meta> = {};

export const OnePage: StoryObj<typeof meta> = { args: { fallen: 1 } };

export const ManyPages: StoryObj<typeof meta> = { args: { fallen: 12 } };
