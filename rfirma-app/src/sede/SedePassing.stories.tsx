//! Las historias provisionales de los momentos de paso de la sede con el esqueleto del consentimiento compacto: la espera, la firma y el guardar o cargar.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { sedeMomentMeta } from "../../.storybook/decorators/sedeWindow";
import type { SigningPhase } from "./errand";
import { SedeAwaiting, SedeFileTransfer, SedeSigningProgress } from "./SedePassing";
import { sedeErrand, sedeViewActions } from "./testing/fixtures/sedeView";

const ORIGIN = sedeErrand({ kind: "waiting" }).origin;

interface PassingDesignProps {
  moment: "waiting" | "unreachable";
  localCaMissing: boolean;
  asks: "signature" | "identity";
  phase: SigningPhase;
  kind: "saving" | "loading";
  named: boolean;
  unwritable: boolean;
  many: boolean;
  withOrigin: boolean;
}

function originOf(withOrigin: boolean) {
  return withOrigin ? ORIGIN : null;
}

function AwaitingDesign({ moment, localCaMissing, asks, withOrigin }: PassingDesignProps) {
  return (
    <SedeAwaiting
      origin={originOf(withOrigin)}
      asks={asks}
      moment={moment}
      localCaMissing={localCaMissing}
      onInstallLocalCa={sedeViewActions.onInstallLocalCa}
      onCancel={sedeViewActions.onCancel}
    />
  );
}

function SigningDesign({ phase, withOrigin }: PassingDesignProps) {
  return (
    <SedeSigningProgress
      origin={originOf(withOrigin)}
      phase={phase}
      onCancel={sedeViewActions.onCancel}
    />
  );
}

function TransferDesign({ kind, named, unwritable, many, withOrigin }: PassingDesignProps) {
  return (
    <SedeFileTransfer
      origin={originOf(withOrigin)}
      transfer={
        kind === "loading"
          ? { kind, multiple: many }
          : { kind, filename: named ? "informe.pdf" : null, unwritable }
      }
    />
  );
}

const meta = {
  title: "Pantallas/Ventana de sede/Momentos de paso nuevos",
  ...sedeMomentMeta,
  component: AwaitingDesign,
  args: {
    moment: "waiting",
    localCaMissing: false,
    asks: "signature",
    phase: "signing",
    kind: "saving",
    named: true,
    unwritable: false,
    many: false,
    withOrigin: true,
  },
  argTypes: {
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
          "Provisional: el diseño de los momentos de paso con el esqueleto del consentimiento compacto. Arriba, la misma cabecera que al consentir; en la espera y la firma, con lo que pide la sede; al guardar o cargar, solo su nombre. Debajo, alineado a la izquierda, solo el título.",
          "Cuando la petición no llega, la pantalla da las recetas del permiso del navegador. Si rFirma sabe que falta su CA local, lo dice en el único aviso de la pantalla, con «Instalar» a su derecha como principal: antes de la receta en Chrome y después en Firefox. El pie conserva las posiciones del consentimiento: a la izquierda, qué hacer tras permitir, que cede si no cabe; a la derecha, «Cerrar», que es el principal cuando no hay aviso.",
          "Mientras se espera o se firma, «Cancelar» queda a la derecha; mientras se envía la firma y mientras el diálogo del sistema guarda o carga, el pie queda vacío a la misma altura.",
        ].join("\n\n"),
      },
    },
  },
} satisfies Meta<typeof AwaitingDesign>;

export default meta;

type Story = StoryObj<typeof meta>;

const hidden = { table: { disable: true } };

export const Waiting: Story = {
  argTypes: {
    moment: {
      description:
        "Si la petición de la sede todavía se espera o ya no ha llegado, por vencer el plazo o porque el canal no puede abrirse",
      control: "radio",
      options: ["waiting", "unreachable"],
      labels: { waiting: "Esperando", unreachable: "No ha llegado" },
    },
    localCaMissing: {
      description:
        "Falta la CA local: rFirma sabe que no está instalada; solo cuenta cuando la petición no ha llegado",
    },
    asks: {
      description: "Qué pide la sede",
      control: "radio",
      options: ["signature", "identity"],
      labels: { signature: "La firma", identity: "Los datos" },
    },
    phase: hidden,
    kind: hidden,
    named: hidden,
    unwritable: hidden,
    many: hidden,
  },
};

export const Signing: Story = {
  render: (args) => <SigningDesign {...args} />,
  argTypes: {
    phase: {
      description:
        "El tramo de la firma: firmando, que aún se puede cancelar, o enviándola a la sede",
      control: "radio",
      options: ["signing", "returning"],
      labels: { signing: "Firmando", returning: "Enviando" },
    },
    moment: hidden,
    localCaMissing: hidden,
    asks: hidden,
    kind: hidden,
    named: hidden,
    unwritable: hidden,
    many: hidden,
  },
};

export const Transfer: Story = {
  render: (args) => <TransferDesign {...args} />,
  argTypes: {
    kind: {
      description: "Si la sede pide guardar un fichero o cargar uno o varios",
      control: "radio",
      options: ["saving", "loading"],
      labels: { saving: "Guardar", loading: "Cargar" },
    },
    named: {
      description: "Al guardar, si la sede propone un nombre de fichero",
    },
    unwritable: {
      description: "Al guardar, si el destino anterior no se dejó escribir",
    },
    many: {
      description: "Al cargar, si la sede pide varios ficheros",
    },
    moment: hidden,
    localCaMissing: hidden,
    asks: hidden,
    phase: hidden,
  },
};
