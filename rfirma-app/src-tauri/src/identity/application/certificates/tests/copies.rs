use std::path::Path;

use super::super::{
    certificate_behind, remember_the_certificate, remove_installed, rows_of, ListedCertificates,
    RemovalListing,
};
use super::removal::{FixedPinKeyring, RemovalOutcome};
use super::{CARD, INSTALLED, SOFTOKEN};
use crate::identity::application::tests::{a_certificate_with_id, a_firefox_class, TestAuthority};
use crate::identity::domain::browsers::{browser_named, BrowserChannel, NssOwner};
use crate::identity::domain::certificate::{CertificateRef, TokenCertificate};
use crate::identity::domain::store::{Store, StoreClass};
use crate::signing::application::tests::a_memory;

#[test]
fn twin_copies_of_one_certificate_in_one_token_are_one_row_behind_the_first() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let der = TestAuthority::root("GEMELO").der();
    let certificates = [
        a_certificate_with_id("FNMT-ACTIVO-99999999R", 0x01, &der),
        a_certificate_with_id("FNMT-GEMELO-99999999R", 0x04, &der),
    ];
    let listed = ListedCertificates::new();

    let rows = rows_of(
        certificates.to_vec(),
        &home.path().join("certificates"),
        &listed,
        &ListedCertificates::new(),
        &a_memory(home.path()),
    );

    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].stores, vec![StoreClass::Card]);
    let chosen = certificate_behind(&certificates, &rows[0].id, &listed).expect("la copia");
    assert_eq!(chosen.reference().cka_id(), Some([0x01].as_slice()));
}

/// El mismo certificado en cada uno de esos almacenes, con su etiqueta propia en cada uno.
fn copies_of(der: &[u8], stores: &[&Store]) -> Vec<TokenCertificate> {
    stores
        .iter()
        .enumerate()
        .map(|(copy, store)| {
            TokenCertificate::new(
                CertificateRef::new(
                    (*store).clone(),
                    "rfirma-test",
                    format!("COPIA-{copy}"),
                    vec![0x01],
                ),
                der.to_vec(),
            )
        })
        .collect()
}

fn owned_by(name: &str, channel: BrowserChannel) -> NssOwner {
    NssOwner::Browser {
        browser: browser_named(name).expect("el navegador esta en la tabla"),
        channel,
    }
}

fn a_store_of(owner: NssOwner) -> Store {
    Store::nss(SOFTOKEN, Path::new("/home/ada/perfil")).owned_by(owner)
}

fn a_firefox_profile() -> Store {
    Store::nss(SOFTOKEN, Path::new("/home/ada/.mozilla/firefox/perfil"))
        .owned_by(owned_by("Firefox", BrowserChannel::Native))
}

fn a_chrome_database() -> Store {
    Store::nss(SOFTOKEN, Path::new("/home/ada/.pki/nssdb")).owned_by(NssOwner::SharedChromium)
}

/// La copia con la que firma la fila del certificado repartido por esos almacenes.
fn the_copy_signed_with(stores: &[&Store]) -> usize {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let der = TestAuthority::root("EIDAS CERTIFICADO PRUEBAS - 99999999R").der();
    let copies = copies_of(&der, stores);
    let listed = ListedCertificates::new();
    let rows = rows_of(
        copies.clone(),
        &home.path().join("certificates"),
        &listed,
        &ListedCertificates::new(),
        &a_memory(home.path()),
    );
    let chosen = certificate_behind(&copies, &rows[0].id, &listed).expect("la copia");
    copies
        .iter()
        .position(|copy| copy.reference() == chosen.reference())
        .expect("la copia elegida es una de ellas")
}

#[test]
fn within_the_firefox_family_the_copy_follows_the_table_and_then_the_channel() {
    assert_eq!(
        the_copy_signed_with(&[
            &a_store_of(owned_by("LibreWolf", BrowserChannel::Native)),
            &a_store_of(owned_by("Firefox", BrowserChannel::Flatpak)),
            &a_store_of(owned_by("Firefox", BrowserChannel::Snap)),
        ]),
        2
    );
}

#[test]
fn within_the_chromium_family_the_shared_store_comes_first_then_the_table_and_the_channel() {
    assert_eq!(
        the_copy_signed_with(&[
            &a_store_of(owned_by("Brave", BrowserChannel::Snap)),
            &a_store_of(owned_by("Chromium", BrowserChannel::Flatpak)),
            &a_store_of(owned_by("Chromium", BrowserChannel::Snap)),
        ]),
        2
    );
    assert_eq!(
        the_copy_signed_with(&[
            &a_store_of(owned_by("Chrome", BrowserChannel::Flatpak)),
            &a_store_of(NssOwner::SharedChromium),
        ]),
        1
    );
}

/// El Almacén de rFirma en `directory`, con su base ya creada.
fn the_installed_store(directory: &Path) -> Store {
    std::fs::create_dir_all(directory).expect("deberia crearse el almacen");
    std::fs::write(directory.join("cert9.db"), b"").expect("deberia crearse la base");
    Store::installed_nss(INSTALLED, directory)
}

#[test]
fn two_copies_of_one_certificate_are_one_row_with_both_stores() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let der = TestAuthority::root("EIDAS CERTIFICADO PRUEBAS - 99999999R").der();

    let rows = rows_of(
        copies_of(&der, &[&a_firefox_profile(), &Store::module(CARD)]),
        &home.path().join("certificates"),
        &ListedCertificates::new(),
        &ListedCertificates::new(),
        &a_memory(home.path()),
    );

    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].stores, vec![StoreClass::Card, a_firefox_class()]);
}

#[test]
fn the_same_serial_number_from_two_issuers_is_two_rows() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let one = TestAuthority::root_with_serial("EMISORA UNO", 1234).as_certificate("UNO");
    let other = TestAuthority::root_with_serial("EMISORA OTRA", 1234).as_certificate("OTRO");
    assert_eq!(one.serial_number(), other.serial_number());

    let rows = rows_of(
        vec![one, other],
        &home.path().join("certificates"),
        &ListedCertificates::new(),
        &ListedCertificates::new(),
        &a_memory(home.path()),
    );

    assert_eq!(rows.len(), 2);
}

#[test]
fn with_nothing_remembered_the_row_signs_with_the_copy_of_the_preferred_store() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let der = TestAuthority::root("EIDAS CERTIFICADO PRUEBAS - 99999999R").der();
    let copies = copies_of(
        &der,
        &[
            &a_chrome_database(),
            &a_firefox_profile(),
            &Store::nss(SOFTOKEN, Path::new("/home/ada/.local/share/otro-perfil")),
            &the_installed_store(&home.path().join("certificates")),
            &Store::module(CARD),
        ],
    );
    let listed = ListedCertificates::new();

    let rows = rows_of(
        copies.clone(),
        &home.path().join("certificates"),
        &listed,
        &ListedCertificates::new(),
        &a_memory(home.path()),
    );

    assert_eq!(
        rows[0].stores,
        vec![
            StoreClass::Card,
            StoreClass::Installed,
            StoreClass::Nssdb,
            a_firefox_class(),
            StoreClass::Browser(NssOwner::SharedChromium)
        ]
    );
    assert_eq!(rows[0].store, StoreClass::Card);
    assert!(!rows[0].remembered);
    let chosen = certificate_behind(&copies, &rows[0].id, &listed).expect("la copia");
    assert_eq!(chosen.reference(), copies[4].reference());
}

#[test]
fn the_card_copy_is_preferred_to_a_windows_copy_that_does_not_say_where_its_key_is() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let der = TestAuthority::root("EIDAS CERTIFICADO PRUEBAS - 99999999R").der();

    let rows = rows_of(
        copies_of(
            &der,
            &[&Store::module(CARD), &Store::module("cng:CurrentUser/MY")],
        ),
        &home.path().join("certificates"),
        &ListedCertificates::new(),
        &ListedCertificates::new(),
        &a_memory(home.path()),
    );

    assert_eq!(rows[0].store, StoreClass::Card);
    assert_eq!(rows[0].stores, vec![StoreClass::Card, StoreClass::Windows]);
}

#[test]
fn the_dnie_copy_is_preferred_to_a_pkcs11_module_copy_and_the_row_is_listed_once() {
    let dnie = Store::module("dnie:pcsc");
    let module = Store::module(CARD);

    assert_eq!(the_copy_signed_with(&[&module, &dnie]), 1);
    assert_eq!(the_copy_signed_with(&[&dnie, &module]), 0);

    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let der = TestAuthority::root("EIDAS CERTIFICADO PRUEBAS - 99999999R").der();
    let rows = rows_of(
        copies_of(&der, &[&module, &dnie]),
        &home.path().join("certificates"),
        &ListedCertificates::new(),
        &ListedCertificates::new(),
        &a_memory(home.path()),
    );
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].store, StoreClass::Card);
}

#[test]
fn the_installed_store_is_preferred_to_the_browsers() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let der = TestAuthority::root("EIDAS CERTIFICADO PRUEBAS - 99999999R").der();

    let rows = rows_of(
        copies_of(
            &der,
            &[
                &a_firefox_profile(),
                &the_installed_store(&home.path().join("certificates")),
            ],
        ),
        &home.path().join("certificates"),
        &ListedCertificates::new(),
        &ListedCertificates::new(),
        &a_memory(home.path()),
    );

    assert_eq!(rows[0].store, StoreClass::Installed);
}

#[test]
fn the_remembered_copy_is_the_one_behind_the_row_and_marks_it() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let memory = a_memory(home.path());
    let der = TestAuthority::root("EIDAS CERTIFICADO PRUEBAS - 99999999R").der();
    let copies = copies_of(&der, &[&Store::module(CARD), &a_firefox_profile()]);
    remember_the_certificate(&memory, copies[1].reference());
    let listed = ListedCertificates::new();

    let rows = rows_of(
        copies.clone(),
        &home.path().join("certificates"),
        &listed,
        &ListedCertificates::new(),
        &memory,
    );

    assert_eq!(rows.len(), 1);
    assert!(
        rows[0].remembered,
        "la fila esta recordada por su copia de Firefox"
    );
    assert_eq!(rows[0].store, a_firefox_class());
    let chosen = certificate_behind(&copies, &rows[0].id, &listed).expect("la copia");
    assert_eq!(chosen.reference(), copies[1].reference());
}

#[test]
fn a_row_signed_with_a_remembered_browser_copy_still_removes_its_installed_copy() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");
    let installed_dir = home.path().join("certificates");
    let memory = a_memory(home.path());
    let der = TestAuthority::root("EIDAS CERTIFICADO PRUEBAS - 99999999R").der();
    let copies = copies_of(
        &der,
        &[&a_firefox_profile(), &the_installed_store(&installed_dir)],
    );
    remember_the_certificate(&memory, copies[0].reference());
    let listed = ListedCertificates::new();
    let installed_copies = ListedCertificates::new();

    let rows = rows_of(
        copies.clone(),
        &installed_dir,
        &listed,
        &installed_copies,
        &memory,
    );

    assert_eq!(rows.len(), 1);
    assert_eq!(
        rows[0].store,
        a_firefox_class(),
        "se sigue firmando con la copia recordada"
    );
    assert!(
        rows[0].stores.contains(&StoreClass::Installed),
        "pero la fila tambien esta instalada"
    );

    remove_installed(
        &RemovalOutcome(Ok(())),
        &FixedPinKeyring("1234"),
        &memory,
        &installed_dir,
        &rows[0].id,
        RemovalListing {
            listed: &listed,
            installed_copies: &installed_copies,
            last: &crate::identity::application::readers::LastListing::default(),
        },
    )
    .expect("la copia instalada deberia poder quitarse aunque la elegida sea de firefox");
}

#[test]
fn unreadable_certificates_are_never_taken_for_copies_of_each_other() {
    let home = tempfile::tempdir().expect("deberia haber directorio temporal");

    let rows = rows_of(
        vec![
            a_certificate_with_id("ROTO", 0x01, &[0x00]),
            a_certificate_with_id("ROTO", 0x02, &[0x00]),
        ],
        &home.path().join("certificates"),
        &ListedCertificates::new(),
        &ListedCertificates::new(),
        &a_memory(home.path()),
    );

    assert_eq!(rows.len(), 2);
}
