//! Las historias del aviso de error: un fallo con reintento, el de firma con el documento intacto y los que piden otra acción.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ErrorNotice } from "./ErrorNotice";

const meta = {
  title: "Dominio/Errores/ErrorNotice",
  component: ErrorNotice,
  parameters: {
    docs: {
      description: {
        component: [
          "El aviso de un fallo: la situación traducida a una frase que se entiende y, plegado aparte, el texto original para copiarlo.",
          "Úsalo siempre que un fallo llegue a la persona, ya sea en el panel, en una ventana o como último recurso de una ventana que se rompe.",
          "Le das la situación, de la que salen título y cuerpo del catálogo, y, si los hay, el detalle técnico crudo, la ayuda, recargar la ventana o vaciar el almacén. Con `documentUnchanged` dice además que el documento no se ha tocado; con `title`, un título propio en lugar del de la situación.",
          "No escribas tú el mensaje ni traduzcas o recortes el detalle técnico: el detalle va tal como llegó, y el mensaje sale de la situación.",
        ].join("\n\n"),
      },
    },
    layout: "centered",
    designSync: { cardMode: "column" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 380 }}>
        <Story />
      </div>
    ),
  ],
  args: { situation: "bridgeFailed", technicalDetail: "bridge error: code 7", onOpenHelp: fn() },
} satisfies Meta<typeof ErrorNotice>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Retry: Story = {};

export const SigningFailed: Story = { args: { documentUnchanged: true } };

export const SigningFailedWithoutRetry: Story = {
  args: { situation: "certificateExpired", documentUnchanged: true },
};

export const CheckToken: Story = { args: { situation: "tokenAbsent" } };

export const WithoutDetail: Story = { args: { situation: "keyKindUnsupported" } };

export const KeyringPinMissing: Story = {
  args: { situation: "keyringPinMissing", onEmptyStore: fn() },
};

export const Reload: Story = { args: { situation: "renderFailed", onReload: fn() } };
