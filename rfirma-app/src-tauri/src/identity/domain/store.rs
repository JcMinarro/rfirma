//! Un almacén de certificados: la ruta de su módulo y cómo se abre, sin abrirlo.

use std::path::{Path, PathBuf};

use crate::identity::domain::browsers::NssOwner;

/// Prefijo con el que se nombran los almacenes de Windows: ningún módulo PKCS#11 se llama así.
pub const WINDOWS_STORE_PREFIX: &str = "cng:";

/// Los proveedores de Windows que guardan la clave en una tarjeta: el KSP de los minidrivers y su CSP.
const CARD_KEY_PROVIDERS: [&str; 2] = [
    "Microsoft Smart Card Key Storage Provider",
    "Microsoft Base Smart Card Crypto Provider",
];

/// Si el proveedor de una clave del Almacén de Windows la guarda en una tarjeta (ADR-0035).
pub fn is_a_card_key_provider(provider: &str) -> bool {
    CARD_KEY_PROVIDERS
        .iter()
        .any(|card| card.eq_ignore_ascii_case(provider))
}

/// Clasificación del tipo de almacén para presentación en la interfaz (ADR-0011).
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum StoreClass {
    /// Tarjeta o token físico: un módulo PKCS#11, o una clave del Almacén de Windows en un proveedor de tarjeta.
    Card,
    /// Perfil de usuario del navegador Firefox.
    Firefox,
    /// Almacén NSS compartido de la familia Chromium.
    Chrome,
    /// Base de datos NSS genérica.
    Nssdb,
    /// Almacén correspondiente a un fichero PKCS#12 instalado.
    Installed,
    /// Almacén de certificados personales de Windows, servido por CNG (ADR-0035).
    Windows,
}

impl StoreClass {
    /// La clase de un almacén NSS según su dueño: la familia del navegador o, sin dueño, el NSS del sistema.
    pub fn of_nss_owner(owner: Option<NssOwner>) -> Self {
        match owner {
            Some(owner) if owner.is_firefox_family() => Self::Firefox,
            Some(_) => Self::Chrome,
            None => Self::Nssdb,
        }
    }

    /// Qué copia de un mismo certificado se prefiere: tarjeta, Windows, Almacén de rFirma, NSS del sistema, Firefox, Chrome.
    pub fn preference(self) -> u8 {
        match self {
            Self::Card => 0,
            Self::Windows => 1,
            Self::Installed => 2,
            Self::Nssdb => 3,
            Self::Firefox => 4,
            Self::Chrome => 5,
        }
    }
}

/// Almacén de certificados PKCS#11 o NSS con sus parámetros de apertura.
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct Store {
    module: PathBuf,
    init_args: Option<String>,
    installed: bool,
    owner: Option<NssOwner>,
}

impl Store {
    /// Construye un almacén PKCS#11 estándar sin parámetros adicionales.
    pub fn module(module: impl Into<PathBuf>) -> Self {
        Self {
            module: module.into(),
            init_args: None,
            installed: false,
            owner: None,
        }
    }

    /// Construye un almacén con parámetros de inicialización específicos.
    pub fn with_init_args(module: impl Into<PathBuf>, init_args: Option<String>) -> Self {
        Self {
            module: module.into(),
            init_args,
            installed: false,
            owner: None,
        }
    }

    /// Construye un almacén NSS en modo de solo lectura para un perfil.
    pub fn nss(softoken: impl Into<PathBuf>, profile: &Path) -> Self {
        Self {
            module: softoken.into(),
            init_args: Some(format!(
                "configdir='sql:{}' certPrefix='' keyPrefix='' secmod='secmod.db' flags=readOnly",
                profile.display()
            )),
            installed: false,
            owner: None,
        }
    }

    /// El Almacén de rFirma: se lista por contenido, sin PIN (ADR-0034).
    pub fn installed_nss(softoken: impl Into<PathBuf>, directory: &Path) -> Self {
        Self {
            installed: true,
            ..Self::nss(softoken, directory)
        }
    }

    /// El mismo almacén NSS, con el dueño que le dio el descubrimiento.
    pub fn owned_by(self, owner: impl Into<Option<NssOwner>>) -> Self {
        Self {
            owner: owner.into(),
            ..self
        }
    }

    /// El navegador o la familia dueña del almacén NSS, si el descubrimiento la conoce.
    pub fn owner(&self) -> Option<NssOwner> {
        self.owner
    }

    /// Ruta del módulo PKCS#11 que lo sirve.
    pub fn path(&self) -> &Path {
        &self.module
    }

    /// Parámetros de inicialización requeridos por el módulo.
    pub fn init_args(&self) -> Option<&str> {
        self.init_args.as_deref()
    }

    /// Clasifica el tipo de almacén considerando el directorio de instalación (ADR-0011).
    pub fn class_under(&self, installed_dir: &Path) -> StoreClass {
        if self.installed_directory_under(installed_dir).is_some() {
            StoreClass::Installed
        } else {
            self.class()
        }
    }

    /// Clasifica el tipo de almacén según sus parámetros.
    pub fn class(&self) -> StoreClass {
        if self.installed {
            return StoreClass::Installed;
        }
        if self.is_windows() {
            return StoreClass::Windows;
        }
        if self.profile().is_none() {
            return StoreClass::Card;
        }
        StoreClass::of_nss_owner(self.owner)
    }

    /// Si es un almacén de Windows y no un módulo PKCS#11.
    fn is_windows(&self) -> bool {
        self.module
            .to_str()
            .is_some_and(|module| module.starts_with(WINDOWS_STORE_PREFIX))
    }

    /// Directorio del perfil NSS si está configurado.
    fn profile(&self) -> Option<&str> {
        let args = self.init_args.as_deref()?;
        let after = args.split_once("configdir='")?.1;
        let inside = after.split_once('\'')?.0;
        Some(inside.strip_prefix("sql:").unwrap_or(inside))
    }

    /// El Almacén de rFirma, si este almacén es el que vive en `installed_dir` (ADR-0034).
    pub fn installed_directory_under(&self, installed_dir: &Path) -> Option<PathBuf> {
        let directory = PathBuf::from(self.profile()?);
        (directory == installed_dir && directory.join("cert9.db").is_file()).then_some(directory)
    }
}

impl From<&Path> for Store {
    fn from(module: &Path) -> Self {
        Self::module(module)
    }
}

impl From<PathBuf> for Store {
    fn from(module: PathBuf) -> Self {
        Self::module(module)
    }
}

impl From<&PathBuf> for Store {
    fn from(module: &PathBuf) -> Self {
        Self::module(module.clone())
    }
}

impl From<&str> for Store {
    fn from(module: &str) -> Self {
        Self::module(module)
    }
}

impl From<&Store> for Store {
    fn from(store: &Store) -> Self {
        store.clone()
    }
}
