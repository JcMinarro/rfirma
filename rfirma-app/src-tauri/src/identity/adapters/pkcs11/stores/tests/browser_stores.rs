//! Pruebas de los almacenes NSS de los navegadores de Flatpak y snap.

use super::*;

fn reads_the_only_store_at(relative: &str) {
    let home = a_home_with(&[(relative, true)], None);

    assert_eq!(nss_profiles(home.path()), vec![home.path().join(relative)]);
}

#[test]
fn reads_the_chrome_flatpak_nssdb() {
    reads_the_only_store_at(".var/app/com.google.Chrome/data/pki/nssdb");
}

#[test]
fn reads_the_chromium_flatpak_nssdb() {
    reads_the_only_store_at(".var/app/org.chromium.Chromium/data/pki/nssdb");
}

#[test]
fn reads_the_brave_flatpak_nssdb() {
    reads_the_only_store_at(".var/app/com.brave.Browser/data/pki/nssdb");
}

#[test]
fn reads_the_edge_flatpak_nssdb() {
    reads_the_only_store_at(".var/app/com.microsoft.Edge/data/pki/nssdb");
}

#[test]
fn reads_the_vivaldi_flatpak_nssdb() {
    reads_the_only_store_at(".var/app/com.vivaldi.Vivaldi/data/pki/nssdb");
}

#[test]
fn reads_the_snap_brave_xdg_nssdb() {
    reads_the_only_store_at("snap/brave/current/.local/share/pki/nssdb");
}

#[test]
fn reads_the_snap_brave_legacy_nssdb() {
    reads_the_only_store_at("snap/brave/current/.pki/nssdb");
}

#[test]
fn reads_the_snap_vivaldi_xdg_nssdb() {
    reads_the_only_store_at("snap/vivaldi/current/.local/share/pki/nssdb");
}

#[test]
fn reads_the_snap_vivaldi_legacy_nssdb() {
    reads_the_only_store_at("snap/vivaldi/current/.pki/nssdb");
}

#[test]
fn reads_a_librewolf_profile_from_the_flatpak_layout() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let profile = a_firefox_profile_at(
        home.path(),
        ".var/app/io.gitlab.librewolf-community/config/librewolf/librewolf",
        ".var/app/io.gitlab.librewolf-community/config/librewolf/librewolf/hhhhhhhh.default-release",
    );

    assert_eq!(nss_profiles(home.path()), vec![profile]);
}

#[test]
fn skips_an_absent_flatpak_store_without_creating_directories() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");

    assert!(nss_profiles(home.path()).is_empty());
    assert!(!home.path().join(".var").exists());
    assert!(!home.path().join("snap").exists());
}
