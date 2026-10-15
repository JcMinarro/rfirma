# La factura electrónica se ve con la hoja de estilos del Gobierno, transformada en Rust y aislada en su propio marco

Cuando la sede manda a firmar una FacturaE, el visor no enseña su XML: enseña la
factura como la pinta la hoja de estilos XSLT del visor de FACe, la que publica el
CTT. rFirma no diseña una vista propia de la factura, y así la persona ve lo mismo
que verá la Administración que la recibe.

1. **La hoja se distribuye tal cual, sin modificar**, una por versión del formato.
   El tipo FacturaE lo detecta rFirma en los bytes (ADR-0050), y la hoja que toca,
   el espacio de nombres de la raíz. Una FacturaE de una versión sin hoja se ve como
   cualquier otro XML.
2. **La transformación la hace Rust con libxslt, nunca el webview.** Chromium, y con
   él WebView2, retira XSLT del navegador, y WebKit y Firefox anuncian lo mismo.
   libxslt es la del sistema en Linux, donde WebKitGTK ya la enlaza, y en macOS. En
   Windows se compila desde las fuentes y se enlaza estática, como OpenSSL (ADR-0035).
3. **El HTML resultante se pinta en un marco aislado, servido por un esquema propio
   con su propia CSP**, que admite los scripts en línea de la hoja y nada más: ni
   red ni recursos externos. El marco no comparte origen con la ventana (`sandbox`
   sin `allow-same-origin`), así que sus scripts no alcanzan el IPC de Tauri. La CSP
   de la ventana solo cambia para admitir ese esquema en `frame-src`.
4. **Los scripts de la hoja se ejecutan.** No calculan nada, porque los importes
   vienen en la factura, pero sin ellos la factura sale incompleta: son los que
   traducen los códigos a texto (la clase de impuesto, la forma de pago, la
   residencia) y los que navegan entre las facturas de un lote.

## Consequences

- libxslt, una biblioteca de C, procesa bytes que manda la sede. Un fallo suyo se
  queda en el proceso del trámite (ADR-0024).
- Las hojas escapan todo el texto de la factura: ninguna usa
  `disable-output-escaping`. Una hoja nueva que lo use deja que el contenido de la
  sede escriba HTML y scripts dentro del marco, así que se revisa antes de añadirla.
- La factura no sigue el sistema de diseño de rFirma: se ve con el aspecto de FACe.
