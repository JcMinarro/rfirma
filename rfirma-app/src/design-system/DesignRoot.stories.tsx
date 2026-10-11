//! La historia de `DesignRoot`: la misma muestra en cada idioma y tema, para ver qué cambia al cambiar la raíz.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n/languages";
import { Button } from "./Button";
import { Card } from "./Card";
import { DesignRoot } from "./DesignRoot";
import { Row } from "./Row";
import { Stack } from "./Stack";

function Sample() {
  const { t } = useTranslation();
  return (
    <Card>
      <Stack gap="md">
        <p className="rf-title">Documento listo para firmar</p>
        <p className="rf-body rf-text-muted">El texto de los botones sale del catálogo.</p>
        <Row gap="sm">
          <Button variant="ghost">{t("actions.close")}</Button>
          <Button variant="primary">{t("actions.sign")}</Button>
        </Row>
      </Stack>
    </Card>
  );
}

const meta = {
  title: "Primitivos/DesignRoot",
  component: DesignRoot,
  parameters: {
    docs: {
      description: {
        component: [
          "La raíz obligatoria de todo lo que pintes con el sistema de diseño: carga el catálogo de textos en `language`, aplica el tema `theme` y pone la clase `rf-root`, de la que cuelgan la tipografía y el fondo.",
          "Úsala una sola vez, en lo más alto del árbol. Sin ella los componentes no tienen textos —ninguno lleva una cadena escrita en línea— y caen sobre el blanco del navegador.",
          "No la anides para cambiar de tema en una zona: pon `data-theme` en el elemento. No pintes texto de la interfaz fuera de ella.",
        ].join("\n\n"),
      },
    },
  },
  args: { language: "es", theme: "light", children: <Sample /> },
  argTypes: {
    language: { control: "select", options: LANGUAGES },
    theme: { control: "inline-radio", options: ["light", "dark"] },
    children: { control: false },
  },
} satisfies Meta<typeof DesignRoot>;

export default meta;

export const Light: StoryObj<typeof meta> = {};
export const Dark: StoryObj<typeof meta> = { args: { theme: "dark" } };
export const Catalan: StoryObj<typeof meta> = { args: { language: "ca" } };
