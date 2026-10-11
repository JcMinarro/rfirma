//! Si el hueco del visor enseña la bienvenida del arranque, todavía nada o ya el visor; la bienvenida no vuelve una vez que se va.

import { useState } from "react";
import type { Invocation } from "./App.useDropNotices";

type StartupScreen = "welcome" | "waiting" | "viewer";

/** Mientras se pregunta por la invocación no se pinta nada, para no enseñar la bienvenida debajo del documento que llega. */
export function useStartupWelcome(
  atStartup: boolean,
  invocation: Invocation,
  sessionStarted: boolean,
): StartupScreen {
  const [over, setOver] = useState(!atStartup);
  const ends = sessionStarted || invocation === "arrived";
  if (ends && !over) setOver(true);
  if (over || ends) return "viewer";
  return invocation === "asking" ? "waiting" : "welcome";
}
