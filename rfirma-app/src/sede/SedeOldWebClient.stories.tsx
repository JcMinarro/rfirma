//! Las historias de la sede con el aviso del cliente web antiguo.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import { SedeOldWebClient } from "./SedeOldWebClient";
import { momentStory, sedeErrand, sedeViewActions } from "./testing/fixtures/sedeView";

const meta = {
  title: "Pantallas/Ventana de sede/Cliente antiguo",
  ...sedeMomentMeta,
  parameters: {
    ...sedeMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "El aviso de que la página usa un cliente web antiguo.",
          "Úsalo cuando la sede llega con un cliente web antiguo: la persona lo descarta y el trámite sigue.",
          "Aportas solo `onDismiss`, que lo descarta.",
          "No lo presentes como un error ni detengas el trámite con él.",
        ].join("\n\n"),
      },
    },
  },
  component: SedeOldWebClient,
  args: { onDismiss: sedeViewActions.onDismissWarning },
} satisfies Meta<typeof SedeOldWebClient>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OldWebClient: Story = momentStory({}, sedeErrand({ kind: "oldWebClient" }));
