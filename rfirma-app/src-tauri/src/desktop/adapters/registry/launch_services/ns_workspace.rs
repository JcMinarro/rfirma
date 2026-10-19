//! `SystemWorkspace`, el `NSWorkspace` de AppKit detrás de `Workspace`: toca LaunchServices de verdad y se prueba a mano.

use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Duration;

use block2::RcBlock;
use objc2::rc::{autoreleasepool, Retained};
use objc2_app_kit::NSWorkspace;
use objc2_foundation::{NSError, NSFileManager, NSString, NSURL};

use super::{InstalledApp, Workspace};

const THE_PERSON_CONFIRMS_WITHIN: Duration = Duration::from_secs(120);

/// El LaunchServices de la sesión de la persona.
pub struct SystemWorkspace;

impl Workspace for SystemWorkspace {
    fn applications_for(&self, scheme: &str) -> Vec<InstalledApp> {
        autoreleasepool(|_| {
            let Some(url) = url_of(scheme) else {
                return Vec::new();
            };
            let files = NSFileManager::defaultManager();
            NSWorkspace::sharedWorkspace()
                .URLsForApplicationsToOpenURL(&url)
                .iter()
                .filter_map(|app| {
                    let path = app.path()?;
                    Some(InstalledApp {
                        name: files.displayNameAtPath(&path).to_string(),
                        path: PathBuf::from(path.to_string()),
                    })
                })
                .collect()
        })
    }

    fn default_for(&self, scheme: &str) -> Option<PathBuf> {
        autoreleasepool(|_| {
            let url = url_of(scheme)?;
            let app = NSWorkspace::sharedWorkspace().URLForApplicationToOpenURL(&url)?;
            Some(PathBuf::from(app.path()?.to_string()))
        })
    }

    fn set_default_for(&self, scheme: &str, app: &Path) -> Result<(), String> {
        let (sender, answer) = mpsc::channel();
        let done = RcBlock::new(move |error: *mut NSError| {
            let outcome = unsafe { error.as_ref() }.map_or(Ok(()), |error| {
                Err(error.localizedDescription().to_string())
            });
            let _ = sender.send(outcome);
        });
        autoreleasepool(|_| {
            let app = NSURL::fileURLWithPath(&NSString::from_str(&app.to_string_lossy()));
            NSWorkspace::sharedWorkspace()
                .setDefaultApplicationAtURL_toOpenURLsWithScheme_completionHandler(
                    &app,
                    &NSString::from_str(scheme),
                    Some(&done),
                );
        });
        answer
            .recv_timeout(THE_PERSON_CONFIRMS_WITHIN)
            .map_err(|_| format!("macOS no ha confirmado quién abre {scheme}://"))?
    }
}

fn url_of(scheme: &str) -> Option<Retained<NSURL>> {
    NSURL::URLWithString(&NSString::from_str(&format!("{scheme}://")))
}
