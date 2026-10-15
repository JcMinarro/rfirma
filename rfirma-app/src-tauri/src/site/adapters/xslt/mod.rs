//! La transformación XSLT 1.0 de un documento con una hoja, sobre libxslt y libxml2 por un FFI propio.

use std::ffi::{c_char, c_int, c_void};
use std::ptr;
use std::sync::{Mutex, PoisonError};

#[cfg(target_os = "linux")]
#[path = "loaded.rs"]
mod binding;
#[cfg(not(target_os = "linux"))]
#[path = "linked.rs"]
mod binding;

type Document = *mut c_void;
type Stylesheet = *mut c_void;
type XmlFree = unsafe extern "C" fn(*mut c_void);

const NO_NETWORK: c_int = 1 << 11;

/// Las funciones de libxml2 y libxslt que usa la transformación.
struct Functions {
    read_memory:
        unsafe extern "C" fn(*const c_char, c_int, *const c_char, *const c_char, c_int) -> Document,
    free_document: unsafe extern "C" fn(Document),
    free: &'static XmlFree,
    parse_stylesheet: unsafe extern "C" fn(Document) -> Stylesheet,
    apply_stylesheet: unsafe extern "C" fn(Stylesheet, Document, *const *const c_char) -> Document,
    save_result: unsafe extern "C" fn(*mut *mut u8, *mut c_int, Document, Stylesheet) -> c_int,
    free_stylesheet: unsafe extern "C" fn(Stylesheet),
}

// La libxslt de Windows se compila sin hilos: una transformación a la vez.
static ONE_AT_A_TIME: Mutex<()> = Mutex::new(());

/// El resultado de aplicar `stylesheet` a `document`, o `None` si alguno no se analiza o la hoja falla.
pub fn transform(document: &[u8], stylesheet: &[u8]) -> Option<String> {
    let functions = binding::functions()?;
    let _turn = ONE_AT_A_TIME.lock().unwrap_or_else(PoisonError::into_inner);
    // SAFETY: cada puntero que devuelve libxml2 o libxslt se comprueba y se libera una vez.
    unsafe { functions.transform(document, stylesheet) }
}

struct Owned {
    pointer: *mut c_void,
    release: unsafe extern "C" fn(*mut c_void),
}

impl Owned {
    fn new(pointer: *mut c_void, release: unsafe extern "C" fn(*mut c_void)) -> Option<Self> {
        (!pointer.is_null()).then_some(Self { pointer, release })
    }
}

impl Drop for Owned {
    fn drop(&mut self) {
        // SAFETY: `pointer` no es nulo y solo lo libera este `Owned`.
        unsafe { (self.release)(self.pointer) }
    }
}

impl Functions {
    unsafe fn transform(&self, document: &[u8], stylesheet: &[u8]) -> Option<String> {
        let style = self.compile(stylesheet)?;
        let source = Owned::new(self.parse(document)?, self.free_document)?;
        let result = Owned::new(
            (self.apply_stylesheet)(style.pointer, source.pointer, ptr::null()),
            self.free_document,
        )?;
        let mut text = ptr::null_mut();
        let mut length = 0;
        if (self.save_result)(&mut text, &mut length, result.pointer, style.pointer) != 0 {
            return None;
        }
        let text = Owned::new(text.cast(), *self.free)?;
        let length = usize::try_from(length).ok()?;
        let bytes = std::slice::from_raw_parts(text.pointer.cast::<u8>(), length);
        String::from_utf8(bytes.to_vec()).ok()
    }

    unsafe fn compile(&self, stylesheet: &[u8]) -> Option<Owned> {
        let tree = self.parse(stylesheet)?;
        let compiled = (self.parse_stylesheet)(tree);
        if compiled.is_null() {
            (self.free_document)(tree);
        }
        Owned::new(compiled, self.free_stylesheet)
    }

    unsafe fn parse(&self, bytes: &[u8]) -> Option<Document> {
        let length = c_int::try_from(bytes.len()).ok()?;
        let tree = (self.read_memory)(
            bytes.as_ptr().cast(),
            length,
            ptr::null(),
            ptr::null(),
            NO_NETWORK,
        );
        (!tree.is_null()).then_some(tree)
    }
}

#[cfg(test)]
mod tests;
