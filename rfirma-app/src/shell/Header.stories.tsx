//! Las historias de la cabecera: el menú en la barra, el botón de aviso y la variante de Linux, solo con pestañas.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { DocumentTabs } from "../documents/DocumentTabs";
import { storyRecents, storyTabs } from "../documents/testing/fixtures";
import { Header } from "./Header";

const tabs = (
  <DocumentTabs
    tabs={storyTabs}
    activeId={storyTabs[0]?.id ?? null}
    recents={storyRecents}
    onActivate={fn()}
    onClose={fn()}
    onOpen={fn()}
    onSelectRecent={fn()}
    onClearRecents={fn()}
  />
);

const meta = {
  title: "Flujos/Ventana principal/Header",
  component: Header,
  parameters: {
    docs: {
      description: {
        component: [
          "La cabecera única de la ventana principal: el hueco de las pestañas, el aviso de estado y, cuando se ancla en ella, el único menú de la aplicación.",
          "Úsala dentro de `MainWindow`, que ya la monta; sola, para diseñar sus estados.",
          "Aportas `menuAnchor`, dónde va el menú; `hasAttention`, si lleva el botón de aviso; `documents`, lo que se pinta antes del menú, normalmente `DocumentTabs`, y las órdenes `onOpenStatus`, `onOpenPreferences`, `onOpenHelp` y `onOpenAbout`.",
          "No le añadas una barra de menús ni entradas de *Archivo* o *Ver*, ni el certificado o una insignia del documento: eso lo dicen el panel y la pestaña. El menú arranca cerrado.",
        ].join("\n\n"),
      },
    },
    layout: "fullscreen",
    // Las pestañas de la cabecera son las mismas de `DocumentTabs`, con el mismo hermano dentro del `tablist`.
    a11y: { config: { rules: [{ id: "aria-required-children", enabled: false }] } },
  },
  args: {
    menuAnchor: "header",
    onOpenStatus: fn(),
    onOpenPreferences: fn(),
    onOpenHelp: fn(),
    onOpenAbout: fn(),
  },
} satisfies Meta<typeof Header>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithoutDocuments: Story = {};

export const WithDocuments: Story = { args: { documents: tabs } };

export const WithAttention: Story = { args: { documents: tabs, hasAttention: true } };

export const NativeTitlebarWithDocuments: Story = {
  args: { menuAnchor: "titlebar", documents: tabs },
};
