//! Las historias del fichero que pide el diálogo del portal: guardar el que propone la sede y cargar el que elige la persona.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import { SedeTransfer } from "./SedeTransfer";
import { momentStory, sedeErrand } from "./testing/fixtures/sedeView";

const meta = {
  title: "Flujos/Sede/Guardar y cargar",
  ...sedeMomentMeta,
  parameters: {
    ...sedeMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "El fichero que la sede quiere guardar o cargar, mientras el diálogo del portal está encima.",
          "Úsalo cuando la sede pide guardar un fichero o cargar uno o varios, mientras la persona decide en el diálogo.",
          "Aportas `transfer`: el guardado, con el nombre del fichero, o la carga, con si es uno o varios.",
          "No nombres la carpeta: la ruta la elige el diálogo y no vuelve. No le añadas acciones: quien confirma o descarta es la persona, dentro del diálogo.",
        ].join("\n\n"),
      },
    },
    designSync: { cardMode: "column" },
  },
  component: SedeTransfer,
} satisfies Meta<typeof SedeTransfer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SavingNamedFile: Story = momentStory(
  { transfer: { kind: "saving", filename: "informe.pdf" } },
  sedeErrand({ kind: "saving", filename: "informe.pdf" }),
);

export const SavingUnnamedFile: Story = momentStory(
  { transfer: { kind: "saving", filename: null } },
  sedeErrand({ kind: "saving", filename: null }),
);

export const SavingUnwritableDestination: Story = momentStory(
  { transfer: { kind: "saving", filename: "informe.pdf", unwritable: true } },
  sedeErrand({ kind: "saving", filename: "informe.pdf", unwritable: true }),
);

export const LoadingOneFile: Story = momentStory(
  { transfer: { kind: "loading", multiple: false } },
  sedeErrand({ kind: "loading", multiple: false }),
);

export const LoadingSeveralFiles: Story = momentStory(
  { transfer: { kind: "loading", multiple: true } },
  sedeErrand({ kind: "loading", multiple: true }),
);
