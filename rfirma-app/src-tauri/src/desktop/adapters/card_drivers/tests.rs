use super::*;

#[test]
fn lists_the_bundles_sorted_by_name_and_ignores_other_files() {
    let directory = tempfile::tempdir().unwrap();
    for name in ["ifd-gempc.bundle", "ifd-ccid.bundle", "readme.txt"] {
        std::fs::create_dir(directory.path().join(name)).unwrap();
    }

    assert_eq!(
        card_drivers_in(directory.path()),
        vec!["ifd-ccid", "ifd-gempc"]
    );
}

#[test]
fn a_missing_directory_has_no_drivers() {
    assert!(card_drivers_in(Path::new("/nonexistent/drivers")).is_empty());
}
