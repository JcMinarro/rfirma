//! Las líneas de los almacenes del informe: los perfiles NSS, y el almacén de Windows con sus minidrivers y el de macOS con sus controladores.

use super::{section, MacosStores, NssProfileState, NssStores, ReportOwner, WindowsStores};

pub(super) fn windows_sections(stores: Option<&WindowsStores>) -> [Option<String>; 2] {
    let Some(stores) = stores else {
        return [None, None];
    };
    let trust = format!("Raíz del usuario: {}", profile_state(&stores.local_channel));
    let minidrivers = if stores.minidrivers.is_empty() {
        vec!["tarjetas: ninguno registrado".to_owned()]
    } else {
        stores
            .minidrivers
            .iter()
            .map(|name| format!("{name}: registrado"))
            .collect()
    };
    [
        section("Almacén de Windows", &[trust]),
        section("Minidrivers", &minidrivers),
    ]
}

pub(super) fn macos_sections(stores: Option<&MacosStores>) -> [Option<String>; 2] {
    let Some(stores) = stores else {
        return [None, None];
    };
    let trust = format!(
        "Confianza del usuario: {}",
        profile_state(&stores.local_channel)
    );
    let drivers = if stores.card_drivers.is_empty() {
        vec!["tarjetas: ninguno instalado".to_owned()]
    } else {
        stores
            .card_drivers
            .iter()
            .map(|name| format!("{name}: instalado"))
            .collect()
    };
    [
        section("Almacén de macOS", &[trust]),
        section("Controladores de tarjeta", &drivers),
    ]
}

pub(super) fn nss_lines(stores: &NssStores, owner: &ReportOwner) -> Vec<String> {
    let rfirma_store = if stores.rfirma_store_installed {
        "instalado"
    } else {
        "no instalado"
    };
    stores
        .profiles
        .iter()
        .flat_map(|profile| {
            [
                format!(
                    "{}: {}",
                    profile.owner.label(),
                    profile_state(&profile.state)
                ),
                format!("  ruta: {}", owner.anonymized(&profile.directory)),
            ]
        })
        .chain(std::iter::once(format!(
            "Almacén de rFirma: {rfirma_store}"
        )))
        .collect()
}

fn profile_state(state: &NssProfileState) -> String {
    match state {
        NssProfileState::TrustsLocalChannel { until: Some(date) } => {
            format!("confía en el canal local · hasta {date}")
        }
        NssProfileState::TrustsLocalChannel { until: None } => {
            "confía en el canal local".to_owned()
        }
        NssProfileState::DoesNotTrustLocalChannel => "no confía en el canal local".to_owned(),
        NssProfileState::IgnoredWithoutCertificateDatabase => "ignorado · sin cert9.db".to_owned(),
    }
}
