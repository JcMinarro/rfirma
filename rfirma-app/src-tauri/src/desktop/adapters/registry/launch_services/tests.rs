use std::cell::RefCell;
use std::path::{Path, PathBuf};

use super::*;
use crate::desktop::application::handlers::{chosen, who_handles, withdrawn, SCHEME};
use crate::desktop::domain::handlers::{UrlHandler, OUR_DESKTOP_FILE};
use crate::desktop::domain::withdrawal::Withdrawal;

const RFIRMA: &str = "/Applications/rFirma.app";
const AUTOFIRMA: &str = "/Applications/AutoFirma.app";

struct FakeWorkspace {
    apps: Vec<InstalledApp>,
    default: RefCell<Option<PathBuf>>,
    written: RefCell<Vec<PathBuf>>,
}

impl FakeWorkspace {
    fn with_both_installed_and_chosen(chosen: &str) -> Self {
        Self {
            apps: vec![an_app(RFIRMA, "rFirma"), an_app(AUTOFIRMA, "AutoFirma")],
            default: RefCell::new(Some(PathBuf::from(chosen))),
            written: RefCell::new(Vec::new()),
        }
    }

    fn written(&self) -> Vec<PathBuf> {
        self.written.borrow().clone()
    }
}

impl Workspace for &FakeWorkspace {
    fn applications_for(&self, scheme: &str) -> Vec<InstalledApp> {
        assert_eq!(scheme, SCHEME);
        self.apps.clone()
    }

    fn default_for(&self, scheme: &str) -> Option<PathBuf> {
        assert_eq!(scheme, SCHEME);
        self.default.borrow().clone()
    }

    fn set_default_for(&self, scheme: &str, app: &Path) -> Result<(), String> {
        assert_eq!(scheme, SCHEME);
        self.written.borrow_mut().push(app.to_path_buf());
        *self.default.borrow_mut() = Some(app.to_path_buf());
        Ok(())
    }
}

fn an_app(path: &str, name: &str) -> InstalledApp {
    InstalledApp {
        path: PathBuf::from(path),
        name: name.to_owned(),
    }
}

fn launch_services(workspace: &FakeWorkspace) -> LaunchServices<&FakeWorkspace> {
    LaunchServices::new(workspace, PathBuf::from(RFIRMA))
}

#[test]
fn rfirma_is_the_bundle_that_holds_the_running_executable() {
    assert_eq!(
        bundle_of(Path::new("/Applications/rFirma.app/Contents/MacOS/rfirma")),
        PathBuf::from(RFIRMA)
    );
}

#[test]
fn outside_a_bundle_rfirma_is_the_executable_itself() {
    let executable = Path::new("/Users/someone/rfirma/target/debug/rfirma");

    assert_eq!(bundle_of(executable), executable);
}

#[test]
fn with_autofirma_chosen_both_are_listed_and_autofirma_is_current() {
    let workspace = FakeWorkspace::with_both_installed_and_chosen(AUTOFIRMA);

    let view = who_handles(&launch_services(&workspace));

    assert!(view.available);
    assert_eq!(
        view.handlers,
        vec![
            UrlHandler {
                id: OUR_DESKTOP_FILE.to_owned(),
                name: "rFirma".to_owned(),
            },
            UrlHandler {
                id: AUTOFIRMA.to_owned(),
                name: "AutoFirma".to_owned(),
            },
        ]
    );
    assert_eq!(view.current.as_deref(), Some(AUTOFIRMA));
}

#[test]
fn reading_who_handles_the_scheme_never_takes_it() {
    let workspace = FakeWorkspace::with_both_installed_and_chosen(AUTOFIRMA);

    who_handles(&launch_services(&workspace));

    assert!(workspace.written().is_empty());
}

#[test]
fn choosing_rfirma_makes_it_the_one_that_opens_the_scheme() {
    let workspace = FakeWorkspace::with_both_installed_and_chosen(AUTOFIRMA);

    chosen(&launch_services(&workspace), OUR_DESKTOP_FILE).expect("debería elegirse");

    assert_eq!(workspace.written(), vec![PathBuf::from(RFIRMA)]);
    assert_eq!(
        who_handles(&launch_services(&workspace)).current.as_deref(),
        Some(OUR_DESKTOP_FILE)
    );
}

#[test]
fn choosing_autofirma_again_gives_the_scheme_back_to_it() {
    let workspace = FakeWorkspace::with_both_installed_and_chosen(RFIRMA);

    chosen(&launch_services(&workspace), AUTOFIRMA).expect("debería elegirse");

    assert_eq!(
        who_handles(&launch_services(&workspace)).current.as_deref(),
        Some(AUTOFIRMA)
    );
}

#[test]
fn choosing_an_application_that_does_not_declare_the_scheme_fails_without_writing() {
    let workspace = FakeWorkspace::with_both_installed_and_chosen(AUTOFIRMA);

    let failure = chosen(&launch_services(&workspace), "/Applications/Otra.app")
        .expect_err("no declara el esquema");

    assert!(!failure.detail().is_empty());
    assert!(workspace.written().is_empty());
}

#[test]
fn withdrawing_while_autofirma_is_chosen_leaves_it_untouched() {
    let workspace = FakeWorkspace::with_both_installed_and_chosen(AUTOFIRMA);

    let outcome = withdrawn(&launch_services(&workspace));

    assert_eq!(outcome, Withdrawal::WasNotThere);
    assert!(workspace.written().is_empty());
}

#[test]
fn withdrawing_rfirma_hands_the_scheme_back_to_autofirma() {
    let workspace = FakeWorkspace::with_both_installed_and_chosen(RFIRMA);

    let outcome = withdrawn(&launch_services(&workspace));

    assert_eq!(outcome, Withdrawal::Withdrawn);
    assert_eq!(
        who_handles(&launch_services(&workspace)).current.as_deref(),
        Some(AUTOFIRMA)
    );
}
