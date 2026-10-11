//! Las historias del bloque «Colocación»: una por modo de páginas y una con el error del campo.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlacementBlock } from "./PlacementBlock";
import { placementStateOf } from "./testing/fixtures";

const RECT = { x0: 100, y0: 100, x1: 300, y1: 180 };

const meta = {
  title: "Dominio/Firma/PlacementBlock",
  component: PlacementBlock,
  parameters: {
    docs: {
      description: {
        component: [
          "El bloque «Colocación» de la firma visible: el segmentado «Una página | Varias | Todas», la línea de la página, el campo de «Varias» con su error y el botón de la página.",
          "Úsalo donde la persona decida en qué páginas va la firma visible; lo comparten el panel de firma de la ventana principal y el momento de marcar la firma de la sede.",
          "No le pases píxeles ni gestos del visor, ni repitas sus validaciones fuera: el error del campo «Varias» llega ya en el estado.",
        ].join("\n\n"),
      },
    },
    layout: "centered",
    designSync: { cardMode: "column" },
  },
  decorators: [
    (Story) => (
      <section className="panel__placement" style={{ width: 332 }}>
        <Story />
      </section>
    ),
  ],
} satisfies Meta<typeof PlacementBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SinglePage: Story = {
  args: {
    state: placementStateOf({ rect: RECT, sets: { single: 3, these: null }, pageCount: 27 }),
  },
};

export const SinglePageNotSealedYet: Story = {
  args: { state: placementStateOf({ viewedPage: 3, pageCount: 27 }) },
};

export const SeveralPages: Story = {
  args: {
    state: placementStateOf({
      rect: RECT,
      sets: { single: null, these: { only: [1, 3, 4, 5] } },
      mode: "these",
      pageCount: 27,
    }),
  },
};

export const SeveralPagesWithFieldError: Story = {
  args: {
    state: {
      ...placementStateOf({
        rect: RECT,
        sets: { single: null, these: { only: [1, 3] } },
        mode: "these",
        pageCount: 27,
      }),
      pagesText: "1-99",
      rangeError: { kind: "beyond", page: 99, pageCount: 27 },
      pageAction: null,
    },
  },
};

export const AllPages: Story = {
  args: { state: placementStateOf({ rect: RECT, mode: "all", pageCount: 27 }) },
};
