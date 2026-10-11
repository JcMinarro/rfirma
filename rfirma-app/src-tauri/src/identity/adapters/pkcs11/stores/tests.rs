use super::*;
use crate::identity::domain::browsers::{BrowserChannel, BROWSERS};
use crate::identity::domain::store::StoreClass;

#[test]
fn keeps_only_the_candidates_that_are_there() {
    let stores = present_among(["/hay/uno.so", "/no/hay.so", "/hay/otro.so"], |path| {
        path.starts_with("/hay")
    });

    assert_eq!(
        stores,
        vec![PathBuf::from("/hay/uno.so"), PathBuf::from("/hay/otro.so")]
    );
}

#[cfg(unix)]
#[test]
fn a_store_under_the_installed_directory_is_its_own_class() {
    let home = tempfile::tempdir().expect("deberia poder crearse un directorio temporal");
    let installed = home.path().join("certificates");
    std::fs::create_dir_all(&installed).expect("deberia poder crearse el almacen");
    std::fs::write(installed.join("cert9.db"), b"").expect("deberia poder escribirse cert9.db");
    let elsewhere = home.path().join(".pki/nssdb");
    std::fs::create_dir_all(&elsewhere).expect("deberia poder crearse el perfil");

    assert_eq!(
        Store::nss("/usr/lib/libsoftokn3.so", &installed).class_under(&installed),
        StoreClass::Installed
    );
    assert_eq!(
        Store::nss("/usr/lib/libsoftokn3.so", &elsewhere)
            .owned_by(NssOwner::SharedChromium)
            .class_under(&installed),
        StoreClass::Browser(NssOwner::SharedChromium)
    );
}

#[test]
fn has_no_stores_when_no_candidate_is_installed() {
    assert!(present_among(CANDIDATE_MODULES, |_| false).is_empty());
}

#[cfg(unix)]
#[test]
fn lists_the_same_module_once_even_under_two_names() {
    let directory = tempfile::tempdir().expect("deberia poder crearse un directorio temporal");
    let module = directory.path().join("modulo.so");
    std::fs::write(&module, b"").expect("deberia poder escribirse el modulo");
    let link = directory.path().join("enlace.so");
    std::os::unix::fs::symlink(&module, &link).expect("deberia poder enlazarse");

    let candidates = [
        module.to_str().expect("ruta valida"),
        link.to_str().expect("ruta valida"),
    ];
    let stores = present_among(candidates, |path| path.is_file());

    assert_eq!(stores, vec![module]);
}

#[test]
fn a_plain_module_has_nothing_to_configure() {
    assert_eq!(Store::module("/usr/lib/x.so").init_args(), None);
}

#[test]
fn a_plain_module_is_a_card() {
    assert_eq!(Store::module("/usr/lib/x.so").class(), StoreClass::Card);
}

#[test]
fn a_cng_store_is_the_windows_store_and_not_a_card() {
    assert_eq!(
        Store::module("cng:CurrentUser/MY").class(),
        StoreClass::Windows
    );
    assert_eq!(
        Store::module("cng:CurrentUser/MY").class_under(Path::new("/nowhere")),
        StoreClass::Windows
    );
}

#[test]
fn the_stores_are_preferred_card_windows_installed_system_nss_firefox_chrome() {
    let mut classes = [
        StoreClass::Browser(NssOwner::SharedChromium),
        a_firefox_class(),
        StoreClass::Nssdb,
        StoreClass::Installed,
        StoreClass::Windows,
        StoreClass::Card,
    ];

    classes.sort_by_key(|class| class.preference());

    assert_eq!(
        classes,
        [
            StoreClass::Card,
            StoreClass::Windows,
            StoreClass::Installed,
            StoreClass::Nssdb,
            a_firefox_class(),
            StoreClass::Browser(NssOwner::SharedChromium),
        ]
    );
}

#[test]
fn a_browser_store_is_classified_by_the_family_of_its_owner() {
    let softoken = "/usr/lib/libsoftokn3.so";
    let anywhere = Path::new("/casa/ada/perfil");

    assert_eq!(
        Store::nss(softoken, anywhere)
            .owned_by(owned_by("LibreWolf", BrowserChannel::Flatpak))
            .class(),
        StoreClass::Browser(owned_by("LibreWolf", BrowserChannel::Flatpak))
    );
    assert_eq!(
        Store::nss(softoken, anywhere)
            .owned_by(owned_by("Brave", BrowserChannel::Snap))
            .class(),
        StoreClass::Browser(owned_by("Brave", BrowserChannel::Snap))
    );
    assert_eq!(
        Store::nss(softoken, anywhere)
            .owned_by(NssOwner::SharedChromium)
            .class(),
        StoreClass::Browser(NssOwner::SharedChromium)
    );
}

#[test]
fn an_nss_store_without_an_owner_is_the_systems_whatever_its_path() {
    for path in [
        "/casa/ada/.mozilla/firefox/aaaaaaaa.default-release",
        "/casa/ada/.pki/nssdb",
        "/tmp/perfil-de-pruebas",
    ] {
        assert_eq!(
            Store::nss("/usr/lib/libsoftokn3.so", Path::new(path)).class(),
            StoreClass::Nssdb,
            "{path}"
        );
    }
}

#[test]
fn an_nss_store_opens_the_profile_read_only_and_in_sql_format() {
    let store = Store::nss("/usr/lib/libsoftokn3.so", Path::new("/casa/perfil"));
    let args = store.init_args().expect("un almacen NSS lleva init args");

    assert!(args.contains("configdir='sql:/casa/perfil'"), "{args}");
    assert!(args.contains("flags=readOnly"), "{args}");
}

fn a_home_with(profiles: &[(&str, bool)], ini: Option<&str>) -> tempfile::TempDir {
    let home = tempfile::tempdir().expect("deberia poder crearse un HOME de mentira");
    let firefox = home.path().join(".mozilla/firefox");
    std::fs::create_dir_all(&firefox).expect("deberia poder crearse .mozilla/firefox");
    for (name, with_database) in profiles {
        let directory = home.path().join(name);
        std::fs::create_dir_all(&directory).expect("deberia poder crearse el perfil");
        if *with_database {
            std::fs::write(directory.join("cert9.db"), b"").expect("deberia poder escribirse");
        }
    }
    if let Some(ini) = ini {
        std::fs::write(firefox.join("profiles.ini"), ini).expect("deberia poder escribirse");
    }
    home
}

fn owned_by(name: &str, channel: BrowserChannel) -> NssOwner {
    let browser = BROWSERS
        .iter()
        .find(|browser| browser.name == name)
        .expect("el navegador deberia estar en la tabla");
    NssOwner::Browser { browser, channel }
}

fn store_at(directory: PathBuf, owner: NssOwner) -> NssStore {
    NssStore { directory, owner }
}

fn native_firefox() -> NssOwner {
    owned_by("Firefox", BrowserChannel::Native)
}

#[test]
fn enumerates_multiarch_subdirectories_containing_linux() {
    let temp = tempfile::tempdir().expect("deberia poder crearse un directorio temporal");
    let usr_lib = temp.path().join("usr/lib");
    std::fs::create_dir_all(usr_lib.join("aarch64-linux-gnu")).expect("deberia poder crearse");
    std::fs::create_dir_all(usr_lib.join("x86_64-linux-gnu")).expect("deberia poder crearse");
    std::fs::create_dir_all(usr_lib.join("arm-none-eabi")).expect("deberia poder crearse");
    std::fs::create_dir_all(usr_lib.join("not-a-triplet")).expect("deberia poder crearse");
    std::fs::write(usr_lib.join("file-with-linux-in-name"), b"").expect("deberia poder escribirse");

    let subdirs = multiarch_subdirectories(&usr_lib);
    assert_eq!(
        subdirs,
        vec![
            usr_lib.join("aarch64-linux-gnu"),
            usr_lib.join("x86_64-linux-gnu"),
        ]
    );
}

#[test]
fn finds_softoken_in_multiarch_subdirectories() {
    let temp = tempfile::tempdir().expect("deberia poder crearse un directorio temporal");
    let usr_lib = temp.path().join("usr/lib");
    let aarch64 = usr_lib.join("aarch64-linux-gnu");
    let non_linux = usr_lib.join("arm-none-eabi");
    std::fs::create_dir_all(&aarch64).expect("deberia poder crearse aarch64-linux-gnu");
    std::fs::create_dir_all(&non_linux).expect("deberia poder crearse arm-none-eabi");
    let softoken_path = aarch64.join("libsoftokn3.so");
    std::fs::write(&softoken_path, b"").expect("deberia poder escribirse libsoftokn3.so");
    std::fs::write(non_linux.join("libsoftokn3.so"), b"").expect("deberia poder escribirse");

    assert_eq!(softoken_under(&usr_lib), Some(softoken_path));
}

#[test]
fn finds_softoken_in_multiarch_nss_subdirectory() {
    let temp = tempfile::tempdir().expect("deberia poder crearse un directorio temporal");
    let usr_lib = temp.path().join("usr/lib");
    let riscv = usr_lib.join("riscv64-linux-gnu/nss");
    std::fs::create_dir_all(&riscv).expect("deberia poder crearse riscv64-linux-gnu/nss");
    let softoken_path = riscv.join("libsoftokn3.so");
    std::fs::write(&softoken_path, b"").expect("deberia poder escribirse libsoftokn3.so");

    assert_eq!(softoken_under(&usr_lib), Some(softoken_path));
}

#[test]
fn finds_softhsm_in_multiarch_subdirectory() {
    let temp = tempfile::tempdir().expect("deberia poder crearse un directorio temporal");
    let usr_lib = temp.path().join("usr/lib");
    let aarch64 = usr_lib.join("aarch64-linux-gnu/softhsm");
    std::fs::create_dir_all(&aarch64).expect("deberia poder crearse aarch64-linux-gnu/softhsm");
    let module_path = aarch64.join("libsofthsm2.so");
    std::fs::write(&module_path, b"").expect("deberia poder escribirse libsofthsm2.so");

    let candidates = candidate_modules_under(&usr_lib);
    let present = present_among(candidates, |path| {
        path.starts_with(temp.path()) && path.is_file()
    });
    assert_eq!(present, vec![module_path]);
}

#[test]
fn a_registered_module_that_is_already_a_candidate_is_listed_once() {
    let temp = tempfile::tempdir().expect("deberia poder crearse un directorio temporal");
    let usr = temp.path().join("usr");
    let softhsm = usr.join("lib/x86_64-linux-gnu/softhsm/libsofthsm2.so");
    let opensc = usr.join("lib/x86_64-linux-gnu/pkcs11/opensc-pkcs11.so");
    for library in [&softhsm, &opensc] {
        std::fs::create_dir_all(library.parent().expect("tiene padre"))
            .expect("deberia poder crearse el directorio");
        std::fs::write(library, b"").expect("deberia poder escribirse la biblioteca");
    }
    let registry = temp.path().join("modules");
    std::fs::create_dir_all(&registry).expect("deberia poder crearse el registro");
    std::fs::write(
        registry.join("softhsm2.module"),
        format!("module: {}\n", softhsm.display()),
    )
    .expect("deberia poder escribirse el .module");
    std::fs::write(
        registry.join("opensc-pkcs11.module"),
        "module: opensc-pkcs11.so\n",
    )
    .expect("deberia poder escribirse el .module");

    let ours: Vec<PathBuf> = discovered_modules(&usr, None, &[registry])
        .into_iter()
        .filter(|module| module.starts_with(temp.path()))
        .collect();

    assert_eq!(ours, vec![softhsm, opensc]);
}

#[cfg(unix)]
#[test]
fn a_library_named_by_the_site_matches_the_discovered_module_it_canonicalises_to() {
    let temp = tempfile::tempdir().expect("deberia poder crearse un directorio temporal");
    let real = temp
        .path()
        .join("lib/x86_64-linux-gnu/softhsm/libsofthsm2.so");
    std::fs::create_dir_all(real.parent().expect("tiene padre"))
        .expect("deberia poder crearse el directorio");
    std::fs::write(&real, b"").expect("deberia poder escribirse la biblioteca");
    let without_multiarch = temp.path().join("lib/softhsm/libsofthsm2.so");
    std::fs::create_dir_all(without_multiarch.parent().expect("tiene padre"))
        .expect("deberia poder crearse el directorio");
    std::os::unix::fs::symlink(&real, &without_multiarch).expect("deberia poder enlazarse");
    let stores = [Store::module(&without_multiarch)];

    assert_eq!(
        discovered_module_named(&stores, real.to_str().expect("ruta valida")),
        Some(without_multiarch.clone())
    );
    assert_eq!(
        discovered_module_named(&stores, without_multiarch.to_str().expect("ruta valida")),
        Some(without_multiarch)
    );
}

#[test]
fn a_library_that_rfirma_has_not_discovered_matches_nothing() {
    let temp = tempfile::tempdir().expect("deberia poder crearse un directorio temporal");
    let discovered = temp.path().join("descubierto.so");
    let other = temp.path().join("otro.so");
    std::fs::write(&discovered, b"").expect("deberia poder escribirse la biblioteca");
    std::fs::write(&other, b"").expect("deberia poder escribirse la biblioteca");
    let stores = [Store::module(&discovered)];

    assert_eq!(
        discovered_module_named(&stores, other.to_str().expect("ruta valida")),
        None
    );
    assert_eq!(discovered_module_named(&stores, "/no/existe.so"), None);
}

#[test]
fn the_softoken_behind_an_nss_profile_is_not_a_module_the_site_can_name() {
    let temp = tempfile::tempdir().expect("deberia poder crearse un directorio temporal");
    let softoken = temp.path().join("libsoftokn3.so");
    std::fs::write(&softoken, b"").expect("deberia poder escribirse el softoken");
    let stores = [Store::nss(&softoken, &temp.path().join(".pki/nssdb"))];

    assert_eq!(
        discovered_module_named(&stores, softoken.to_str().expect("ruta valida")),
        None
    );
}

#[test]
fn the_softhsm_path_without_multiarch_is_the_one_discovered_on_this_machine() {
    let named = Path::new("/usr/lib/softhsm/libsofthsm2.so");
    let multiarch = Path::new("/usr/lib/x86_64-linux-gnu/softhsm/libsofthsm2.so");
    if !multiarch.is_file() {
        return;
    }

    assert_eq!(
        discovered_module_named(
            &[Store::module(multiarch)],
            named.to_str().expect("ruta valida")
        ),
        Some(multiarch.to_path_buf())
    );
}

fn a_firefox_profile_at(home: &Path, profiles_ini_dir: &str, profile_dir: &str) -> PathBuf {
    let ini_dir = home.join(profiles_ini_dir);
    let profile = home.join(profile_dir);
    std::fs::create_dir_all(&ini_dir).expect("deberia poder crearse el directorio de profiles.ini");
    std::fs::create_dir_all(&profile).expect("deberia poder crearse el perfil");
    std::fs::write(profile.join("cert9.db"), b"").expect("deberia poder escribirse");
    let name = profile.file_name().expect("el perfil tiene nombre");
    std::fs::write(
        ini_dir.join("profiles.ini"),
        format!(
            "[Profile0]\nIsRelative=1\nPath={}\n",
            name.to_string_lossy()
        ),
    )
    .expect("deberia poder escribirse");
    profile
}

mod browser_stores;
mod modules_report;
mod profile_discovery;

fn a_firefox_class() -> StoreClass {
    StoreClass::Browser(owned_by("Firefox", BrowserChannel::Native))
}
