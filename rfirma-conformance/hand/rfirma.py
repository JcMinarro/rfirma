"""La mano de la suite sobre rFirma: pulsa por AT-SPI lo que el plan dice, solo en el rFirma del perfil aislado."""

import argparse
import sys
import time

import gi

gi.require_version("Atspi", "2.0")
from gi.repository import Atspi  # noqa: E402

PIN = "1234"
PRIMARY = [
    "Cerrar",
    "Firmar",
    "Enviar mis datos",
    "Aceptar",
    "Continuar",
    "Firmar solo esta vez",
]
CANCEL = "Cancelar"
SITE_WINDOW = "rFirma"


def say(line):
    print(line, flush=True)


def home_of(pid):
    try:
        with open(f"/proc/{pid}/environ", "rb") as environ:
            for entry in environ.read().split(b"\0"):
                if entry.startswith(b"HOME="):
                    return entry[5:].decode()
    except OSError:
        return None
    return None


def our_apps(home):
    desktop = Atspi.get_desktop(0)
    for index in range(desktop.get_child_count()):
        app = desktop.get_child_at_index(index)
        if (
            app is not None
            and app.get_name() == "rfirma"
            and home_of(app.get_process_id()) == home
        ):
            yield app


def walk(node):
    yield node
    for index in range(node.get_child_count()):
        child = node.get_child_at_index(index)
        if child is not None:
            yield from walk(child)


def text_of(node):
    text = node.get_text_iface()
    if not text:
        return ""
    return Atspi.Text.get_text(text, 0, Atspi.Text.get_character_count(text)).strip()


def buttons_in(node):
    return {
        button.get_name(): button
        for button in walk(node)
        if button.get_role_name() in ("button", "push button") and button.get_name()
    }


def screens(home):
    """Cada ventana del cliente: si es la de sede o un diálogo GTK, sus textos, botones y campos de contraseña."""
    for app in our_apps(home):
        for index in range(app.get_child_count()):
            window = app.get_child_at_index(index)
            if window is None:
                continue
            page = next(
                (
                    node
                    for node in walk(window)
                    if node.get_role_name() == "document web"
                ),
                None,
            )
            scope = page if page is not None else window
            if any(node.get_role_name() == "file chooser" for node in walk(window)):
                yield "fichero", [], {}, []
                continue
            texts = [
                text_of(node)
                for node in walk(scope)
                if node.get_role_name() in ("paragraph", "heading", "label", "section")
            ]
            fields = [
                node for node in walk(window) if node.get_role_name() == "password text"
            ]
            yield (
                ("ventana" if page is not None else "diálogo"),
                [t for t in texts if t],
                buttons_in(scope),
                fields,
            )


def close(kind, texts, buttons, elapsed, pressed):
    return "Cerrar" if "Cerrar" in buttons else None


def consent(kind, texts, buttons, elapsed, pressed):
    if kind == "fichero":
        return None
    return next((name for name in PRIMARY if name in buttons), None)


def cancel_first(kind, texts, buttons, elapsed, pressed):
    if CANCEL in buttons:
        return CANCEL
    return consent(kind, texts, buttons, elapsed, pressed)


def cancel_after_consent(kind, texts, buttons, elapsed, pressed):
    consented = any(
        choice in ("Firmar", "Aceptar", "Enviar mis datos") for choice in pressed
    )
    if consented and CANCEL in buttons:
        return CANCEL
    return consent(kind, texts, buttons, elapsed, pressed)


def cancel_once_then_consent(kind, texts, buttons, elapsed, pressed):
    if CANCEL not in pressed and CANCEL in buttons and "Firmar" not in buttons:
        return CANCEL
    return consent(kind, texts, buttons, elapsed, pressed)


def wait_then_consent(kind, texts, buttons, elapsed, pressed):
    return consent(kind, texts, buttons, elapsed, pressed) if elapsed > 25 else None


PLANS = {
    "close": close,
    "consent": consent,
    "cancel_first": cancel_first,
    "cancel_after_consent": cancel_after_consent,
    "cancel_once_then_consent": cancel_once_then_consent,
    "wait_then_consent": wait_then_consent,
}


def run(home, plan):
    start = time.monotonic()
    pressed, last_seen = [], None
    while True:
        time.sleep(0.4)
        try:
            for kind, texts, buttons, fields in list(screens(home)):
                elapsed = time.monotonic() - start
                choice = plan(kind, texts, list(buttons), elapsed, pressed)
                seen = (kind, tuple(texts[:2]), tuple(buttons), choice)
                if seen != last_seen:
                    last_seen = seen
                    shown = " · ".join(texts[:2]) or "sin texto"
                    say(
                        f"mano: {kind} «{shown}» con {list(buttons)} → {choice or 'no toca nada'}"
                    )
                if choice not in buttons:
                    continue
                for field in fields:
                    Atspi.EditableText.set_text_contents(
                        field.get_editable_text_iface(), PIN
                    )
                Atspi.Action.do_action(buttons[choice].get_action_iface(), 0)
                pressed.append(choice)
                time.sleep(0.8)
                break
        except Exception as error:
            say(f"mano: AT-SPI falló al mirar la ventana: {error}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--home", required=True)
    parser.add_argument("--plan", required=True, choices=sorted(PLANS))
    arguments = parser.parse_args()
    say(f"mano: plan «{arguments.plan}» sobre el rFirma de {arguments.home}")
    run(arguments.home.rstrip("/"), PLANS[arguments.plan])


if __name__ == "__main__":
    sys.exit(main())
