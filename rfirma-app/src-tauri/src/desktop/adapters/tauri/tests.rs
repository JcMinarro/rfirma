use super::*;

#[test]
fn a_trust_profile_takes_its_brand_from_its_discovered_owner_and_not_from_its_path() {
    use crate::identity::domain::browsers::{browser_named, BrowserChannel, NssOwner};

    let librewolf = NssOwner::Browser {
        browser: browser_named("LibreWolf").expect("LibreWolf esta en la tabla"),
        channel: BrowserChannel::Flatpak,
    };
    let anywhere = std::path::Path::new("/casa/ada/perfil");
    let firefox_like = std::path::Path::new("/casa/ada/.mozilla/firefox/perfil");

    assert_eq!(
        brand_of(anywhere, Some(librewolf)),
        StoreBrand::Browser {
            name: "LibreWolf".to_owned(),
            channel: Some("Flatpak".to_owned())
        }
    );
    assert_eq!(
        brand_of(anywhere, Some(NssOwner::SharedChromium)),
        StoreBrand::SharedChromium
    );
    assert_eq!(brand_of(firefox_like, None), StoreBrand::Nssdb);
    assert_eq!(
        brand_of(
            std::path::Path::new(crate::site::adapters::SYSTEM_ROOT_STORE),
            None
        ),
        StoreBrand::Windows
    );
}

#[test]
fn a_card_and_an_installed_p12_are_each_their_own_brand() {
    assert_eq!(brand_of_class(StoreClass::Card), StoreBrand::Card);
    assert_eq!(brand_of_class(StoreClass::Installed), StoreBrand::Installed);
}

#[test]
fn the_windows_personal_store_is_the_windows_brand() {
    assert_eq!(brand_of_class(StoreClass::Windows), StoreBrand::Windows);
}

#[test]
fn every_installation_outcome_crosses_as_its_own_view() {
    use crate::desktop::domain::installation::Installation;

    let crossed = [
        Installation::Installed,
        Installation::NoUpdate,
        Installation::NetworkFailure,
        Installation::InvalidSignature,
        Installation::NotAvailable,
    ]
    .map(InstallationView::from);

    assert_eq!(
        crossed,
        [
            InstallationView::Installed,
            InstallationView::NoUpdate,
            InstallationView::NetworkFailure,
            InstallationView::InvalidSignature,
            InstallationView::NotAvailable,
        ]
    );
}
