use std::path::Path;

use super::super::{listed_rows, rows_of, ListedCertificates};
use super::{StoresWith, CARD, INSTALLED, SOFTOKEN};
use crate::identity::application::readers::LastListing;
use crate::identity::application::tests::{
    a_firefox_class, a_firefox_profile_store, NoMemory, TestAuthority,
};
use crate::identity::domain::certificate::{CertificateRef, ListedCertificate, TokenCertificate};
use crate::identity::domain::store::{Store, StoreClass};

fn the_macos_store() -> Store {
    Store::module("keychain:search-list")
}

fn in_the_keychain(label: &str, der: &[u8]) -> TokenCertificate {
    TokenCertificate::new(
        CertificateRef::new(
            the_macos_store(),
            "Keychain",
            label,
            label.as_bytes().to_vec(),
        ),
        der.to_vec(),
    )
}

fn a_copy_in(store: &Store, label: &str, der: &[u8]) -> TokenCertificate {
    TokenCertificate::new(
        CertificateRef::new(store.clone(), "rfirma-test", label, vec![0x01]),
        der.to_vec(),
    )
}

/// El Almacén de rFirma en `directory`, con su base ya creada.
fn the_installed_store(directory: &Path) -> Store {
    std::fs::create_dir_all(directory).expect("deberia crearse el almacen");
    std::fs::write(directory.join("cert9.db"), b"").expect("deberia crearse la base");
    Store::installed_nss(INSTALLED, directory)
}

fn listed_on_the_mac(
    found: &[TokenCertificate],
    stores: &[Store],
    home: &Path,
) -> Vec<ListedCertificate> {
    listed_rows(
        &StoresWith::holding(found.to_vec(), found.to_vec()),
        stores,
        &home.join("certificates"),
        &ListedCertificates::new(),
        &ListedCertificates::new(),
        &NoMemory,
        &LastListing::default(),
    )
    .expect("los almacenes deberian listarse")
}

#[test]
fn a_keychain_certificate_with_its_key_in_software_is_in_the_macos_store() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let found = [in_the_keychain(
        "EN-SOFTWARE",
        &TestAuthority::root("EN SOFTWARE").der(),
    )];

    let rows = listed_on_the_mac(&found, &[the_macos_store()], home.path());

    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].store, StoreClass::Macos);
}

#[test]
fn the_macos_store_comes_after_the_card_and_before_the_rfirma_store_and_the_nss_ones() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let der = TestAuthority::root("EIDAS CERTIFICADO PRUEBAS - 99999999R").der();
    let firefox = a_firefox_profile_store(SOFTOKEN, "/Users/ada/Library/Firefox/perfil");
    let system_nss = Store::nss(SOFTOKEN, Path::new("/Users/ada/.pki/otro"));
    let installed = the_installed_store(&home.path().join("certificates"));
    let card = Store::module(CARD);
    let found = [
        a_copy_in(&firefox, "COPIA-FIREFOX", &der),
        a_copy_in(&system_nss, "COPIA-NSS", &der),
        a_copy_in(&installed, "COPIA-RFIRMA", &der),
        in_the_keychain("COPIA-LLAVERO", &der),
        a_copy_in(&card, "COPIA-TARJETA", &der),
    ];

    let rows = rows_of(
        found.to_vec(),
        &home.path().join("certificates"),
        &ListedCertificates::new(),
        &ListedCertificates::new(),
        &NoMemory,
    );

    assert_eq!(
        rows[0].stores,
        vec![
            StoreClass::Card,
            StoreClass::Macos,
            StoreClass::Installed,
            StoreClass::Nssdb,
            a_firefox_class(),
        ]
    );
}

#[test]
fn without_a_card_the_macos_copy_is_the_one_behind_the_row() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let der = TestAuthority::root("EIDAS CERTIFICADO PRUEBAS - 99999999R").der();
    let firefox = a_firefox_profile_store(SOFTOKEN, "/Users/ada/Library/Firefox/perfil");
    let found = [
        a_copy_in(&firefox, "COPIA-FIREFOX", &der),
        in_the_keychain("COPIA-LLAVERO", &der),
    ];

    let rows = listed_on_the_mac(&found, &[firefox, the_macos_store()], home.path());

    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].store, StoreClass::Macos);
}
