//! Las historias de la sede en su momento 2b, la confirmación que exige el validador, con cada mensaje que sabe contar.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import { SedeConfirm } from "./SedeConfirm";
import { momentStory, sedeErrand, sedeViewActions } from "./testing/fixtures/sedeView";

const meta = {
  title: "Flujos/Sede/Confirmar",
  ...sedeMomentMeta,
  parameters: {
    ...sedeMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "El momento 2b de la ventana de sede: la pregunta que el validador del original obliga a hacer antes de consentir, con sus palabras y sus dos salidas.",
          "Úsalo cuando el validador no da por buenas las firmas previas o el PDF está certificado: llega antes del consentimiento, no encima de él.",
          "Aportas `messageCode`, que elige el texto del original, y `onConfirm` y `onCancel`; cancelar aquí es contestar a la sede.",
          "No resumas ni reinterpretes la pregunta: la decisión no es de rFirma. No lo pintes como un diálogo sobre el consentimiento.",
        ].join("\n\n"),
      },
    },
    designSync: { cardMode: "column" },
  },
  component: SedeConfirm,
  args: { onConfirm: sedeViewActions.onConfirmSignatures, onCancel: sedeViewActions.onCancel },
} satisfies Meta<typeof SedeConfirm>;

export default meta;

type Story = StoryObj<typeof meta>;

const confirming = (messageCode: string): Story =>
  momentStory({ messageCode }, sedeErrand({ kind: "confirming", messageCode }));

export const ShadowAttackSuspect = confirming("pdfShadowAttackSuspect");

export const ModifiedForm = confirming("signingModifiedPdfForm");

export const CertifiedPdf = confirming("signingCertifiedPdf");

export const UnknownMessage = confirming("unknownValidatorMessage");
