//! Marcas de almacén de navegador para historias y pruebas.

import type { BrowserStoreMark } from "../storeMark";

export function browserStore(name: string, channel: string | null = null): BrowserStoreMark {
  return { browser: { name, channel } };
}
