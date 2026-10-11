//! Las historias de la sede en la espera del canal, con sus dos reparaciones.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import { SedeWaiting } from "./SedeWaiting";
import { momentStory, sedeErrand, sedeViewActions } from "./testing/fixtures/sedeView";

const meta = {
  title: "Pantallas/Ventana de sede/Espera",
  ...sedeMomentMeta,
  parameters: {
    ...sedeMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "El momento 1 de la ventana de sede: la espera del canal y, cuando ya no va a abrirse, la instalación de la CA local y las dos recetas de navegador.",
          "Úsalo mientras el canal con la sede no se abre (`connecting`) y cuando ya no va a abrirse (`unreachable`).",
          "No lo cierres solo ni le añadas «Reintentar»: abandonar lo decide la persona y reintentar es cosa de la sede. No diagnostiques la causa: rFirma no puede saber si se denegó el permiso.",
        ].join("\n\n"),
      },
    },
  },
  component: SedeWaiting,
  args: { onInstallLocalCa: sedeViewActions.onInstallLocalCa, onCancel: sedeViewActions.onCancel },
} satisfies Meta<typeof SedeWaiting>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Waiting: Story = momentStory(
  { moment: "connecting" },
  sedeErrand({ kind: "waiting" }, { origin: null }),
);

export const Unreachable: Story = momentStory(
  { moment: "unreachable" },
  sedeErrand({ kind: "unreachable" }),
);

export const NoChannel: Story = momentStory(
  { moment: "unreachable" },
  sedeErrand({ kind: "noChannel", reason: "channelNotOpened" }),
);
