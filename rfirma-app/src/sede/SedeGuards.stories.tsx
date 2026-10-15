//! Las historias provisionales de los avisos previos nuevos de sede, que documentan el diseño hasta que se implemente: la página desactualizada y la pregunta del validador.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import { SedeOutdatedPage, SedeValidatorQuestion } from "./SedeGuards";
import { sedeViewActions } from "./testing/fixtures/sedeView";

const ORIGIN = "sede.villaejemplo.es";

interface GuardDesignProps {
  guard: "outdatedPage" | "validatorQuestion";
  message: string;
  withOrigin: boolean;
}

function GuardDesign({ guard, message, withOrigin }: GuardDesignProps) {
  const origin = withOrigin ? ORIGIN : null;

  return guard === "outdatedPage" ? (
    <SedeOutdatedPage
      origin={origin}
      onDismiss={sedeViewActions.onDismissWarning}
      onCancel={sedeViewActions.onCancel}
    />
  ) : (
    <SedeValidatorQuestion
      origin={origin}
      messageCode={message}
      onConfirm={sedeViewActions.onConfirmSignatures}
      onCancel={sedeViewActions.onCancel}
    />
  );
}

const meta = {
  title: "Pantallas/Ventana de sede/Avisos previos nuevos",
  ...sedeMomentMeta,
  component: GuardDesign,
  args: { guard: "outdatedPage", message: "pdfShadowAttackSuspect", withOrigin: true },
  argTypes: {
    guard: { table: { disable: true } },
    message: { table: { disable: true } },
    withOrigin: {
      description:
        "Si se sabe qué sede lo pidió; sin origen, la cabecera la nombra sin identificar",
    },
  },
  parameters: {
    ...sedeMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "Provisional: el diseño de los avisos que llegan antes del consentimiento, con el esqueleto del consentimiento compacto. Arriba, la misma cabecera que al consentir, con quién lo pide; debajo, alineado a la izquierda, el título con el icono de aviso a su izquierda y una frase.",
          "La página desactualizada dice solo el riesgo: «Puede tener errores o no ser segura.». La pregunta del validador conserva las palabras del original, sin resumir ni reinterpretar, porque la decisión no es de rFirma.",
          "El pie conserva las posiciones del consentimiento: «Cancelar» donde estaba «Cancelar» y «Continuar» como principal donde estaba «Firmar». Escape cancela.",
        ].join("\n\n"),
      },
    },
  },
} satisfies Meta<typeof GuardDesign>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OutdatedPage: Story = {};

export const ValidatorQuestion: Story = {
  args: { guard: "validatorQuestion" },
  argTypes: {
    message: {
      description: "Qué pregunta el validador del original",
      control: "radio",
      options: [
        "pdfShadowAttackSuspect",
        "signingModifiedPdfForm",
        "signingCertifiedPdf",
        "unknownValidatorMessage",
      ],
      labels: {
        pdfShadowAttackSuspect: "Ataque de sombra",
        signingModifiedPdfForm: "Formulario modificado",
        signingCertifiedPdf: "PDF certificado",
        unknownValidatorMessage: "Desconocido",
      },
      table: { disable: false },
    },
  },
};
