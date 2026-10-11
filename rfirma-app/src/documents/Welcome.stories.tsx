//! Las historias de la bienvenida: con recientes, sin ellos, sin actividad recordada, en tema oscuro y en una ventana estrecha.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { storyRecents } from "./testing/fixtures";
import { Welcome } from "./Welcome";

const meta = {
  title: "Pantallas/Documentos/Welcome",
  component: Welcome,
  parameters: {
    docs: {
      description: {
        component: [
          "La bienvenida que ocupa el hueco del visor al arrancar sin documento: «Empezar» con abrir, el estado y la zona de soltar; los recientes al lado; y la casilla que decide si se vuelve a mostrar.",
          "Úsala solo en el arranque. Al cerrar la última pestaña, o con la bienvenida desactivada, el visor enseña la zona de soltar sola.",
          "No escondas la columna de recientes cuando no hay actividad recordada: queda vacía para que «Empezar» no cambie de sitio.",
        ].join("\n\n"),
      },
    },
    layout: "fullscreen",
  },
  decorators: [
    (Story, { parameters }) => (
      <div style={{ width: parameters.frameWidth ?? 1200, height: 760, display: "grid" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    recents: storyRecents,
    rememberActivity: true,
    showWelcome: true,
    onShowWelcomeChange: fn(),
    onOpen: fn(),
    onOpenStatus: fn(),
    onSelectRecent: fn(),
    onClearRecents: fn(),
  },
} satisfies Meta<typeof Welcome>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithRecents: Story = {};

export const WithoutRecents: Story = { args: { recents: [] } };

export const ActivityNotRemembered: Story = { args: { recents: [], rememberActivity: false } };

export const DarkTheme: Story = { globals: { theme: "dark" } };

export const NarrowWindow: Story = { parameters: { frameWidth: 480 } };
