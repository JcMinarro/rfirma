//! Las historias del momento 1c con el esqueleto de la ventana ampliada del consentimiento.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { sedeAreaMomentMeta } from "../../.storybook/decorators/sedeWindow";
import { SedeAreaMarking } from "./SedeAreaMarking";
import { resolutionPdf } from "./testing/fixtures/received";
import { sedeViewActions } from "./testing/fixtures/sedeView";

interface AreaMarkingDesignProps {
  unreadable: boolean;
  withOrigin: boolean;
}

function AreaMarkingDesign({ unreadable, withOrigin }: AreaMarkingDesignProps) {
  return (
    <SedeAreaMarking
      pdf={unreadable ? null : resolutionPdf}
      origin={withOrigin ? "sede.villaejemplo.es" : null}
      onMark={sedeViewActions.onMarkArea}
      onCancel={sedeViewActions.onCancel}
    />
  );
}

const meta = {
  title: "Pantallas/Ventana de sede/Marcar la firma",
  ...sedeAreaMomentMeta,
  component: AreaMarkingDesign,
  args: { unreadable: false, withOrigin: true },
  argTypes: {
    unreadable: { description: "La ventana no ha podido abrir el documento para marcarlo" },
    withOrigin: { description: "La sede se identifica con un origen válido" },
  },
  parameters: {
    ...sedeAreaMomentMeta.parameters,
    docs: {
      description: {
        component: [
          "El momento 1c de la ventana de sede, marcar dónde va la firma visible, con el mismo esqueleto que el consentimiento ampliado a 1080 × 660. El documento ocupa la derecha con el visor y la barra de la ventana principal; la columna de 400 px, a la izquierda, lleva arriba quién pide la firma, debajo el título y el bloque «Colocación», y en el pie «Cancelar» y «Continuar», donde el consentimiento pone «Cancelar» y «Firmar».",
          "Si el documento no se puede abrir, el visor queda vacío, la columna lo dice con un aviso de error bajo el título y «Continuar» no se puede pulsar.",
          "Úsalo como referencia del momento 1c hasta que sustituya al actual; los controles cambian los datos, no la pantalla.",
        ].join("\n\n"),
      },
    },
  },
} satisfies Meta<typeof AreaMarkingDesign>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AreaMarking: Story = {};
