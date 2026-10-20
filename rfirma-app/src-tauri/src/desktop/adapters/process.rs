//! Lo que este proceso sabe de sí mismo: su línea de órdenes, su carpeta, su relanzamiento y el proceso de sede de cada URL que macOS entrega por Apple Event; no decide el rol.

use std::path::Path;

use crate::desktop::adapters::debug_info::{this_process_owner, this_process_report};
use crate::desktop::adapters::paths::Platform;
use crate::desktop::application::debug_report::debug_report_text;
use crate::desktop::application::invocation::{
    arguments_before_the_single_instance, debug_info_was_asked_for, delivered_urls,
    help_was_asked_for, informative_text, Arguments, Invocation, RunningBuild,
};
use crate::desktop::domain::channel::Channel;
use crate::signing::adapters::ffi::{candidates, locate};

/// La invocación con la que arrancó este proceso.
pub fn this_invocation() -> Invocation {
    Invocation {
        command_line: std::env::args_os()
            .map(|argument| argument.to_string_lossy().into_owned())
            .collect(),
        folder: std::env::current_dir().unwrap_or_default(),
    }
}

/// Asegura que los argumentos de la línea de órdenes tengan codificación UTF-8 válida.
pub fn make_the_command_line_readable() {
    let Arguments::RerunWith(arguments) = arguments_before_the_single_instance(std::env::args_os())
    else {
        return;
    };
    let executable = match std::env::current_exe() {
        Ok(executable) => executable,
        Err(error) => {
            eprintln!(
                "rfirma: no se puede releer la línea de órdenes ilegible \
                 ({error}); el arranque sigue con ella tal cual"
            );
            return;
        }
    };
    match std::process::Command::new(executable)
        .args(arguments.iter().skip(1))
        .spawn()
    {
        Ok(_) => std::process::exit(0),
        Err(error) => eprintln!(
            "rfirma: no se puede volver a arrancar con la línea de órdenes ya \
             legible ({error}); el arranque sigue con ella tal cual"
        ),
    }
}

/// Lanza un proceso de sede por cada URL `afirma://` que traiga el evento, y dice si este sigue.
pub fn launch_the_delivered_urls(
    app: &tauri::AppHandle,
    event: &tauri::RunEvent,
    already_serving: bool,
) -> bool {
    let delivered = delivered_urls(urls_of(event), already_serving);
    for url in &delivered.site_launches {
        if let Some(child) = launch_a_site_process(url) {
            yield_the_foreground_to(app, child);
        }
    }
    delivered.this_process_goes_on
}

#[cfg(target_os = "macos")]
fn urls_of(event: &tauri::RunEvent) -> Vec<String> {
    match event {
        tauri::RunEvent::Opened { urls } => urls.iter().map(ToString::to_string).collect(),
        _ => Vec::new(),
    }
}

#[cfg(not(target_os = "macos"))]
fn urls_of(_: &tauri::RunEvent) -> Vec<String> {
    Vec::new()
}

fn launch_a_site_process(url: &str) -> Option<u32> {
    let launched = std::env::current_exe()
        .and_then(|executable| std::process::Command::new(executable).arg(url).spawn());
    match launched {
        Ok(mut child) => {
            let id = child.id();
            std::thread::spawn(move || child.wait());
            Some(id)
        }
        Err(error) => {
            eprintln!("rfirma: no se puede abrir la llamada de sede ({error})");
            None
        }
    }
}

/// Cuánto se espera a que macOS registre el proceso de sede para cederle el primer plano.
#[cfg(target_os = "macos")]
const YIELD_ATTEMPTS: u32 = 40;
#[cfg(target_os = "macos")]
const YIELD_INTERVAL: std::time::Duration = std::time::Duration::from_millis(50);

/// Cede el primer plano al proceso de sede: macOS trae al frente este, y sin cederlo la ventana de escritorio tapa la de sede.
#[cfg(target_os = "macos")]
fn yield_the_foreground_to(app: &tauri::AppHandle, child: u32) {
    let app = app.clone();
    std::thread::spawn(move || {
        for _ in 0..YIELD_ATTEMPTS {
            let (sent, received) = std::sync::mpsc::channel();
            let asked = app.run_on_main_thread(move || {
                let _ = sent.send(yielded_to(child));
            });
            if asked.is_err() || received.recv().unwrap_or(true) {
                return;
            }
            std::thread::sleep(YIELD_INTERVAL);
        }
    });
}

#[cfg(target_os = "macos")]
fn yielded_to(child: u32) -> bool {
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSApplication, NSRunningApplication};

    let (Some(main_thread), Ok(pid)) = (MainThreadMarker::new(), i32::try_from(child)) else {
        return true;
    };
    let Some(running) = NSRunningApplication::runningApplicationWithProcessIdentifier(pid) else {
        return false;
    };
    NSApplication::sharedApplication(main_thread).yieldActivationToApplication(&running);
    true
}

#[cfg(not(target_os = "macos"))]
fn yield_the_foreground_to(_: &tauri::AppHandle, _: u32) {}

/// Abre el escritorio cuando macOS reactiva un proceso de sede: Spotlight y el Dock reabren la instancia viva en vez de lanzar otra.
pub fn launch_the_desktop_on_reopen(app: &tauri::AppHandle, event: &tauri::RunEvent) {
    if !reopened(event) {
        return;
    }
    let launched = std::env::current_exe()
        .and_then(|executable| std::process::Command::new(executable).spawn());
    match launched {
        Ok(mut child) => {
            yield_the_foreground_to_this_bundle(app);
            std::thread::spawn(move || child.wait());
        }
        Err(error) => eprintln!("rfirma: no se puede abrir el escritorio ({error})"),
    }
}

#[cfg(target_os = "macos")]
fn reopened(event: &tauri::RunEvent) -> bool {
    matches!(event, tauri::RunEvent::Reopen { .. })
}

#[cfg(not(target_os = "macos"))]
fn reopened(_: &tauri::RunEvent) -> bool {
    false
}

/// Cede el primer plano a cualquier instancia de rFirma: el escritorio puede ser uno nuevo o el que ya estaba abierto.
#[cfg(target_os = "macos")]
fn yield_the_foreground_to_this_bundle(app: &tauri::AppHandle) {
    use objc2::MainThreadMarker;
    use objc2_app_kit::NSApplication;
    use objc2_foundation::NSString;

    if let Some(main_thread) = MainThreadMarker::new() {
        NSApplication::sharedApplication(main_thread)
            .yieldActivationToApplicationWithBundleIdentifier(&NSString::from_str(
                &app.config().identifier,
            ));
    }
}

#[cfg(not(target_os = "macos"))]
fn yield_the_foreground_to_this_bundle(_: &tauri::AppHandle) {}

/// Imprime la ayuda, el diagnóstico o la versión si la línea de órdenes los pide, y dice si lo hizo.
pub fn printed_the_informative_text(command_line: &[String]) -> bool {
    if !help_was_asked_for(command_line) && debug_info_was_asked_for(command_line) {
        println!(
            "{}",
            debug_report_text(&this_process_report(), &this_process_owner())
        );
        return true;
    }
    let library = native_library_found_or_looked_for();
    let build = RunningBuild {
        channel: Channel::detected().label(),
        system: &format!("{} {}", std::env::consts::OS, std::env::consts::ARCH),
        library: &library,
    };
    let text = informative_text(
        command_line,
        env!("CARGO_PKG_VERSION"),
        build,
        Platform::CURRENT,
    );
    text.inspect(|text| println!("{text}")).is_some()
}

fn native_library_found_or_looked_for() -> String {
    let executable = std::env::current_exe().unwrap_or_default();
    let directory = executable.parent().unwrap_or(Path::new("."));
    let environment = |name: &str| std::env::var_os(name);
    let owner = this_process_owner();
    match locate(&environment, directory) {
        Ok(path) => owner.anonymized(&path),
        Err(_) => {
            let looked_at: Vec<String> = candidates(&environment, directory)
                .iter()
                .map(|candidate| {
                    format!(
                        "{} ({})",
                        owner.anonymized(&candidate.library_path()),
                        candidate.origin()
                    )
                })
                .collect();
            format!("no encontrada, buscada en {}", looked_at.join("; "))
        }
    }
}
