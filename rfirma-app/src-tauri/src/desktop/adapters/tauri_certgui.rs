//! Las órdenes de la ventana de sede de `-certgui`, que solo registra el proceso de terminal; ninguna firma.

use std::sync::Arc;

use tauri::{Manager as _, State};

use super::site_window_picker::{SecretDialog, TerminalChoice, TERMINAL_WINDOW};
use super::views::TerminalChoiceView;
use crate::crossing::Failure;
use crate::identity::adapters::views::SecretView;
use crate::identity::domain::secret::StoreSecret;
use crate::signing::adapters::views::ConfigurationView;

/// La configuración guardada, para el idioma y el tema; sin carpeta personal, la de por omisión.
#[tauri::command]
pub fn read_terminal_configuration(
    configuration: State<'_, Option<ConfigurationView>>,
) -> ConfigurationView {
    configuration.inner().clone().unwrap_or_else(|| {
        crate::signing::application::configuration::shown(
            &Default::default(),
            std::path::Path::new(""),
        )
        .into()
    })
}

/// El documento de la orden y lo que la ventana enseña.
#[tauri::command(async)]
pub fn read_terminal_choice(choice: State<'_, Arc<TerminalChoice>>) -> TerminalChoiceView {
    choice.view()
}

/// Elige el certificado del asa y, si pide PIN, lo pide con el diálogo del sistema; con la elección hecha, cierra la ventana.
#[tauri::command(async)]
pub fn terminal_choose_certificate(
    certificate: String,
    choice: State<'_, Arc<TerminalChoice>>,
    dialog: State<'_, SecretDialog>,
    app_handle: tauri::AppHandle,
) -> Result<SecretView, Failure> {
    let secret = choice.choose(&certificate)?;
    if secret == StoreSecret::TypedOnScreen {
        choice.ask_the_secret(&dialog)?;
    }
    if choice.is_decided() {
        close_the_window(&app_handle);
    }
    Ok(secret.into())
}

/// Cancela la elección y cierra la ventana.
#[tauri::command(async)]
pub fn terminal_cancel(choice: State<'_, Arc<TerminalChoice>>, app_handle: tauri::AppHandle) {
    choice.cancel();
    close_the_window(&app_handle);
}

fn close_the_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window(TERMINAL_WINDOW) {
        let _ = window.close();
    }
}
