//! La tabla de navegadores y su cruce con el canal de distribución del navegador: dónde puede estar cada Almacén NSS y de quién es, sin mirar el disco.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// El canal de distribución del navegador: cómo llegó a la máquina el dueño de un Almacén NSS.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum BrowserChannel {
    Native,
    Snap,
    Flatpak,
}

const CHANNELS: [BrowserChannel; 3] = [
    BrowserChannel::Native,
    BrowserChannel::Snap,
    BrowserChannel::Flatpak,
];

/// El directorio de un snap en el que el navegador guarda sus datos.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum SnapRoot {
    Current,
    Common,
}

/// Un snap: su nombre y la raíz de sus datos.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct Snap {
    pub name: &'static str,
    pub root: SnapRoot,
}

/// Los directorios lógicos que el canal resuelve: `{home}`, `{config}` y `{data}`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum LogicalRoot {
    Home,
    Config,
    Data,
}

/// Una ruta relativa a un directorio lógico.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct LogicalPath {
    pub root: LogicalRoot,
    pub relative: &'static str,
}

/// Cómo se encuentra un almacén: una base NSS fija o los perfiles que declara un `profiles.ini`.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Layout {
    Database(LogicalPath),
    Profiles {
        ini: LogicalPath,
        profiles: LogicalPath,
    },
}

/// Una disposición y los canales en los que se ha medido.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct StoreLayout {
    pub layout: Layout,
    pub channels: &'static [BrowserChannel],
}

/// La familia del navegador, que fija la disposición de su almacén.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum BrowserFamily {
    Firefox(&'static [StoreLayout]),
    Chromium,
}

impl BrowserFamily {
    /// Si es la familia Firefox.
    pub fn is_firefox(self) -> bool {
        matches!(self, Self::Firefox(_))
    }

    fn layouts(self) -> &'static [StoreLayout] {
        match self {
            Self::Firefox(layouts) => layouts,
            Self::Chromium => CHROMIUM_LAYOUTS,
        }
    }
}

/// Una fila de la tabla de navegadores.
#[derive(Clone, Copy, PartialEq, Eq, Hash)]
pub struct Browser {
    pub name: &'static str,
    pub family: BrowserFamily,
    pub snap: Option<Snap>,
    pub flatpak: Option<&'static str>,
}

impl std::fmt::Debug for Browser {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.name)
    }
}

impl Browser {
    fn home_under(&self, home: &Path, channel: BrowserChannel) -> Option<PathBuf> {
        match channel {
            BrowserChannel::Native => Some(home.to_path_buf()),
            BrowserChannel::Snap => self.snap.map(|snap| {
                let root = match snap.root {
                    SnapRoot::Current => "current",
                    SnapRoot::Common => "common",
                };
                home.join("snap").join(snap.name).join(root)
            }),
            BrowserChannel::Flatpak => self.flatpak.map(|id| home.join(".var/app").join(id)),
        }
    }
}

const NATIVE: &[BrowserChannel] = &[BrowserChannel::Native];
const NATIVE_AND_SNAP: &[BrowserChannel] = &[BrowserChannel::Native, BrowserChannel::Snap];
const NATIVE_AND_FLATPAK: &[BrowserChannel] = &[BrowserChannel::Native, BrowserChannel::Flatpak];

const fn at(root: LogicalRoot, relative: &'static str) -> LogicalPath {
    LogicalPath { root, relative }
}

const fn beside_its_ini(directory: LogicalPath) -> Layout {
    Layout::Profiles {
        ini: directory,
        profiles: directory,
    }
}

const FIREFOX_LAYOUTS: &[StoreLayout] = &[
    StoreLayout {
        layout: beside_its_ini(at(LogicalRoot::Home, ".mozilla/firefox")),
        channels: &CHANNELS,
    },
    StoreLayout {
        layout: Layout::Profiles {
            ini: at(LogicalRoot::Config, "mozilla/firefox"),
            profiles: at(LogicalRoot::Data, "mozilla/firefox"),
        },
        channels: NATIVE_AND_FLATPAK,
    },
];

const LIBREWOLF_LAYOUTS: &[StoreLayout] = &[
    StoreLayout {
        layout: beside_its_ini(at(LogicalRoot::Home, ".librewolf")),
        channels: NATIVE,
    },
    StoreLayout {
        layout: beside_its_ini(at(LogicalRoot::Config, "librewolf/librewolf")),
        channels: NATIVE_AND_FLATPAK,
    },
];

const CHROMIUM_LAYOUTS: &[StoreLayout] = &[
    StoreLayout {
        layout: Layout::Database(at(LogicalRoot::Home, ".pki/nssdb")),
        channels: NATIVE_AND_SNAP,
    },
    StoreLayout {
        layout: Layout::Database(at(LogicalRoot::Data, "pki/nssdb")),
        channels: &CHANNELS,
    },
];

/// La tabla de navegadores, en el orden en que se prefieren sus almacenes dentro de cada familia.
pub static BROWSERS: [Browser; 7] = [
    Browser {
        name: "Firefox",
        family: BrowserFamily::Firefox(FIREFOX_LAYOUTS),
        snap: Some(Snap {
            name: "firefox",
            root: SnapRoot::Common,
        }),
        flatpak: Some("org.mozilla.firefox"),
    },
    Browser {
        name: "LibreWolf",
        family: BrowserFamily::Firefox(LIBREWOLF_LAYOUTS),
        snap: None,
        flatpak: Some("io.gitlab.librewolf-community"),
    },
    Browser {
        name: "Chrome",
        family: BrowserFamily::Chromium,
        snap: None,
        flatpak: Some("com.google.Chrome"),
    },
    Browser {
        name: "Chromium",
        family: BrowserFamily::Chromium,
        snap: Some(Snap {
            name: "chromium",
            root: SnapRoot::Current,
        }),
        flatpak: Some("org.chromium.Chromium"),
    },
    Browser {
        name: "Brave",
        family: BrowserFamily::Chromium,
        snap: Some(Snap {
            name: "brave",
            root: SnapRoot::Current,
        }),
        flatpak: Some("com.brave.Browser"),
    },
    Browser {
        name: "Edge",
        family: BrowserFamily::Chromium,
        snap: None,
        flatpak: Some("com.microsoft.Edge"),
    },
    Browser {
        name: "Vivaldi",
        family: BrowserFamily::Chromium,
        snap: Some(Snap {
            name: "vivaldi",
            root: SnapRoot::Current,
        }),
        flatpak: Some("com.vivaldi.Vivaldi"),
    },
];

/// La fila de la tabla con ese nombre propio.
pub fn browser_named(name: &str) -> Option<&'static Browser> {
    BROWSERS.iter().find(|browser| browser.name == name)
}

/// De quién es un Almacén NSS:un navegador por un canal, o el almacén nativo que comparte la familia Chromium.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum NssOwner {
    Browser {
        browser: &'static Browser,
        channel: BrowserChannel,
    },
    SharedChromium,
}

#[derive(Serialize, Deserialize)]
enum OwnerRecord {
    Browser {
        browser: String,
        channel: BrowserChannel,
    },
    SharedChromium,
}

impl Serialize for NssOwner {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match *self {
            Self::Browser { browser, channel } => OwnerRecord::Browser {
                browser: browser.name.to_owned(),
                channel,
            },
            Self::SharedChromium => OwnerRecord::SharedChromium,
        }
        .serialize(serializer)
    }
}

/// El dueño escrito en el fichero de estado, o ninguno si nombra un navegador que ya no está en la tabla.
pub fn owner_if_still_known<'de, D: Deserializer<'de>>(
    deserializer: D,
) -> Result<Option<NssOwner>, D::Error> {
    Ok(
        Option::<OwnerRecord>::deserialize(deserializer)?.and_then(|record| match record {
            OwnerRecord::Browser { browser, channel } => {
                browser_named(&browser).map(|browser| NssOwner::Browser { browser, channel })
            }
            OwnerRecord::SharedChromium => Some(NssOwner::SharedChromium),
        }),
    )
}

impl NssOwner {
    /// Qué copia se prefiere dentro de una familia: el almacén compartido, y luego el orden de la tabla y nativo, snap y flatpak.
    pub fn preference(self) -> usize {
        match self {
            Self::SharedChromium => 0,
            Self::Browser { browser, channel } => {
                let row = BROWSERS
                    .iter()
                    .position(|listed| listed == browser)
                    .unwrap_or(BROWSERS.len());
                let channel = CHANNELS
                    .iter()
                    .position(|listed| *listed == channel)
                    .unwrap_or(CHANNELS.len());
                1 + row * CHANNELS.len() + channel
            }
        }
    }

    /// Si el dueño es de la familia Firefox.
    pub fn is_firefox_family(self) -> bool {
        match self {
            Self::Browser { browser, .. } => browser.family.is_firefox(),
            Self::SharedChromium => false,
        }
    }
}

/// Una disposición ya resuelta en rutas del disco.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ResolvedLayout {
    Database(PathBuf),
    Profiles { ini: PathBuf, profiles: PathBuf },
}

/// Dónde puede estar un Almacén NSS y de quién sería.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NssCandidate {
    pub layout: ResolvedLayout,
    pub owner: NssOwner,
}

/// Las candidatas de toda la tabla bajo `home`: la familia Firefox y luego la Chromium; dentro, el orden de la tabla y nativo, snap y flatpak.
pub fn nss_candidates(home: &Path) -> Vec<NssCandidate> {
    let mut candidates = Vec::new();
    for browser in BROWSERS
        .iter()
        .filter(|browser| browser.family.is_firefox())
    {
        for channel in CHANNELS {
            push_browser_layouts(&mut candidates, home, browser, channel);
        }
    }
    push_layouts(
        &mut candidates,
        BrowserFamily::Chromium,
        &LogicalDirectories::of(home, home, BrowserChannel::Native),
        BrowserChannel::Native,
        NssOwner::SharedChromium,
    );
    for browser in BROWSERS
        .iter()
        .filter(|browser| !browser.family.is_firefox())
    {
        for channel in [BrowserChannel::Snap, BrowserChannel::Flatpak] {
            push_browser_layouts(&mut candidates, home, browser, channel);
        }
    }
    candidates
}

fn push_browser_layouts(
    candidates: &mut Vec<NssCandidate>,
    home: &Path,
    browser: &'static Browser,
    channel: BrowserChannel,
) {
    let Some(browser_home) = browser.home_under(home, channel) else {
        return;
    };
    push_layouts(
        candidates,
        browser.family,
        &LogicalDirectories::of(home, &browser_home, channel),
        channel,
        NssOwner::Browser { browser, channel },
    );
}

fn push_layouts(
    candidates: &mut Vec<NssCandidate>,
    family: BrowserFamily,
    directories: &LogicalDirectories,
    channel: BrowserChannel,
    owner: NssOwner,
) {
    for store in family.layouts() {
        if !store.channels.contains(&channel) {
            continue;
        }
        let layout = match store.layout {
            Layout::Database(at) => ResolvedLayout::Database(directories.resolve(at)),
            Layout::Profiles { ini, profiles } => ResolvedLayout::Profiles {
                ini: directories.resolve(ini),
                profiles: directories.resolve(profiles),
            },
        };
        candidates.push(NssCandidate { layout, owner });
    }
}

struct LogicalDirectories {
    home: PathBuf,
    config: PathBuf,
    data: PathBuf,
}

impl LogicalDirectories {
    fn of(user_home: &Path, browser_home: &Path, channel: BrowserChannel) -> Self {
        let (config, data) = match channel {
            BrowserChannel::Native => (user_home.join(".config"), user_home.join(".local/share")),
            BrowserChannel::Snap => (
                browser_home.join(".config"),
                browser_home.join(".local/share"),
            ),
            BrowserChannel::Flatpak => (browser_home.join("config"), browser_home.join("data")),
        };
        Self {
            home: browser_home.to_path_buf(),
            config,
            data,
        }
    }

    fn resolve(&self, path: LogicalPath) -> PathBuf {
        let root = match path.root {
            LogicalRoot::Home => &self.home,
            LogicalRoot::Config => &self.config,
            LogicalRoot::Data => &self.data,
        };
        root.join(path.relative)
    }
}
