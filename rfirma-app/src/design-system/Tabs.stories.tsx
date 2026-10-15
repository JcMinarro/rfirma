//! La historia de `Tabs`: una tira de pestañas de las que la persona activa una, con otra bloqueada.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Tab, Tabs, type TabsProps } from "./Tabs";

function TabsDemo({
  withDisabled,
  variant,
}: {
  withDisabled: boolean;
  variant: NonNullable<TabsProps["variant"]>;
}) {
  const [active, setActive] = useState("solicitud");
  const names = ["solicitud", "memoria", "anexo"];
  return (
    <Tabs aria-label="Documentos abiertos" variant={variant}>
      {names.map((name) => (
        <Tab
          key={name}
          selected={name === active}
          disabled={withDisabled && name === "anexo"}
          onClick={() => setActive(name)}
        >
          {name}.pdf
        </Tab>
      ))}
    </Tabs>
  );
}

const meta = {
  title: "Primitivos/Tabs",
  component: TabsDemo,
  parameters: {
    docs: {
      description: {
        component: [
          'Las pestañas del sistema de diseño: un `role="tablist"` con sus `Tab`, recorridas con las flechas.',
          "Úsalas para alternar entre vistas hermanas de un mismo contenido. Para acciones, `Button` o `Menu`.",
          "La variante `underline` marca la elegida con una raya debajo, sin fondo: para pestañas dentro de un panel, no sobre él.",
          "No les pongas `role`, `tabIndex` ni `aria-selected`: los fijan ellas. No marques más de una `Tab` como `selected`.",
        ].join("\n\n"),
      },
    },
  },
  args: { withDisabled: false, variant: "default" },
  argTypes: {
    withDisabled: { control: "boolean" },
    variant: {
      control: "inline-radio",
      options: ["default", "underline"],
      description: "`default`, con fondo en la elegida; `underline`, con raya debajo y sin fondo.",
    },
  },
} satisfies Meta<typeof TabsDemo>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
export const WithDisabledTab: StoryObj<typeof meta> = { args: { withDisabled: true } };
export const Underline: StoryObj<typeof meta> = {
  args: { variant: "underline" },
  parameters: {
    docs: {
      description: {
        story: "La elegida lleva una raya debajo y ninguna lleva fondo.",
      },
    },
  },
};
