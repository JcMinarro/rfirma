//! El manifiesto de Flatpak concede exactamente un `--filesystem` por cada ruta de Almacén NSS que exige la tabla de navegadores, y lo comprueba leyéndolo como texto.

use std::collections::BTreeSet;
use std::path::Path;

use rfirma_lib::identity::domain::browsers::{nss_candidates, ResolvedLayout};

const FAKE_HOME: &str = "/home/someone";
const GRANT_PREFIX: &str = "--filesystem=~/";

fn required_grants() -> BTreeSet<String> {
    let home = Path::new(FAKE_HOME);
    nss_candidates(home)
        .into_iter()
        .flat_map(|candidate| match candidate.layout {
            ResolvedLayout::Database(path) => vec![path],
            ResolvedLayout::Profiles { ini, profiles } => vec![ini, profiles],
        })
        .map(|path| {
            let relative = path
                .strip_prefix(home)
                .expect("toda candidata cuelga del home");
            format!("{GRANT_PREFIX}{}", relative.display())
        })
        .collect()
}

fn store_grants_in(manifest: &str) -> BTreeSet<String> {
    manifest
        .lines()
        .map(str::trim)
        .filter_map(|line| line.strip_prefix("- "))
        .filter(|line| line.starts_with(GRANT_PREFIX))
        .map(str::to_string)
        .collect()
}

fn mismatches(required: &BTreeSet<String>, manifest: &str) -> Vec<String> {
    let granted = store_grants_in(manifest);
    let missing = required
        .difference(&granted)
        .map(|line| format!("falta en el manifiesto; hay que añadir: - {line}"));
    let surplus = granted
        .difference(required)
        .map(|line| format!("sobra en el manifiesto, la tabla no lo exige: - {line}"));
    missing.chain(surplus).collect()
}

fn real_manifest() -> String {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .nth(2)
        .expect("src-tauri debería colgar de la raíz del repositorio")
        .join("packaging/flatpak/me.sgomez.rfirma.yml");
    std::fs::read_to_string(&path)
        .unwrap_or_else(|error| panic!("debería leerse {path:?}: {error}"))
}

#[test]
fn manifest_grants_exactly_what_the_table_requires() {
    let problems = mismatches(&required_grants(), &real_manifest());
    assert!(problems.is_empty(), "{}", problems.join("\n"));
}

#[test]
fn a_missing_grant_is_reported_with_the_exact_line_to_add() {
    let manifest = real_manifest().replace(
        "  - --filesystem=~/.var/app/com.google.Chrome/data/pki/nssdb\n",
        "",
    );
    let problems = mismatches(&required_grants(), &manifest);
    assert_eq!(
        problems,
        ["falta en el manifiesto; hay que añadir: - --filesystem=~/.var/app/com.google.Chrome/data/pki/nssdb"]
    );
}

#[test]
fn a_grant_the_table_no_longer_asks_for_is_pointed_out() {
    let manifest = real_manifest().replace(
        "  - --filesystem=~/.librewolf\n",
        "  - --filesystem=~/.librewolf\n  - --filesystem=~/.var/app/org.example.Gone/data/pki/nssdb\n",
    );
    let problems = mismatches(&required_grants(), &manifest);
    assert_eq!(
        problems,
        ["sobra en el manifiesto, la tabla no lo exige: - --filesystem=~/.var/app/org.example.Gone/data/pki/nssdb"]
    );
}

#[test]
fn requirements_cover_native_snap_and_flatpak_candidates() {
    let required = required_grants();
    for expected in [
        "--filesystem=~/.pki/nssdb",
        "--filesystem=~/snap/chromium/current/.pki/nssdb",
        "--filesystem=~/.var/app/com.google.Chrome/data/pki/nssdb",
    ] {
        assert!(required.contains(expected), "no exige {expected}");
    }
}

#[test]
fn grants_that_are_not_store_paths_are_ignored() {
    let manifest = "  - --share=network\n  - --filesystem=xdg-documents\n  - --socket=pcsc\n";
    assert!(store_grants_in(manifest).is_empty());
}
