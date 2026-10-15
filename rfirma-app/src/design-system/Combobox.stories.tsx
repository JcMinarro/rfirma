//! La historia de `Combobox`: la lista con buscador cerrada y abierta por arg, con dos grupos, una opción deshabilitada y opciones de dos líneas.

import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Combobox, type ComboboxOption } from "./Combobox";

interface Office {
  name: string;
  region: string;
}

const offices: ComboboxOption<Office>[] = [
  { name: "Ávila", region: "Castilla y León" },
  { name: "Burgos", region: "Castilla y León" },
  { name: "León", region: "Castilla y León" },
  { name: "A Coruña", region: "Galicia" },
  { name: "Lugo", region: "Galicia" },
].map((office) => ({
  id: office.name,
  item: office,
  keywords: [office.name, office.region],
  group: office.region,
  disabled: office.name === "León",
}));

function ComboboxDemo({ defaultOpen, opens }: { defaultOpen: boolean; opens: "down" | "up" }) {
  const [chosen, setChosen] = useState<Office | null>(offices[1]?.item ?? null);
  return (
    <div style={{ minWidth: 320, paddingTop: opens === "up" ? 360 : 0 }}>
      <Combobox
        key={`${defaultOpen}-${opens}`}
        label="Oficina"
        options={offices}
        value={chosen?.name ?? null}
        onChange={setChosen}
        renderOption={(office) => (
          <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span>{office.name}</span>
            <small className="rf-text-muted">{office.region}</small>
          </span>
        )}
        searchPlaceholder="Oficina o comunidad"
        emptyMessage="Ninguna oficina coincide"
        countLabel={(shown, total) => `${shown} de ${total}`}
        defaultOpen={defaultOpen}
        opens={opens}
      >
        {chosen === null ? <span className="rf-text-muted">Elige una oficina</span> : chosen.name}
      </Combobox>
    </div>
  );
}

const meta = {
  title: "Primitivos/Combobox",
  component: ComboboxDemo,
  parameters: {
    docs: {
      description: {
        component: [
          "Una lista desplegable con buscador: caja cerrada, buscador al abrirla, filtrado que ignora tildes, grupos y teclado completo.",
          "Úsala cuando hay que elegir una opción entre muchas y conviene buscar. Para pocas opciones de texto fijo, `Select`.",
          "No escribas los textos en línea: llegan del catálogo de quien la usa. No metas acciones dentro de una opción: elegirla es la única acción.",
        ].join("\n\n"),
      },
    },
  },
  args: { defaultOpen: false, opens: "down" },
  argTypes: {
    defaultOpen: { control: "boolean" },
    opens: { control: "inline-radio", options: ["down", "up"] },
  },
} satisfies Meta<typeof ComboboxDemo>;

export default meta;

export const Closed: StoryObj<typeof meta> = {};
export const Open: StoryObj<typeof meta> = { args: { defaultOpen: true } };
export const OpenUp: StoryObj<typeof meta> = { args: { defaultOpen: true, opens: "up" } };
