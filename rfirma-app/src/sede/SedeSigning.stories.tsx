//! Las historias de la sede en su momento 3, firmando y devolviendo la firma.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import { SedeSigning } from "./SedeSigning";
import { momentStory, sedeErrand, sedeViewActions } from "./testing/fixtures/sedeView";
import { certificate } from "./testing/fixtures/sedeWindow";

const meta = {
  title: "Pantallas/Ventana de sede/Firmando",
  ...sedeMomentMeta,
  parameters: {
    ...sedeMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "El momento 3 de la ventana de sede: los dos tramos de la firma, firmar y devolver a la sede.",
          "Úsalo entre que la persona acepta y que la firma vuelve a la sede.",
          "Aportas `origin`, `certificate`, el elegido; `phase`, el tramo en curso, y `onCancel`, que solo se ofrece mientras la sede no ha recibido nada.",
          "No nombres fases del motor como «prefirma»: no es el diálogo de progreso de la ventana principal. No añadas una acción principal.",
        ].join("\n\n"),
      },
    },
  },
  component: SedeSigning,
  args: { origin: "sede.ejemplo.gob.es", onCancel: sedeViewActions.onCancel },
} satisfies Meta<typeof SedeSigning>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Signing: Story = momentStory(
  { certificate: certificate(), phase: "signing" },
  sedeErrand({ kind: "signing", certificate: certificate(), phase: "signing" }),
);

export const Returning: Story = momentStory(
  { certificate: certificate(), phase: "returning" },
  sedeErrand({ kind: "signing", certificate: certificate(), phase: "returning" }),
);
