//! Las historias de la franja de versión nueva: instalable desde la aplicación y solo con el paso a Acerca de.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { NewVersionStrip } from "./NewVersionStrip";

const meta = {
  title: "Dominio/Actualizaciones/NewVersionStrip",
  component: NewVersionStrip,
  parameters: {
    docs: {
      description: {
        component: [
          "La franja que anuncia una versión nueva de rFirma sobre la ventana principal.",
          "Úsala cuando haya una versión que anunciar: si se puede instalar desde aquí, su acción es «Actualizar ahora»; si no, lleva a Acerca de, que explica cómo actualizar.",
          "No la uses para otros avisos ni le pongas una acción que descargue por su cuenta: la instalación es del diálogo, no de la franja.",
        ].join("\n\n"),
      },
    },
    layout: "fullscreen",
  },
  args: { onOpen: fn(), onDismiss: fn() },
} satisfies Meta<typeof NewVersionStrip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Installable: Story = { args: { newVersion: { version: "0.4.1", installable: true } } };

export const NotInstallable: Story = {
  args: { newVersion: { version: "0.4.1", installable: false } },
};
