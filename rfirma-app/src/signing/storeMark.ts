//! La marca de un almacén NSS de navegador, tal como cruza desde el backend, y cómo se compone su nombre. Sin React.

/** El almacén NSS de un navegador: su nombre propio y el canal por el que llegó, que en nativo no hay. */
export interface BrowserStoreMark {
  browser: { name: string; channel: string | null };
}

/** Si la marca es el almacén de un navegador concreto. */
export function isBrowserStoreMark(mark: unknown): mark is BrowserStoreMark {
  return typeof mark === "object" && mark !== null && "browser" in mark;
}

/** «Brave · Flatpak», o «Firefox» en nativo: nombres propios, sin clave de i18n. */
export function browserStoreLabel({ browser }: BrowserStoreMark): string {
  return browser.channel === null ? browser.name : `${browser.name} · ${browser.channel}`;
}
