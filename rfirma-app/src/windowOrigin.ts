//! Si la ventana de sede la abrió una orden de terminal (`-certgui`) y no una sede, según el `origin` de su URL.

/** `sede.html?origin=terminal` es la ventana de `-certgui`. */
export function openedByTerminal(search: string = window.location.search): boolean {
  return new URLSearchParams(search).get("origin") === "terminal";
}
