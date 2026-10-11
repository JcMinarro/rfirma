//! Pruebas de los perfiles de la familia Firefox y del almacén compartido de la familia Chromium: qué se descubre y de quién es.

use super::*;

#[test]
fn reads_every_firefox_profile_declared_in_profiles_ini() {
    let home = a_home_with(
        &[
            (".mozilla/firefox/aaaaaaaa.default-release", true),
            (".mozilla/firefox/bbbbbbbb.trabajo", true),
        ],
        Some(
            "[Install4F96D1932A9F858E]\n\
             Default=aaaaaaaa.default-release\n\
             \n\
             [Profile0]\n\
             Name=default-release\n\
             IsRelative=1\n\
             Path=aaaaaaaa.default-release\n\
             \n\
             [Profile1]\n\
             Name=trabajo\n\
             IsRelative=1\n\
             Path=bbbbbbbb.trabajo\n",
        ),
    );

    assert_eq!(
        nss_stores(home.path()),
        vec![
            store_at(
                home.path()
                    .join(".mozilla/firefox/aaaaaaaa.default-release"),
                native_firefox()
            ),
            store_at(
                home.path().join(".mozilla/firefox/bbbbbbbb.trabajo"),
                native_firefox()
            ),
        ]
    );
}

#[test]
fn skips_a_declared_profile_without_a_certificate_database() {
    let home = a_home_with(
        &[
            (".mozilla/firefox/aaaaaaaa.vacio", false),
            (".mozilla/firefox/bbbbbbbb.lleno", true),
        ],
        Some("[Profile0]\nPath=aaaaaaaa.vacio\n\n[Profile1]\nPath=bbbbbbbb.lleno\n"),
    );

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(
            home.path().join(".mozilla/firefox/bbbbbbbb.lleno"),
            native_firefox()
        )]
    );
}

#[test]
fn reports_a_declared_profile_without_a_certificate_database_as_ignored() {
    let home = a_home_with(
        &[
            (".mozilla/firefox/aaaaaaaa.vacio", false),
            (".mozilla/firefox/bbbbbbbb.lleno", true),
        ],
        Some("[Profile0]\nPath=aaaaaaaa.vacio\n\n[Profile1]\nPath=bbbbbbbb.lleno\n"),
    );

    assert_eq!(
        ignored_nss_stores(home.path()),
        vec![store_at(
            home.path().join(".mozilla/firefox/aaaaaaaa.vacio"),
            native_firefox()
        )]
    );
}

#[test]
fn reads_the_shared_nssdb_too() {
    let home = a_home_with(&[(".pki/nssdb", true)], None);

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(
            home.path().join(".pki/nssdb"),
            NssOwner::SharedChromium
        )]
    );
}

#[test]
fn has_no_profiles_when_firefox_is_not_installed() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");

    assert!(nss_stores(home.path()).is_empty());
}

#[test]
fn reads_a_firefox_profile_from_the_paired_xdg_config_and_data_dirs() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let config = home.path().join(".config/mozilla/firefox");
    let data = home.path().join(".local/share/mozilla/firefox");
    let profile = data.join("cccccccc.default-release");
    std::fs::create_dir_all(&config).expect("deberia poder crearse .config/mozilla/firefox");
    std::fs::create_dir_all(&profile).expect("deberia poder crearse el perfil");
    std::fs::write(profile.join("cert9.db"), b"").expect("deberia poder escribirse");
    std::fs::write(
        config.join("profiles.ini"),
        "[Profile0]\nPath=cccccccc.default-release\n",
    )
    .expect("deberia poder escribirse");

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(profile, native_firefox())]
    );
}

#[test]
fn reads_the_xdg_shared_nssdb_too() {
    let home = a_home_with(&[(".local/share/pki/nssdb", true)], None);

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(
            home.path().join(".local/share/pki/nssdb"),
            NssOwner::SharedChromium
        )]
    );
}

#[test]
fn resolves_an_absolute_profile_path_as_it_comes() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let firefox = home.path().join(".mozilla/firefox");
    let elsewhere = home.path().join("otro-sitio");
    std::fs::create_dir_all(&firefox).expect("deberia poder crearse .mozilla/firefox");
    std::fs::create_dir_all(&elsewhere).expect("deberia poder crearse el otro sitio");
    std::fs::write(elsewhere.join("cert9.db"), b"").expect("deberia poder escribirse");
    std::fs::write(
        firefox.join("profiles.ini"),
        format!("[Profile0]\nIsRelative=0\nPath={}\n", elsewhere.display()),
    )
    .expect("deberia poder escribirse");

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(elsewhere, native_firefox())]
    );
}

#[test]
fn reads_a_firefox_profile_from_the_snap_layout() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let firefox = home.path().join("snap/firefox/common/.mozilla/firefox");
    let profile = firefox.join("dddddddd.default");
    std::fs::create_dir_all(&profile).expect("deberia poder crearse el perfil");
    std::fs::write(profile.join("cert9.db"), b"").expect("deberia poder escribirse");
    std::fs::write(
        firefox.join("profiles.ini"),
        "[Profile0]\nPath=dddddddd.default\n",
    )
    .expect("deberia poder escribirse");

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(profile, owned_by("Firefox", BrowserChannel::Snap))]
    );
}

#[test]
fn reads_firefox_profiles_from_both_snap_and_classic_layouts_simultaneously() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let classic_firefox = home.path().join(".mozilla/firefox");
    let classic_profile = classic_firefox.join("aaaaaaaa.classic");
    std::fs::create_dir_all(&classic_profile).expect("deberia poder crearse el perfil clasico");
    std::fs::write(classic_profile.join("cert9.db"), b"").expect("deberia poder escribirse");
    std::fs::write(
        classic_firefox.join("profiles.ini"),
        "[Profile0]\nPath=aaaaaaaa.classic\n",
    )
    .expect("deberia poder escribirse");

    let snap_firefox = home.path().join("snap/firefox/common/.mozilla/firefox");
    let snap_profile = snap_firefox.join("bbbbbbbb.snap");
    std::fs::create_dir_all(&snap_profile).expect("deberia poder crearse el perfil snap");
    std::fs::write(snap_profile.join("cert9.db"), b"").expect("deberia poder escribirse");
    std::fs::write(
        snap_firefox.join("profiles.ini"),
        "[Profile0]\nPath=bbbbbbbb.snap\n",
    )
    .expect("deberia poder escribirse");

    assert_eq!(
        nss_stores(home.path()),
        vec![
            store_at(classic_profile, native_firefox()),
            store_at(snap_profile, owned_by("Firefox", BrowserChannel::Snap)),
        ]
    );
}

#[test]
fn reads_the_snap_chromium_xdg_nssdb() {
    let home = a_home_with(
        &[("snap/chromium/current/.local/share/pki/nssdb", true)],
        None,
    );

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(
            home.path()
                .join("snap/chromium/current/.local/share/pki/nssdb"),
            owned_by("Chromium", BrowserChannel::Snap)
        )]
    );
}

#[test]
fn reads_the_snap_chromium_legacy_nssdb() {
    let home = a_home_with(&[("snap/chromium/current/.pki/nssdb", true)], None);

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(
            home.path().join("snap/chromium/current/.pki/nssdb"),
            owned_by("Chromium", BrowserChannel::Snap)
        )]
    );
}

#[test]
fn reads_a_librewolf_profile_from_its_legacy_layout() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let librewolf = home.path().join(".librewolf");
    let profile = librewolf.join("eeeeeeee.default-release");
    std::fs::create_dir_all(&profile).expect("deberia poder crearse el perfil");
    std::fs::write(profile.join("cert9.db"), b"").expect("deberia poder escribirse");
    std::fs::write(
        librewolf.join("profiles.ini"),
        "[Profile0]\nPath=eeeeeeee.default-release\n",
    )
    .expect("deberia poder escribirse");

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(
            profile,
            owned_by("LibreWolf", BrowserChannel::Native)
        )]
    );
}

#[test]
fn reads_a_librewolf_profile_from_its_xdg_layout() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let librewolf = home.path().join(".config/librewolf/librewolf");
    let profile = librewolf.join("ffffffff.default-release");
    std::fs::create_dir_all(&profile).expect("deberia poder crearse el perfil");
    std::fs::write(profile.join("cert9.db"), b"").expect("deberia poder escribirse");
    std::fs::write(
        librewolf.join("profiles.ini"),
        "[Profile0]\nPath=ffffffff.default-release\n",
    )
    .expect("deberia poder escribirse");

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(
            profile,
            owned_by("LibreWolf", BrowserChannel::Native)
        )]
    );
}

#[test]
fn reads_an_xdg_firefox_profile_kept_beside_its_profiles_ini() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let profile = a_firefox_profile_at(
        home.path(),
        ".config/mozilla/firefox",
        ".config/mozilla/firefox/eeeeeeee.default-release",
    );

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(profile, native_firefox())]
    );
}

#[test]
fn reads_a_firefox_profile_from_the_flatpak_xdg_layout() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let profile = a_firefox_profile_at(
        home.path(),
        ".var/app/org.mozilla.firefox/config/mozilla/firefox",
        ".var/app/org.mozilla.firefox/config/mozilla/firefox/ffffffff.default-release",
    );

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(
            profile,
            owned_by("Firefox", BrowserChannel::Flatpak)
        )]
    );
}

#[test]
fn reads_a_firefox_profile_from_the_flatpak_legacy_layout() {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let profile = a_firefox_profile_at(
        home.path(),
        ".var/app/org.mozilla.firefox/.mozilla/firefox",
        ".var/app/org.mozilla.firefox/.mozilla/firefox/gggggggg.default-release",
    );

    assert_eq!(
        nss_stores(home.path()),
        vec![store_at(
            profile,
            owned_by("Firefox", BrowserChannel::Flatpak)
        )]
    );
}
