//! libxml2 y libxslt enlazadas al binario: estáticas desde vcpkg en Windows y las del sistema en macOS, según `build.rs`.

use std::ffi::{c_char, c_int, c_void};
use std::sync::OnceLock;

use super::{Document, Functions, SecurityCheck, SecurityPrefs, Stylesheet, XmlFree};

extern "C" {
    fn xmlReadMemory(
        buffer: *const c_char,
        size: c_int,
        url: *const c_char,
        encoding: *const c_char,
        options: c_int,
    ) -> Document;
    fn xmlFreeDoc(document: Document);
    static xmlFree: XmlFree;
    fn xsltParseStylesheetDoc(document: Document) -> Stylesheet;
    fn xsltApplyStylesheet(
        stylesheet: Stylesheet,
        document: Document,
        parameters: *const *const c_char,
    ) -> Document;
    fn xsltSaveResultToString(
        text: *mut *mut u8,
        length: *mut c_int,
        result: Document,
        stylesheet: Stylesheet,
    ) -> c_int;
    fn xsltFreeStylesheet(stylesheet: Stylesheet);
    fn xsltNewSecurityPrefs() -> SecurityPrefs;
    fn xsltSetSecurityPrefs(prefs: SecurityPrefs, option: c_int, check: SecurityCheck) -> c_int;
    fn xsltSecurityForbid(
        prefs: SecurityPrefs,
        context: *mut c_void,
        value: *const c_char,
    ) -> c_int;
    fn xsltSetDefaultSecurityPrefs(prefs: SecurityPrefs);
}

pub(super) fn functions() -> Option<&'static Functions> {
    static FUNCTIONS: OnceLock<Functions> = OnceLock::new();
    Some(FUNCTIONS.get_or_init(|| Functions {
        read_memory: xmlReadMemory,
        free_document: xmlFreeDoc,
        // SAFETY: libxml2 inicializa `xmlFree` antes de que exista ningún documento que liberar.
        free: unsafe { &*std::ptr::addr_of!(xmlFree) },
        parse_stylesheet: xsltParseStylesheetDoc,
        apply_stylesheet: xsltApplyStylesheet,
        save_result: xsltSaveResultToString,
        free_stylesheet: xsltFreeStylesheet,
        new_security_prefs: xsltNewSecurityPrefs,
        set_security_pref: xsltSetSecurityPrefs,
        forbid: xsltSecurityForbid,
        set_default_security_prefs: xsltSetDefaultSecurityPrefs,
    }))
}
