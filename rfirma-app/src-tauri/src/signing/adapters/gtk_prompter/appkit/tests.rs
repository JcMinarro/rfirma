use std::sync::Mutex;

use super::{AlertAnswer, AlertTexts, SecureAlert, SecureAlertPrompter};
use crate::identity::domain::holder::PromptedHolder;
use crate::identity::domain::protected_secret::ProtectedSecret;
use crate::identity::domain::secret::{PinWarning, SecretName};
use crate::identity::ports::{
    OriginWindow, SecretPromptError, SecretPromptRequest, SecretPrompter,
};
use crate::signing::domain::Language;

struct ScriptedAlert {
    answer: Mutex<Option<AlertAnswer>>,
    shown: Mutex<Vec<(AlertTexts, Option<OriginWindow>)>>,
}

impl ScriptedAlert {
    fn answering(answer: AlertAnswer) -> Self {
        Self {
            answer: Mutex::new(Some(answer)),
            shown: Mutex::new(Vec::new()),
        }
    }

    fn shown(&self) -> (AlertTexts, Option<OriginWindow>) {
        self.shown
            .lock()
            .unwrap()
            .pop()
            .expect("deberia haberse mostrado")
    }
}

impl SecureAlert for ScriptedAlert {
    fn ask(&self, texts: AlertTexts, origin: Option<OriginWindow>) -> AlertAnswer {
        self.shown.lock().unwrap().push((texts, origin));
        self.answer
            .lock()
            .unwrap()
            .take()
            .expect("una sola respuesta")
    }
}

fn a_pin_request() -> SecretPromptRequest {
    SecretPromptRequest {
        secret: SecretName::Pin,
        holder: Some(PromptedHolder {
            name: "JUAN PEREZ".to_string(),
            id_number: "IDCES-12345678Z".to_string(),
        }),
        language: Language::Spanish,
        incorrect_secret: false,
        pin_warning: PinWarning::Quiet,
        origin_window: Some(OriginWindow::Site),
    }
}

#[test]
fn a_dismissed_alert_is_a_cancellation_not_a_failure() {
    let prompter = SecureAlertPrompter::over(ScriptedAlert::answering(AlertAnswer::Dismissed));

    let answer = prompter.prompt_secret(&a_pin_request());

    assert_eq!(answer, Err(SecretPromptError::Cancelled));
}

#[test]
fn the_typed_pin_comes_back_as_the_protected_secret() {
    let typed = ProtectedSecret::from_str("1234");
    let prompter = SecureAlertPrompter::over(ScriptedAlert::answering(AlertAnswer::Typed(typed)));

    let secret = prompter
        .prompt_secret(&a_pin_request())
        .expect("PIN escrito");

    assert_eq!(secret.as_str(), Ok("1234"));
}

#[test]
fn an_alert_that_cannot_open_fails_with_its_reason() {
    let prompter = SecureAlertPrompter::over(ScriptedAlert::answering(AlertAnswer::Unavailable(
        "sin ventana".to_string(),
    )));

    let answer = prompter.prompt_secret(&a_pin_request());

    assert_eq!(
        answer,
        Err(SecretPromptError::Failed("sin ventana".to_string()))
    );
}

#[test]
fn the_alert_asks_for_the_pin_of_the_holder_over_the_window_that_asked() {
    let alert = ScriptedAlert::answering(AlertAnswer::Dismissed);
    let prompter = SecureAlertPrompter::over(alert);

    let _ = prompter.prompt_secret(&a_pin_request());
    let (texts, origin) = prompter.alert.shown();

    assert_eq!(texts.message, "Introduce el PIN");
    assert_eq!(texts.informative, "JUAN PEREZ\nIDCES-12345678Z");
    assert_eq!(texts.accept, "Aceptar");
    assert_eq!(texts.cancel, "Cancelar");
    assert_eq!(origin, Some(OriginWindow::Site));
}

#[test]
fn a_card_on_its_final_try_is_warned_and_a_wrong_pin_is_said_again() {
    let alert = ScriptedAlert::answering(AlertAnswer::Dismissed);
    let prompter = SecureAlertPrompter::over(alert);
    let mut request = a_pin_request();
    request.holder = None;
    request.incorrect_secret = true;
    request.pin_warning = PinWarning::FinalTry;

    let _ = prompter.prompt_secret(&request);
    let (texts, _) = prompter.alert.shown();

    assert_eq!(texts.informative, "PIN incorrecto. Vuelve a intentarlo.");
    assert_eq!(
        texts.highlighted.as_deref(),
        Some("Último intento: si el PIN no es correcto, la tarjeta se bloqueará.")
    );
}

#[test]
fn one_or_two_attempts_left_stand_out_beside_the_field_and_three_stay_in_the_text() {
    for (left, stands_out) in [(1, true), (2, true), (3, false)] {
        let alert = ScriptedAlert::answering(AlertAnswer::Dismissed);
        let prompter = SecureAlertPrompter::over(alert);
        let mut request = a_pin_request();
        request.holder = None;
        request.pin_warning = PinWarning::AttemptsLeft(left);

        let _ = prompter.prompt_secret(&request);
        let (texts, _) = prompter.alert.shown();

        assert_eq!(texts.highlighted.is_some(), stands_out, "{left}: {texts:?}");
        assert_eq!(
            texts.informative.is_empty(),
            stands_out,
            "{left}: {texts:?}"
        );
    }
}
