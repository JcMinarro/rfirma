//! Canal de distribución en el que corre el proceso (ADR-0015).

/// Canal de distribución en el que corre el proceso (ADR-0015).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Channel {
    /// Instalación nativa sin aislamiento (.deb o .rpm).
    Native,
    /// Instalación en contenedor flatpak.
    Flatpak,
    /// Instalación de Windows, servida desde el servidor propio.
    Windows,
    /// Instalación de macOS, del `.dmg` o del tap de Homebrew.
    MacOs,
}

impl Channel {
    /// Nombre del canal tal como lo ve la persona usuaria.
    pub fn label(self) -> &'static str {
        match self {
            Self::Native => "nativo",
            Self::Flatpak => "flatpak",
            Self::Windows => "windows",
            Self::MacOs => "macos",
        }
    }

    /// Si la versión anunciada se puede instalar desde la aplicación.
    pub fn installs_from_the_app(self) -> bool {
        matches!(self, Self::Windows | Self::MacOs)
    }

    /// La entrada de `platforms` que el `latest.json` del canal trae para él, si lo sirve el servidor propio.
    pub fn updater_target(self) -> Option<&'static str> {
        match self {
            Self::Windows => Some("windows-x86_64"),
            Self::MacOs => Some("darwin-aarch64"),
            Self::Native | Self::Flatpak => None,
        }
    }
}
