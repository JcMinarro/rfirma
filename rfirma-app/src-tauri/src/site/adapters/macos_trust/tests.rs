use std::path::PathBuf;

use super::*;
use crate::site::domain::local_ca::{ChannelMark, LocalCa};

fn a_local_ca() -> Vec<u8> {
    LocalCa::generate(ChannelMark::Native)
        .expect("una CA local")
        .certificate()
        .to_der()
        .expect("en DER")
}

#[test]
fn the_trust_profile_is_the_user_trust() {
    assert_eq!(trust_profiles(), vec![PathBuf::from(MACOS_USER_TRUST)]);
}

#[test]
fn a_path_that_is_not_the_user_trust_is_unreachable_without_asking_for_the_password() {
    let error = MacosUserTrust
        .install(Path::new("/perfiles/firefox"), &a_local_ca(), "rFirma")
        .expect_err("solo existe la confianza de la persona usuaria");

    assert_eq!(error.situation(), Situation::StoreUnreachable);
}

#[test]
fn a_local_ca_never_installed_is_not_trusted() {
    let reading = MacosUserTrust
        .trust_of(Path::new(MACOS_USER_TRUST), &a_local_ca())
        .expect("leer la confianza no pide contraseña");

    assert_eq!(reading, None);
}

#[test]
fn a_cancelled_password_dialog_is_told_apart_from_a_failure() {
    let cancelled = refused_or_failed(Situation::TrustNotWritten, "paso", AUTHORIZATION_CANCELED);
    let failed = refused_or_failed(Situation::TrustNotWritten, "paso", -25300);

    assert_eq!(
        cancelled.detail(),
        "se ha cancelado el diálogo de contraseña de macOS"
    );
    assert_eq!(
        failed.detail(),
        "Security.framework ha fallado en paso (código -25300)"
    );
}
