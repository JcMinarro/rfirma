//! El diálogo nativo del PIN en macOS: una alerta de AppKit con campo seguro, modal sobre la ventana que lo pidió (ADR-0040, ADR-0047).

use std::ffi::CStr;
use std::sync::{mpsc, Arc, OnceLock};

use block2::RcBlock;
use objc2::rc::{autoreleasepool, Retained};
use objc2::MainThreadMarker;
use objc2_app_kit::{
    NSAlert, NSAlertFirstButtonReturn, NSModalResponse, NSSecureTextField, NSWindow,
};
use objc2_foundation::{NSPoint, NSRect, NSSize, NSString};

use super::localize;
use crate::identity::domain::protected_secret::ProtectedSecret;
use crate::identity::ports::{
    OriginWindow, SecretPromptError, SecretPromptRequest, SecretPrompter,
};

/// Lo que se lee en la alerta del PIN.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AlertTexts {
    pub message: String,
    pub informative: String,
    pub accept: &'static str,
    pub cancel: &'static str,
}

/// Cómo se cerró la alerta.
pub enum AlertAnswer {
    Typed(ProtectedSecret),
    Dismissed,
    Unavailable(String),
}

/// La ventana nativa que pide el secreto.
pub trait SecureAlert {
    /// Muestra la alerta, modal sobre `origin` si sigue montada, y espera a que se cierre.
    fn ask(&self, texts: AlertTexts, origin: Option<OriginWindow>) -> AlertAnswer;
}

/// Adaptador del puerto `SecretPrompter` sobre una alerta segura.
pub struct SecureAlertPrompter<A> {
    alert: A,
}

impl<A: SecureAlert> SecureAlertPrompter<A> {
    /// Pide los secretos con `alert`.
    pub fn over(alert: A) -> Self {
        Self { alert }
    }
}

impl<A: SecureAlert + Send + Sync> SecretPrompter for SecureAlertPrompter<A> {
    fn prompt_secret(
        &self,
        request: &SecretPromptRequest,
    ) -> Result<ProtectedSecret, SecretPromptError> {
        match self.alert.ask(texts_of(request), request.origin_window) {
            AlertAnswer::Typed(secret) => Ok(secret),
            AlertAnswer::Dismissed => Err(SecretPromptError::Cancelled),
            AlertAnswer::Unavailable(reason) => Err(SecretPromptError::Failed(reason)),
        }
    }
}

fn texts_of(request: &SecretPromptRequest) -> AlertTexts {
    let i18n = localize(request);
    let incorrect = request.incorrect_secret.then_some(i18n.incorrect_secret);
    let informative = [
        i18n.holder_name,
        i18n.id_number,
        incorrect,
        i18n.pin_warning,
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join("\n");
    AlertTexts {
        message: i18n.title,
        informative,
        accept: i18n.accept,
        cancel: i18n.cancel,
    }
}

/// El diálogo nativo del PIN en macOS.
pub type AppKitPinDialog = SecureAlertPrompter<AppKitAlert>;

impl AppKitPinDialog {
    /// Crea el diálogo pendiente de vincular al manejador de Tauri.
    pub fn new() -> Self {
        Self::over(AppKitAlert::default())
    }

    /// Vincula el manejador de la aplicación, tras montarse la ventana (ADR-0024).
    pub fn attach(&self, app: tauri::AppHandle) {
        let _ = self.alert.app.set(app);
    }
}

/// La alerta de AppKit, que corre en el hilo principal: hoja sobre la ventana de origen o, sin ella, modal de la aplicación.
#[derive(Clone, Default)]
pub struct AppKitAlert {
    app: Arc<OnceLock<tauri::AppHandle>>,
}

impl AppKitAlert {
    fn window_to_be_modal_over(&self, origin: Option<OriginWindow>) -> Option<Retained<NSWindow>> {
        use tauri::Manager as _;

        let window = self.app.get()?.get_webview_window(origin?.label())?;
        let pointer = window.ns_window().ok()?.cast::<NSWindow>();
        // SAFETY: Tauri entrega el `NSWindow` vivo de la ventana montada.
        unsafe { Retained::retain(pointer) }
    }
}

impl SecureAlert for AppKitAlert {
    fn ask(&self, texts: AlertTexts, origin: Option<OriginWindow>) -> AlertAnswer {
        if let Some(mtm) = MainThreadMarker::new() {
            return run_app_modal(&alert_with(mtm, &texts));
        }
        let Some(app) = self.app.get() else {
            return AlertAnswer::Unavailable("la ventana de rFirma aún no está montada".to_owned());
        };
        let (sender, receiver) = mpsc::channel();
        let this = self.clone();
        let scheduled = app.run_on_main_thread(move || {
            let Some(mtm) = MainThreadMarker::new() else {
                return;
            };
            let parts = alert_with(mtm, &texts);
            match this.window_to_be_modal_over(origin) {
                Some(parent) => begin_sheet(parts, &parent, sender),
                None => {
                    let _ = sender.send(run_app_modal(&parts));
                }
            }
        });
        if let Err(error) = scheduled {
            return AlertAnswer::Unavailable(error.to_string());
        }
        receiver.recv().unwrap_or(AlertAnswer::Dismissed)
    }
}

struct AlertParts {
    alert: Retained<NSAlert>,
    field: Retained<NSSecureTextField>,
}

fn alert_with(mtm: MainThreadMarker, texts: &AlertTexts) -> AlertParts {
    let alert = NSAlert::new(mtm);
    alert.setMessageText(&NSString::from_str(&texts.message));
    alert.setInformativeText(&NSString::from_str(&texts.informative));
    alert.addButtonWithTitle(&NSString::from_str(texts.accept));
    let cancel = alert.addButtonWithTitle(&NSString::from_str(texts.cancel));
    cancel.setKeyEquivalent(&NSString::from_str("\u{1b}"));

    let frame = NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(240.0, 24.0));
    let field = NSSecureTextField::initWithFrame(mtm.alloc(), frame);
    alert.setAccessoryView(Some(&field));
    alert.layout();
    alert.window().setInitialFirstResponder(Some(&field));
    AlertParts { alert, field }
}

fn run_app_modal(parts: &AlertParts) -> AlertAnswer {
    answer_of(parts.alert.runModal(), &parts.field)
}

fn begin_sheet(parts: AlertParts, parent: &NSWindow, sender: mpsc::Sender<AlertAnswer>) {
    let AlertParts { alert, field } = parts;
    let handler = RcBlock::new(move |response: NSModalResponse| {
        let _ = sender.send(answer_of(response, &field));
    });
    alert.beginSheetModalForWindow_completionHandler(parent, Some(&handler));
}

fn answer_of(response: NSModalResponse, field: &NSSecureTextField) -> AlertAnswer {
    let typed = emptied(field);
    if response == NSAlertFirstButtonReturn {
        AlertAnswer::Typed(typed)
    } else {
        AlertAnswer::Dismissed
    }
}

fn emptied(field: &NSSecureTextField) -> ProtectedSecret {
    let secret = autoreleasepool(|_| {
        let typed = field.stringValue();
        // SAFETY: `UTF8String` vive mientras `typed` y el pool que lo envuelve.
        ProtectedSecret::new(unsafe { CStr::from_ptr(typed.UTF8String()) }.to_bytes())
    });
    field.setStringValue(&NSString::from_str(""));
    secret
}

#[cfg(test)]
mod tests;
