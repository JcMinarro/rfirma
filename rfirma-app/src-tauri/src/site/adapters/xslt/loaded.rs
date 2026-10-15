//! La libxslt del sistema cargada con `dlopen`, y libxml2 a través de ella, que cambia de soname entre distribuciones.

use std::sync::OnceLock;

use libloading::Library;

use super::{Functions, XmlFree};

const LIBXSLT: &str = "libxslt.so.1";

pub(super) fn functions() -> Option<&'static Functions> {
    static FUNCTIONS: OnceLock<Option<Functions>> = OnceLock::new();
    // SAFETY: cada símbolo se lee con la firma que declaran las cabeceras de libxml2 y libxslt.
    FUNCTIONS.get_or_init(|| unsafe { load() }.ok()).as_ref()
}

unsafe fn load() -> Result<Functions, libloading::Error> {
    let library: &'static Library = Box::leak(Box::new(Library::new(LIBXSLT)?));
    Ok(Functions {
        read_memory: *library.get(b"xmlReadMemory\0")?,
        free_document: *library.get(b"xmlFreeDoc\0")?,
        free: &**library.get::<*const XmlFree>(b"xmlFree\0")?,
        parse_stylesheet: *library.get(b"xsltParseStylesheetDoc\0")?,
        apply_stylesheet: *library.get(b"xsltApplyStylesheet\0")?,
        save_result: *library.get(b"xsltSaveResultToString\0")?,
        free_stylesheet: *library.get(b"xsltFreeStylesheet\0")?,
        new_security_prefs: *library.get(b"xsltNewSecurityPrefs\0")?,
        set_security_pref: *library.get(b"xsltSetSecurityPrefs\0")?,
        forbid: *library.get(b"xsltSecurityForbid\0")?,
        set_default_security_prefs: *library.get(b"xsltSetDefaultSecurityPrefs\0")?,
    })
}
