use std::path::Path;

use crate::identity::domain::browsers::{browser_named, BrowserChannel, NssOwner};
use crate::site::domain::local_ca::{ChannelMark, LocalCa};

use super::*;

#[test]
fn a_discarded_module_says_why_without_being_probed() {
    let reasons = [
        (
            p11kit::DiscardReason::DisabledInRfirma,
            DiscardReason::DisabledInRfirma,
        ),
        (
            p11kit::DiscardReason::EnabledOnlyElsewhere,
            DiscardReason::EnabledOnlyElsewhere,
        ),
        (
            p11kit::DiscardReason::TrustPolicy,
            DiscardReason::TrustPolicy,
        ),
        (
            p11kit::DiscardReason::MissingModule,
            DiscardReason::MissingModule,
        ),
    ];

    for (found, reported) in reasons {
        assert_eq!(
            module_status(Some(Path::new("/nonexistent/libnothing.so")), Some(found)),
            ModuleStatus::Discarded(reported)
        );
    }
}

#[test]
fn a_module_without_a_library_does_not_load() {
    assert_eq!(module_status(None, None), ModuleStatus::DoesNotLoad);
}

#[test]
fn a_module_whose_library_does_not_exist_does_not_load() {
    assert_eq!(
        module_status(Some(Path::new("/nonexistent/libnothing.so")), None),
        ModuleStatus::DoesNotLoad
    );
}

#[test]
fn without_a_serving_local_ca_there_is_no_expiry() {
    let directory = tempfile::tempdir().expect("deberia haber directorio temporal");

    assert_eq!(
        local_ca_expiry(&LocalCaStore::of(&Paths::under(directory.path()))),
        None
    );
}

#[test]
fn the_expiry_of_the_serving_local_ca_is_the_day_its_certificate_ends() {
    let directory = tempfile::tempdir().expect("deberia haber directorio temporal");
    let store = LocalCaStore::of(&Paths::under(directory.path()));
    let ca = LocalCa::generate(ChannelMark::Native).expect("deberia generarse");
    store.write(&ca).expect("deberia guardarse");

    let expiry = local_ca_expiry(&store).expect("la CA vigente tiene caducidad");

    let day = expiry.replace('-', "");
    let first_second = Asn1Time::from_str(&format!("{day}000000Z")).expect("fecha valida");
    let last_second = Asn1Time::from_str(&format!("{day}235959Z")).expect("fecha valida");
    let not_after = ca.certificate().not_after();
    assert!(&*first_second <= not_after && not_after <= &*last_second);
}

fn owned_by(name: &str, channel: BrowserChannel) -> NssOwner {
    NssOwner::Browser {
        browser: browser_named(name).expect("el navegador esta en la tabla"),
        channel,
    }
}

#[test]
fn a_firefox_family_store_is_named_after_its_family_and_channel() {
    assert_eq!(
        browser_of(owned_by("Firefox", BrowserChannel::Native)),
        "Firefox"
    );
    assert_eq!(
        browser_of(owned_by("Firefox", BrowserChannel::Snap)),
        "Firefox snap"
    );
    assert_eq!(
        browser_of(owned_by("LibreWolf", BrowserChannel::Flatpak)),
        "Firefox flatpak"
    );
}

#[test]
fn a_chromium_family_store_is_named_chrome_with_its_channel() {
    assert_eq!(browser_of(NssOwner::SharedChromium), "Chrome");
    assert_eq!(
        browser_of(owned_by("Brave", BrowserChannel::Flatpak)),
        "Chrome flatpak"
    );
}
