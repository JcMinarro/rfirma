use super::*;
use crate::identity::domain::browsers::NssOwner;
use crate::identity::domain::error::Situation;

#[test]
fn one_or_two_attempts_left_stand_out_like_the_final_try_and_more_do_not() {
    assert!(PinWarning::FinalTry.stands_out());
    assert!(PinWarning::AttemptsLeft(1).stands_out());
    assert!(PinWarning::AttemptsLeft(2).stands_out());
    assert!(!PinWarning::AttemptsLeft(3).stands_out());
    assert!(!PinWarning::CountLow.stands_out());
    assert!(!PinWarning::Quiet.stands_out());
}

#[test]
fn no_attempts_left_is_a_locked_pin_and_any_other_warning_lets_the_dialog_open() {
    let locked = PinWarning::AttemptsLeft(0)
        .unless_locked()
        .expect_err("con cero no hay diálogo");
    assert_eq!(locked.situation(), Situation::PinLocked);
    assert_eq!(locked.attempts_left(), Some(0));

    for open in [
        PinWarning::AttemptsLeft(3),
        PinWarning::FinalTry,
        PinWarning::Quiet,
    ] {
        assert_eq!(open.unless_locked(), Ok(open));
    }
}

#[test]
fn a_store_that_asks_for_no_session_needs_no_secret() {
    assert_eq!(StoreSecret::of_token(false, false), StoreSecret::NotNeeded);
}

#[test]
fn a_store_that_asks_for_no_session_needs_no_secret_even_with_a_keypad() {
    assert_eq!(StoreSecret::of_token(false, true), StoreSecret::NotNeeded);
}

#[test]
fn a_store_that_asks_for_a_session_has_its_secret_typed_on_screen() {
    assert_eq!(
        StoreSecret::of_token(true, false),
        StoreSecret::TypedOnScreen
    );
}

#[test]
fn a_reader_with_its_own_keypad_is_told_apart_from_the_screen() {
    assert_eq!(
        StoreSecret::of_token(true, true),
        StoreSecret::TypedOnTheReaderKeypad
    );
}

#[test]
fn the_two_secrets_that_can_be_asked_for_are_admitted() {
    assert_eq!(
        StoreSecret::NotNeeded.admitted(),
        Ok(StoreSecret::NotNeeded)
    );
    assert_eq!(
        StoreSecret::TypedOnScreen.admitted(),
        Ok(StoreSecret::TypedOnScreen)
    );
}

#[test]
fn the_secret_of_a_reader_keypad_is_refused_instead_of_being_asked_on_screen() {
    assert_eq!(
        StoreSecret::TypedOnTheReaderKeypad.admitted(),
        Err(SecretOnTheReaderKeypad)
    );
}

#[test]
fn the_refusal_names_its_own_situation_and_says_why() {
    assert_eq!(
        SecretOnTheReaderKeypad.situation(),
        "secretOnTheReaderKeypad"
    );
    assert!(SecretOnTheReaderKeypad
        .to_string()
        .contains("teclado del lector"));
}

#[test]
fn a_module_asks_for_a_pin_and_every_store_that_is_a_file_asks_for_a_password() {
    assert_eq!(SecretName::of(StoreClass::Card), SecretName::Pin);
    assert_eq!(SecretName::of(StoreClass::Windows), SecretName::Pin);

    for class in [
        StoreClass::Browser(NssOwner::SharedChromium),
        StoreClass::Nssdb,
        StoreClass::Installed,
    ] {
        assert_eq!(SecretName::of(class), SecretName::Password);
    }
}
