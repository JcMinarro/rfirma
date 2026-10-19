//! Quién abre un esquema de URL en macOS, según LaunchServices: lo lee siempre y solo lo escribe cuando la persona elige (ADR-0040).

pub mod ns_workspace;

use std::path::{Path, PathBuf};

use crate::desktop::domain::error::{DesktopError, Situation};
use crate::desktop::domain::handlers::{UrlHandler, OUR_DESKTOP_FILE};
use crate::desktop::ports::HandlerRegistry;

/// Una aplicación que declara el esquema.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct InstalledApp {
    pub path: PathBuf,
    pub name: String,
}

/// Lo que LaunchServices sabe de un esquema y cómo se le cambia la aplicación.
pub trait Workspace {
    /// Las aplicaciones que declaran el esquema.
    fn applications_for(&self, scheme: &str) -> Vec<InstalledApp>;

    /// La aplicación que lo abre hoy.
    fn default_for(&self, scheme: &str) -> Option<PathBuf>;

    /// Deja esa aplicación como la que lo abre.
    fn set_default_for(&self, scheme: &str, app: &Path) -> Result<(), String>;
}

/// El registro de manejadores sobre LaunchServices, con el `.app` que es rFirma.
pub struct LaunchServices<W> {
    workspace: W,
    ours: PathBuf,
}

impl<W: Workspace> LaunchServices<W> {
    /// El registro sobre `workspace`, con `ours` como rFirma.
    pub fn new(workspace: W, ours: PathBuf) -> Self {
        Self { workspace, ours }
    }

    fn is_ours(&self, app: &Path) -> bool {
        same_app(app, &self.ours)
    }

    fn id_of(&self, app: &Path) -> String {
        if self.is_ours(app) {
            return OUR_DESKTOP_FILE.to_owned();
        }
        app.display().to_string()
    }

    fn app_of(&self, scheme: &str, handler: &str) -> Option<PathBuf> {
        if handler == OUR_DESKTOP_FILE {
            return Some(self.ours.clone());
        }
        self.workspace
            .applications_for(scheme)
            .into_iter()
            .map(|app| app.path)
            .find(|path| self.id_of(path) == handler)
    }

    fn set_default(&self, scheme: &str, app: &Path) -> Result<(), DesktopError> {
        self.workspace
            .set_default_for(scheme, app)
            .map_err(|reason| DesktopError::new(Situation::TheListIsNotWritable, reason))
    }
}

impl<W: Workspace> HandlerRegistry for LaunchServices<W> {
    fn registered_for(&self, scheme: &str) -> Option<Vec<UrlHandler>> {
        let mut handlers: Vec<UrlHandler> = Vec::new();
        for app in self.workspace.applications_for(scheme) {
            let id = self.id_of(&app.path);
            if !handlers.iter().any(|already| already.id == id) {
                handlers.push(UrlHandler { id, name: app.name });
            }
        }
        Some(handlers)
    }

    fn current_default_for(&self, scheme: &str) -> Option<String> {
        self.workspace
            .default_for(scheme)
            .map(|app| self.id_of(&app))
    }

    fn choose_for(&self, scheme: &str, handler: &str) -> Result<(), DesktopError> {
        let app = self.app_of(scheme, handler).ok_or_else(|| {
            DesktopError::new(
                Situation::TheListIsNotWritable,
                format!("«{handler}» no declara {scheme}://"),
            )
        })?;
        self.set_default(scheme, &app)
    }

    /// LaunchServices no deja un esquema sin aplicación: si lo abre rFirma, pasa a la siguiente que lo declare.
    fn remove_for(&self, scheme: &str) -> Result<(), DesktopError> {
        if !self
            .workspace
            .default_for(scheme)
            .is_some_and(|app| self.is_ours(&app))
        {
            return Ok(());
        }
        match self
            .workspace
            .applications_for(scheme)
            .into_iter()
            .find(|app| !self.is_ours(&app.path))
        {
            Some(other) => self.set_default(scheme, &other.path),
            None => Ok(()),
        }
    }
}

fn same_app(app: &Path, ours: &Path) -> bool {
    let canonical = |path: &Path| path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    !ours.as_os_str().is_empty() && canonical(app) == canonical(ours)
}

/// El LaunchServices de la sesión, con el `.app` que está corriendo como rFirma.
pub fn of_this_app() -> LaunchServices<ns_workspace::SystemWorkspace> {
    let executable = std::env::current_exe().unwrap_or_default();
    LaunchServices::new(ns_workspace::SystemWorkspace, bundle_of(&executable))
}

/// El `.app` que contiene el ejecutable o, fuera de uno, el ejecutable.
pub fn bundle_of(executable: &Path) -> PathBuf {
    executable
        .ancestors()
        .find(|folder| {
            folder
                .extension()
                .is_some_and(|extension| extension == "app")
        })
        .unwrap_or(executable)
        .to_path_buf()
}

#[cfg(test)]
mod tests;
