//! Pruebas de los almacenes NSS de los navegadores de Flatpak y snap, y del dueño y el orden de cada uno.

use super::*;

fn reads_the_only_store_at(relative: &str, owner: NssOwner) {
    let home = a_home_with(&[(relative, true)], None);

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(home.path().join(relative), owner)]
    );
}

#[test]
fn reads_the_chrome_flatpak_nssdb() {
    reads_the_only_store_at(
        ".var/app/com.google.Chrome/data/pki/nssdb",
        owned_by("Chrome", BrowserChannel::Flatpak),
    );
}

#[test]
fn reads_the_chromium_flatpak_nssdb() {
    reads_the_only_store_at(
        ".var/app/org.chromium.Chromium/data/pki/nssdb",
        owned_by("Chromium", BrowserChannel::Flatpak),
    );
}

#[test]
fn reads_the_brave_flatpak_nssdb() {
    reads_the_only_store_at(
        ".var/app/com.brave.Browser/data/pki/nssdb",
        owned_by("Brave", BrowserChannel::Flatpak),
    );
}

#[test]
fn reads_the_edge_flatpak_nssdb() {
    reads_the_only_store_at(
        ".var/app/com.microsoft.Edge/data/pki/nssdb",
        owned_by("Edge", BrowserChannel::Flatpak),
    );
}

#[test]
fn reads_the_vivaldi_flatpak_nssdb() {
    reads_the_only_store_at(
        ".var/app/com.vivaldi.Vivaldi/data/pki/nssdb",
        owned_by("Vivaldi", BrowserChannel::Flatpak),
    );
}

#[test]
fn reads_the_snap_brave_xdg_nssdb() {
    reads_the_only_store_at(
        "snap/brave/current/.local/share/pki/nssdb",
        owned_by("Brave", BrowserChannel::Snap),
    );
}

#[test]
fn reads_the_snap_brave_legacy_nssdb() {
    reads_the_only_store_at(
        "snap/brave/current/.pki/nssdb",
        owned_by("Brave", BrowserChannel::Snap),
    );
}

#[test]
fn reads_the_snap_vivaldi_xdg_nssdb() {
    reads_the_only_store_at(
        "snap/vivaldi/current/.local/share/pki/nssdb",
        owned_by("Vivaldi", BrowserChannel::Snap),
    );
}

#[test]
fn reads_the_snap_vivaldi_legacy_nssdb() {
    reads_the_only_store_at(
        "snap/vivaldi/current/.pki/nssdb",
        owned_by("Vivaldi", BrowserChannel::Snap),
    );
}

#[test]
fn reads_a_librewolf_profile_from_the_flatpak_layout() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let profile = a_firefox_profile_at(
        home.path(),
        ".var/app/io.gitlab.librewolf-community/config/librewolf/librewolf",
        ".var/app/io.gitlab.librewolf-community/config/librewolf/librewolf/hhhhhhhh.default-release",
    );

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(
            profile,
            owned_by("LibreWolf", BrowserChannel::Flatpak)
        )]
    );
}

#[test]
fn skips_an_absent_flatpak_store_without_creating_directories() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");

    assert!(nss_stores(home.path()).is_empty());
    assert!(!home.path().join(".var").exists());
    assert!(!home.path().join("snap").exists());
}

#[test]
fn the_native_chromium_family_is_one_shared_store_and_not_one_per_browser() {
    let home = a_home_with(
        &[(".pki/nssdb", true), (".local/share/pki/nssdb", true)],
        None,
    );

    assert_eq!(
        nss_stores(home.path()),
        vec![
            store_at(home.path().join(".pki/nssdb"), NssOwner::SharedChromium),
            store_at(
                home.path().join(".local/share/pki/nssdb"),
                NssOwner::SharedChromium
            ),
        ]
    );
}

#[test]
fn the_same_browser_through_two_channels_gives_two_stores() {
    let home = a_home_with(
        &[
            ("snap/chromium/current/.pki/nssdb", true),
            (".var/app/org.chromium.Chromium/data/pki/nssdb", true),
        ],
        None,
    );

    assert_eq!(
        nss_stores(home.path()),
        vec![
            store_at(
                home.path().join("snap/chromium/current/.pki/nssdb"),
                owned_by("Chromium", BrowserChannel::Snap)
            ),
            store_at(
                home.path()
                    .join(".var/app/org.chromium.Chromium/data/pki/nssdb"),
                owned_by("Chromium", BrowserChannel::Flatpak)
            ),
        ]
    );
}

#[test]
fn a_store_without_cert9_db_is_ignored_with_its_owner() {
    let home = a_home_with(
        &[(".var/app/com.google.Chrome/data/pki/nssdb", false)],
        None,
    );

    assert!(nss_stores(home.path()).is_empty());
    assert_eq!(
        ignored_nss_stores(home.path()),
        vec![store_at(
            home.path()
                .join(".var/app/com.google.Chrome/data/pki/nssdb"),
            owned_by("Chrome", BrowserChannel::Flatpak)
        )]
    );
}

#[test]
fn the_stores_come_firefox_family_first_then_chromium_in_table_and_channel_order() {
    let home = a_home_with(
        &[
            (".var/app/com.vivaldi.Vivaldi/data/pki/nssdb", true),
            ("snap/brave/current/.pki/nssdb", true),
            (".var/app/com.google.Chrome/data/pki/nssdb", true),
            (".pki/nssdb", true),
        ],
        None,
    );
    let librewolf = a_firefox_profile_at(
        home.path(),
        ".var/app/io.gitlab.librewolf-community/config/librewolf/librewolf",
        ".var/app/io.gitlab.librewolf-community/config/librewolf/librewolf/aaaaaaaa.default",
    );
    let flatpak_firefox = a_firefox_profile_at(
        home.path(),
        ".var/app/org.mozilla.firefox/.mozilla/firefox",
        ".var/app/org.mozilla.firefox/.mozilla/firefox/bbbbbbbb.default",
    );
    let snap_firefox = a_firefox_profile_at(
        home.path(),
        "snap/firefox/common/.mozilla/firefox",
        "snap/firefox/common/.mozilla/firefox/cccccccc.default",
    );

    let owners: Vec<NssOwner> = nss_stores(home.path())
        .into_iter()
        .map(|store| store.owner)
        .collect();

    assert_eq!(
        owners,
        vec![
            owned_by("Firefox", BrowserChannel::Snap),
            owned_by("Firefox", BrowserChannel::Flatpak),
            owned_by("LibreWolf", BrowserChannel::Flatpak),
            NssOwner::SharedChromium,
            owned_by("Chrome", BrowserChannel::Flatpak),
            owned_by("Brave", BrowserChannel::Snap),
            owned_by("Vivaldi", BrowserChannel::Flatpak),
        ]
    );
    let directories: Vec<PathBuf> = nss_stores(home.path())
        .into_iter()
        .map(|store| store.directory)
        .collect();
    assert_eq!(directories[..3], [snap_firefox, flatpak_firefox, librewolf]);
}

#[test]
fn a_chromium_flatpak_has_no_legacy_pki_store() {
    let home = a_home_with(&[(".var/app/com.google.Chrome/.pki/nssdb", true)], None);

    assert!(nss_stores(home.path()).is_empty());
}

#[test]
fn the_firefox_snap_reads_only_its_common_root() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    a_firefox_profile_at(
        home.path(),
        "snap/firefox/current/.mozilla/firefox",
        "snap/firefox/current/.mozilla/firefox/aaaaaaaa.default",
    );
    a_firefox_profile_at(
        home.path(),
        "snap/firefox/common/.config/mozilla/firefox",
        "snap/firefox/common/.config/mozilla/firefox/bbbbbbbb.default",
    );

    assert!(nss_stores(home.path()).is_empty());
}

#[test]
fn each_nss_store_opened_carries_the_owner_it_was_discovered_with() {
    let home = a_home_with(
        &[
            (".var/app/com.google.Chrome/data/pki/nssdb", true),
            (".pki/nssdb", true),
        ],
        None,
    );
    a_firefox_profile_at(
        home.path(),
        "snap/firefox/common/.mozilla/firefox",
        "snap/firefox/common/.mozilla/firefox/aaaaaaaa.default",
    );

    let opened: Vec<(Option<NssOwner>, StoreClass)> =
        nss_stores_opened_by(Path::new("/usr/lib/libsoftokn3.so"), home.path())
            .iter()
            .map(|store| (store.owner(), store.class()))
            .collect();

    assert_eq!(
        opened,
        vec![
            (
                Some(owned_by("Firefox", BrowserChannel::Snap)),
                StoreClass::Firefox
            ),
            (Some(NssOwner::SharedChromium), StoreClass::Chrome),
            (
                Some(owned_by("Chrome", BrowserChannel::Flatpak)),
                StoreClass::Chrome
            ),
        ]
    );
}

#[test]
fn a_librewolf_flatpak_has_no_legacy_profile_directory() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    a_firefox_profile_at(
        home.path(),
        ".var/app/io.gitlab.librewolf-community/.librewolf",
        ".var/app/io.gitlab.librewolf-community/.librewolf/aaaaaaaa.default",
    );

    assert!(nss_stores(home.path()).is_empty());
}
