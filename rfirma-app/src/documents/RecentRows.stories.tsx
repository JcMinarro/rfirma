//! Las historias de los recientes: la sección del estado vacío y las filas con cada situación.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { RecentRows, RecentsSection } from "./RecentRows";
import { storyRecents } from "./testing/fixtures";

const meta = {
  title: "Dominio/Documentos/RecentsSection",
  component: RecentsSection,
  parameters: {
    docs: {
      description: {
        component: [
          "La sección de documentos recientes del estado vacío del visor, con su cabecera y el botón de vaciarla.",
          "Úsala cuando no hay ningún documento abierto, para que la persona vuelva a uno de los últimos con un clic.",
          "No la uses para la lista del menú de abrir, que ya la trae `DocumentTabs`, ni para enseñar documentos abiertos.",
        ].join("\n\n"),
      },
    },
    layout: "centered",
    designSync: { cardMode: "column" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 420 }}>
        <Story />
      </div>
    ),
  ],
  args: { recents: storyRecents, onSelect: fn(), onClear: fn() },
} satisfies Meta<typeof RecentsSection>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Section: Story = {};

export const Empty: Story = { args: { recents: [], keepWhenEmpty: true } };

export const SingleRecent: Story = { args: { recents: storyRecents.slice(0, 1) } };

export const Rows: Story = {
  render: () => (
    <RecentRows
      recents={storyRecents}
      openIds={new Set([storyRecents[0]?.id ?? ""])}
      onSelect={fn()}
    />
  ),
};
