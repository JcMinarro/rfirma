//! Las historias del velo de la retirada del certificado: la pregunta, el avance y cada desenlace, sobre el panel de estado.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { inStatusWindow } from "../../.storybook/decorators/statusWindow";
import { StatusView } from "./StatusView";
import {
  caInstalledEverywhere,
  sitesHandledByRfirma,
  withdrawalDone,
  withdrawalHandlerFailed,
  withdrawalPartial,
  withdrawalStores,
} from "./testing/fixtures";
import { WithdrawCertificateView } from "./WithdrawCertificateView";

const behindTheVeil = (
  <StatusView
    rows={[sitesHandledByRfirma, caInstalledEverywhere]}
    onClose={fn()}
    onRecheck={fn()}
    onAction={fn()}
    onChooseSiteSignatureHandler={fn()}
    onWithdraw={fn()}
  />
);

const meta = {
  title: "Pantallas/Estado/WithdrawCertificateView",
  component: WithdrawCertificateView,
  decorators: [
    (Story) => (
      <>
        {behindTheVeil}
        <Story />
      </>
    ),
    inStatusWindow,
  ],
  parameters: {
    docs: {
      description: {
        component: [
          "El velo de la retirada del certificado de rFirma en sus tres momentos: la pregunta, el trabajo y el resultado.",
          "Úsalo sobre la vista de estado cuando la persona pide retirar el certificado. Empieza bajo la cabecera para dejarla alcanzable.",
          "Aportas `stores`, los almacenes donde está hoy el certificado; `moment`; `report`, el resultado del último intento; `onWithdraw`, que lanza la retirada o la repite sobre lo que falló, y `onClose`.",
          "No le des estado ni puertos: el momento lo decide quien lo monta. `report` solo se pinta en el momento `result`.",
        ].join("\n\n"),
      },
    },
    layout: "centered",
  },
  args: {
    stores: withdrawalStores,
    report: null,
    onWithdraw: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof WithdrawCertificateView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Question: Story = { args: { moment: "question" } };

export const Working: Story = { args: { moment: "working" } };

export const Done: Story = { args: { moment: "result", report: withdrawalDone } };

export const Partial: Story = { args: { moment: "result", report: withdrawalPartial } };

export const HandlerFailed: Story = {
  args: { moment: "result", report: withdrawalHandlerFailed },
};
