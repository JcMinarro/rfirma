use std::path::{Path, PathBuf};
use std::sync::Mutex;

use super::super::local_ca_signal_of;
use crate::desktop::domain::status::{
    ActionKind, SignalDetail, SignalRow, StoreBrand, StoreDetail, Verdict,
};
use crate::site::adapters::MACOS_USER_TRUST;
use crate::site::application::tests::InMemoryCaSlots;
use crate::site::application::trust::{measure_local_ca_trust, refresh_local_ca_trust};
use crate::site::domain::local_ca::{ChannelMark, LocalCa};
use crate::site::domain::trust::{Moment, TRUSTED_SSL_CA};
use crate::site::domain::trust_error::{Situation, TrustError};
use crate::site::ports::{LocalCaSlots, TrustStores};

/// La confianza de la persona usuaria de macOS, con su diálogo de contraseña aceptado o cancelado.
struct UserTrust {
    password_given: bool,
    trusted: Mutex<Vec<Vec<u8>>>,
}

impl UserTrust {
    fn accepting() -> Self {
        Self {
            password_given: true,
            trusted: Mutex::new(Vec::new()),
        }
    }

    fn cancelling() -> Self {
        Self {
            password_given: false,
            ..Self::accepting()
        }
    }
}

impl TrustStores for UserTrust {
    fn install(&self, _profile: &Path, der: &[u8], _nickname: &str) -> Result<(), TrustError> {
        if !self.password_given {
            return Err(TrustError::new(
                Situation::TrustNotWritten,
                "se ha cancelado el diálogo de contraseña de macOS",
            ));
        }
        crate::lock(&self.trusted).push(der.to_vec());
        Ok(())
    }

    fn trust_of(&self, _profile: &Path, der: &[u8]) -> Result<Option<u32>, TrustError> {
        Ok(crate::lock(&self.trusted)
            .iter()
            .any(|trusted| trusted == der)
            .then_some(TRUSTED_SSL_CA))
    }

    fn withdraw(&self, _profile: &Path, der: &[u8]) -> Result<(), TrustError> {
        crate::lock(&self.trusted).retain(|trusted| trusted != der);
        Ok(())
    }

    fn local_cas(&self, _profile: &Path) -> Result<Vec<Vec<u8>>, TrustError> {
        Ok(crate::lock(&self.trusted).clone())
    }
}

fn the_macos_user_trust() -> [PathBuf; 1] {
    [PathBuf::from(MACOS_USER_TRUST)]
}

fn installed_then_measured(slots: &InMemoryCaSlots, trust: &UserTrust) -> SignalRow {
    let profiles = the_macos_user_trust();
    let _ = refresh_local_ca_trust(
        slots,
        &profiles,
        trust,
        Moment::Startup,
        ChannelMark::Native,
    );
    let readings =
        measure_local_ca_trust(slots, &profiles, trust).expect("las ranuras en memoria se leen");
    local_ca_signal_of(readings, |_| None, false)
}

fn the_macos_store(trusted: bool) -> Option<SignalDetail> {
    Some(SignalDetail::Trust {
        stores: vec![StoreDetail {
            brand: StoreBrand::Macos,
            trusted,
        }],
    })
}

#[test]
fn installing_with_the_password_given_shows_the_macos_store_trusting_the_local_ca() {
    let signal = installed_then_measured(&InMemoryCaSlots::default(), &UserTrust::accepting());

    assert_eq!(signal.detail, the_macos_store(true));
    assert_eq!(signal.verdict, Verdict::Correct);
    assert_eq!(signal.action, None);
}

#[test]
fn cancelling_the_password_dialog_leaves_the_local_ca_not_installed_and_offers_to_install_it() {
    let signal = installed_then_measured(&InMemoryCaSlots::default(), &UserTrust::cancelling());

    assert_eq!(signal.detail, the_macos_store(false));
    assert_eq!(signal.verdict, Verdict::Incorrect);
    assert_eq!(
        signal.action.map(|action| action.kind),
        Some(ActionKind::Repair)
    );
}

#[test]
fn an_expired_local_ca_is_replaced_and_the_macos_store_trusts_the_new_one() {
    let slots = InMemoryCaSlots::default();
    let trust = UserTrust::accepting();
    let expired = LocalCa::expired_for_test().expect("se fabrica una CA caducada");
    slots
        .write_serving(&expired)
        .expect("las ranuras en memoria se escriben");

    let signal = installed_then_measured(&slots, &trust);

    let serving = slots
        .serving()
        .expect("se lee")
        .expect("hay una CA vigente");
    assert_eq!(signal.detail, the_macos_store(true));
    assert_ne!(der_of(&serving), der_of(&expired));
}

fn der_of(ca: &LocalCa) -> Vec<u8> {
    ca.certificate().to_der().expect("sale en DER")
}
