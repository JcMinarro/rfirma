# Ventana de sede

La ventana que abre rFirma cuando una **sede electrónica** lo invoca con
`afirma://`, o una orden de terminal con `-certgui`. Cubre el trámite entero: la
espera del canal, el consentimiento, la firma, el desenlace y la salida sin
certificado utilizable. Lo que se ve de cada momento lo dicen sus historias, no
esta ficha: ver «Historias». Aquí van el flujo entre momentos y el porqué de cada
decisión.

**Una sola ficha para toda la ventana, no una por momento.** Es una ventana con
una secuencia, no cinco pantallas independientes, y partirla obligaría a leer
varios ficheros para saber qué ve la persona de principio a fin. Es la excepción
declarada a la regla de «una ficha por pantalla» de
[prototyping.md](../agents/prototyping.md).

## Casos de uso que la usan

- **Firmar desde una sede electrónica**, de principio a fin: `sign` y `cosign`.
- **Ceder los datos de identidad a una sede** (`selectcert`): el mismo recorrido
  sin el momento de firma. **No es identificarse**: la operación devuelve el
  certificado público X.509 y nada más —ni reto, ni firma, ni prueba de que la
  clave privada sea de quien consiente—, así que la ventana nombra una cesión de
  datos personales y no promete una identificación.
- **Firmar un lote**, remoto o local, con el mismo consentimiento.
- **Guardar o cargar ficheros** por orden de la sede, donde la ventana solo
  nombra lo que el diálogo del portal está preguntando.
- **Firmar desde la terminal con `-certgui`** (ADR-0041): solo el consentimiento y
  el secreto; ver «Origen orden de terminal».

No la usa el recorrido de firma local, que es de
[`ventana-principal.md`](ventana-principal.md) y [`panel-de-firma.md`](panel-de-firma.md).

## Qué resuelve

AutoFirma, invocado por una sede, enseña un selector de certificados a secas: no
dice quién pide la firma, ni qué se va a firmar, ni que haya una sede detrás; y
entre que se acepta y que la sede responde no aparece nada. Esta ventana pone lo
que falta: una **confirmación escrita** antes de firmar y un **acuse visible**
después, sin arrastrar la ventana principal a un trámite ajeno y corto.

## Forma de la ventana

**Diálogo de 520 × 420 px con la barra de título del sistema**, sin cabecera de
aplicación, menú, bandeja de recientes ni pie de destino: sugerir que hay más
dentro invita a buscar cosas que no están. Dos regiones fijas en todos los
momentos: un **cuerpo** que se desplaza en vertical y un **pie** con raya
superior y las acciones a la derecha. En los momentos de firma y de salida el pie
mide **56 px clavados**, para que aparecer o desaparecer una acción no mueva nada.

- **La barra de título es del escritorio, no del frontal.** Una barra pintada en
  HTML no la conoce el gestor de ventanas: la ventana no se podía arrastrar. Con
  las decoraciones del sistema vienen el título, la cruz, el menú del gestor y el
  arrastre, ya en el idioma y el tema del escritorio; y la ventana mide lo que se
  le pide, sin el inset que GNOME/Wayland daba a las ventanas sin decorar.
- **El cuerpo no recorta** (`overflow: hidden` fuera): el desplegable de
  certificados flota por encima de la ventana, y recortarlo fue un defecto medido
  ([design-system.md](design-system.md#desplegable)).
- **Llena el hueco que le da la ventana** en lugar de fijar los 520 × 420 en el
  CSS: fijar el tamaño en dos sitios dejó un fondo desnudo alrededor cuando las
  cifras no coincidían.
- **Las historias la enseñan centrada, con su tamaño y un marco de ventana.**

## Flujo entre momentos

Los momentos los publica el backend por `SiteErrandPort`; la ventana los obedece
y no lleva relojes propios de espera. La numeración es la de las historias y la
de las cabeceras de los componentes.

1. **Aviso del cliente web antiguo (0).** Si la página trae un cliente anterior al
   mínimo, el aviso sale antes de abrir el canal y retiene el arranque sin
   detenerlo: mientras se lee, la sede no encuentra a nadie escuchando. Descartarlo
   —con su botón o con Escape— deja el trámite en la espera normal.
2. **Espera del canal (1).** Mientras el canal no se abre. Si el reloj de respaldo
   del backend vence sin que el navegador conecte, el momento pasa a «no ha
   llegado»; si rFirma ya sabe que no va a abrirse (sin puertos o sin CA local),
   se enseña la reparación sin esperar. Cerrar abandona el trámite.
3. **Marcar el área de la firma visible (1c).** Solo si la sede pide firma PAdES
   con firma visible. Llega antes del consentimiento y reutiliza el visor de la
   ventana principal. Cancelar cierra el diálogo del área, no el trámite
   (ADR-0019).
4. **Consentimiento (2).** El corazón del trámite. Siempre aparece, también con un
   solo certificado; consentir lleva a la firma.
5. **Confirmar lo que señala el validador (2b).** Solo cuando el original no
   firmaría sin confirmación. Continuar repite la validación y el backend publica
   el siguiente momento; cancelar contesta `CANCEL` a la sede y deja el desenlace
   «cancelado».
6. **Firmando (3).** Dos tramos: rFirma firma, y la respuesta viaja a la sede.
   Guardar y cargar ficheros pasan por una variante propia, donde la persona
   contesta en el diálogo del portal.
7. **Desenlace (4).** Firmado, cancelado, lote, guardado, cargado o rechazado. Se
   cierra solo a los 15 segundos, salvo los rechazos que piden actuar.
8. **Sin certificado utilizable (5).** Alternativa al consentimiento cuando no hay
   nada que elegir. Salir abandona el trámite.

### Cuatro invariantes

1. **Una sede no provoca una firma silenciosa.** El consentimiento aparece aunque
   la sede pida selección automática; solo se salta, con un único candidato, si la
   persona lo permitió en Preferencias y no hay ningún aviso que enseñar
   (ADR-0032).
2. **No hay bandeja, ni destino, ni memoria.** El documento de la sede no se
   recuerda ni entra en recientes. El visor solo aparece al marcar el área (1c) y en el consentimiento ampliado
   (2).
3. **Nunca se enumera lo que la sede descartó**, ni su criterio: es política de la
   sede, no información de quien firma.
4. **Los dos canales van desacompasados a propósito.** Lo que recibe la sede (la
   firma, `CANCEL` o el código de error) sale de inmediato; la ventana no es el
   acuse, es donde vive la precisión que el código no puede llevar. La excepción
   es el rechazo de la petición misma al analizarla: el original lo enseña en su
   diálogo de error y no contesta hasta que se cierra, y rFirma hace lo mismo.

## Decisiones y su porqué

### Espera y reparación

- **La ventana nace oculta y se revela cuando hay algo que enseñar.** Un retardo
  de gracia para pintar no hace falta: la ventana nunca es visible antes de tener
  contenido.
- **Quien decide «no ha llegado» es el backend**, no un temporizador del frontal.
  Nunca se cierra sola.
- **La reparación no diagnostica.** rFirma no puede saber si el permiso del
  navegador se denegó, así que son dos recetas, Chrome y Firefox, y la persona
  elige la suya. Solo texto, sin capturas: el aviso del navegador se describe por
  su forma y se cita el botón que hay que pulsar.
- **El bloque de la CA local va aparte y primero en Chrome**: sin CA el navegador
  ni llega a preguntar.
- **La dirección de ajustes de Chrome se copia, no se pulsa**: un `chrome://` no
  es navegable desde fuera.
- **La frase obligatoria vive en el pie**, no como tercer paso de cada receta:
  «reintentar» es un botón de la sede, y esta ventana no lo tiene.
- **Quien avisa de que el canal no se abre es esta ventana, no el escritorio**: el
  aviso llega donde duele y con la reparación al lado, así que el escritorio no
  estrena ninguna franja de diagnóstico para lo mismo.
- **Límite de espacio medido**: con la caja útil de unos 329 px, la receta de
  Chrome deja seis píxeles de margen. Si la prosa crece, lo primero que cae bajo
  el pliegue es el botón de copiar, que es justo lo que hay que enseñar.

### Consentimiento

- **Orden del cuerpo**: origen, certificado, nota de acotado si la hay, caja del
  documento con sus firmas previas; pie fijo con cancelar y la acción principal.
  La nota de acotado va debajo del desplegable porque habla de lo que la lista
  contiene y se lee después de verla.
- **SHA-1 permitido**: cuando la persona lo permitió en Preferencias y la sede lo
  pide, una línea informativa, en el mismo lugar que la nota de acotado, dice «Esta
  sede pide SHA-1, un algoritmo obsoleto. Lo tienes permitido en Preferencias.» No
  corta el trámite.
- **SHA-1 por permitir**: cuando una firma suelta, un lote remoto o un lote
  local piden SHA-1 y la
  persona no lo permitió en Preferencias, un aviso con el triángulo, «Firma poco segura», y
  debajo «Esta sede usa SHA-1, un método de firma antiguo y menos seguro. Firma
  solo si confías en ella.». El botón dice «Firmar solo esta vez», siempre con
  la cuenta atrás, y consentir permite SHA-1 solo en esa operación (ADR-0023).
- **El origen se nombra a secas**: atribuye sin afirmar, porque el `Origin` es
  falsificable. Dice también el formato pedido, para que nadie firme a ciegas un
  reto de autenticación creyendo que es un documento. Sin origen válido queda una
  etiqueta serena en la misma línea, sin caja ni icono: una caja con dos líneas
  daba la misma información con más ruido.
- **El documento se nombra solo por lo que dice de sí mismo** (título de los
  metadatos, páginas, tamaño). La petición no trae el nombre del fichero, y
  fabricar uno sería inventarlo. Sin título y sin origen no se rellena ningún
  silencio con un invento.
- **La cofirma y la contrafirma se distinguen antes de consentir**: firmar junto a
  las firmas existentes no es firmar sobre ellas, y es la única diferencia que la
  persona puede juzgar. La contrafirma dice además sobre cuáles.
- **El selector de certificado es el de la ventana principal, el mismo
  componente** ([`panel-de-firma.md`](panel-de-firma.md#certificado)). La lista
  mide como mucho 300 px y queda anclada bajo el campo, flotando aunque el cuerpo
  se desplace. El rótulo es el mismo también en `selectcert`: el título y la línea
  de qué se envía ya distinguen el caso. Bajo el selector va la línea del lector
  del panel, con los mismos textos, y la lista cambia sola al meter o sacar la
  tarjeta con las mismas reglas de elección.
- **La rama de identidad nombra la cesión de datos**, no una identificación que
  no ocurre. Negarla con una frase («esto no es una firma») es la verborrea que
  la regla de redacción de [design-system.md](design-system.md) ya echó de la
  ventana: decir lo que se hace basta.
- **Las firmas previas son de cada documento.** La compacta las resume en el
  aviso; la ampliada las cuenta en la franja de cada documento y las detalla en
  un panel (véase «Consentimiento ampliable»). Un lote remoto no trae los
  documentos, así que no hay firmas previas que contar.
- **La sede no bloquea ni pide confirmación por una firma no válida**, como
  AutoFirma: esta pantalla ya es un consentimiento y lo informa. «¿Firmar de todos
  modos?» es solo de la ventana principal.
- **Una firma que rFirma no sabe leer no es un rechazo**: es desconocimiento
  nuestro, y rechazar dejaría a rFirma rechazando documentos que AutoFirma sí
  firma. La advertencia vive dentro del mismo consentimiento, con tono de
  información y no de alarma, y esa firma cuenta como un problema más en el aviso.
- **El lote remoto solo da un recuento**: rFirma no recibe los PDF, sino una
  definición de lote que resuelve el servidor de la sede, así que no hay títulos
  que listar. Cuenta firmas, no documentos («Vas a hacer 1 firma» / «Vas a hacer
  N firmas»), y su aviso dice «Los documentos se quedan en el servidor de la
  sede, y rFirma no puede enseñártelos.»: sale de ser un lote remoto, sin
  analizarlo, y con SHA-1 comparte aviso con el de SHA-1, cada hecho con su tono. El lote local sí trae el resumen de cada elemento, en una lista
  desplazable dentro del marco fijo, sin tapar el desplegable ni el pie.
- **Se firma con el teclado, y por eso hay cuenta atrás.** Con el certificado
  recordado elegido, la acción principal se lleva el foco y un Intro consiente.
  Para que ese Intro no llegue por descuido, la acción nace desactivada con la
  cuenta atrás en su etiqueta y a los tres segundos queda activa y con el foco;
  si la persona ya movió el foco, no se le quita. Se apaga en
  [Preferencias](preferencias.md).
- **Una acción principal por pantalla**: `--primary` para ella, `--ghost` para
  salir y para las microacciones, y `--secondary` no se usa en ningún momento de
  esta ventana.

### Consentimiento ampliable

Quien no se fía de la sede puede ver lo que firma sin cargar la ventana a quien
sí se fía. El diseño son las historias de «Pantallas/Ventana de sede/Consentimiento
ampliable» y de «Dominio/Sede»; esta sección guarda solo lo que una historia no
enseña. El consentimiento real es `SedeConsentCompact` y `SedeConsentExpanded`, con
`ReceivedList`, `ReceivedViewer` y `SignaturesStrip`.

- **Primero con qué se firma, y después qué.** En las dos formas el selector
  va bajo la cabecera. En la compacta, lo que se firma va pegado al pie: primero
  el aviso (`Admonition`) y después «Vas a firmar…» con su descarga; en la
  ampliada, bajo el selector va el aviso y, debajo, la lista de documentos,
  sin «Vas a firmar…», porque los documentos ya se ven: su fila solo lleva la
  descarga, a la derecha, y la frase queda como nombre accesible de la lista.
- **Como mucho un aviso en pantalla, nunca dos apilados.** Todos los hechos van
  en un solo `Admonition`, por orden de importancia: la firma que no es válida,
  el SHA-1 por permitir, que el lote es remoto, lo que ya firmaste tú, las
  firmas de otras personas, que lo recibido es una huella y, si la sede firma con su
  servidor trifásico, que ese servidor prepara la firma con el documento. El primero es el título del aviso, en su fila, y los demás van debajo; con un
  solo hecho, sin título. El tono es el del peor: error con una firma no válida,
  advertencia con SHA-1 y, si no, información.
- **Una huella precalculada no se presenta como documento.** Cuando los parámetros
  de la sede llevan `precalculatedHashAlgorithm`, con cualquier valor, el aviso
  dice «La sede solo envía la huella del documento, así que rFirma no puede
  enseñártelo.», un hecho informativo que no rebaja el tono de los demás. Su
  nombre es «Una huella del documento»; no hay «Ver documento», «Descargar»,
  «Abrir con…» ni «Copiar SHA-256», y en una lista su fila no lleva menú. La
  huella no se reconoce por su tamaño: la marca la dice el backend.
  En un lote local la marca es de cada elemento, según sus `extraparams`
  efectivos (los suyos o, sin ellos, los del lote). Un elemento de huella se ve en
  la lista con ese nombre, sin menú y sin vista previa, el aviso sale una sola vez y
  el `.zip` de «Descargar todo» lleva solo los documentos.
- **La compacta no lista nada: resume.** Dice cuánto se firma y, si los hay, los hechos de las firmas previas: cuántos
  documentos traen firmas de otras personas, cuántos firmaste tú, con el
  certificado elegido o con otro tuyo, y cuántos tienen alguna que no es
  válida. En la ampliada, el aviso dice lo que ya firmaste tú y el SHA-1 por
  permitir, y cambia con el certificado elegido como en la compacta; las firmas
  no válidas y las de otras personas las cuenta la franja de cada documento.
  La lista es de la ampliada, que abre «Ver documentos»; con el servidor
  trifásico de la sede el botón dice «Ver el documento enviado» / «Ver los
  documentos enviados», y el visor y las acciones no cambian. El lote remoto solo da
  el recuento: sus documentos y sus prefirmas no llegan hasta después de elegir
  certificado, así que no hay «Descargar», ni «Ver documentos».
- **En la lista, el icono de cada fila dice su tipo** (`documentPdf`,
  `documentXml`, `documentImage` y, para el resto, `document`), con el mismo
  criterio con que el visor decide cómo pintarlo, nunca por la extensión del
  nombre.
- **En la lista, el sello del documento dice cómo vienen sus firmas**: `sealed`
  si se validan sin incidencias y `sealedWarning` con el mismo criterio que
  separa una firma no válida en el aviso; sin firmas, ningún sello.
- **El visor enseña lo que puede del documento**: el PDF paginado, el XML
  indentado o la imagen, centrada en una hoja de 600 px como mucho. El XML se
  ve un elemento por línea, con la sangría de su profundidad, y nunca se
  desplaza en horizontal: una línea larga se corta dentro de la hoja y lo
  cortado conserva su sangría. El contenido mixto, los comentarios, el CDATA y
  los atributos se quedan como vienen; el XML que no se puede analizar se ve
  tal cual, cortado igual. Una factura electrónica con vista se ve como en
  FACe, no con el sistema de diseño (ADR-0051): en un marco aislado que ocupa
  el área del visor, con el nombre del documento por título, y en el que el
  tabulador entra y del que sale; sin vista, se ve como su XML. Un
  tipo sin vista previa ocupa esa hoja con el icono, el nombre y «Este tipo de
  archivo no se puede mostrar aquí.», y debajo «Abrir con…» si el tipo se
  reconoce.
- **La franja de firmas no lleva avisos**: solo el recuento, la validez y «Ver
  firmas», en una línea.
- **«Descargar»** guarda el documento tal cual; con varios, «Descargar todo» es
  un `.zip` con los documentos y un `SHA256SUMS`.
- **«Abrir con…»** sale del tipo que rFirma detecta en los bytes, nunca de lo
  que diga la sede: el tipo da la extensión y, con ella, el sistema operativo
  elige la aplicación. Que no haya vista previa no lo quita; solo un tipo que no
  se reconoce sale como `.bin` y se queda sin «Abrir con…», ni en el visor ni en
  el menú «⋯».
- **Las firmas previas son de cada documento**: el resumen de la compacta cuenta
  documentos, no firmas, y el detalle es el panel de la ampliada, que flota sobre
  el visor sin cambiar su ancho. **Escape cierra el panel y no cancela el
  trámite.**
- **La ampliada es la misma ventana a 1080 × 660**, el tamaño de marcar el área,
  con la columna a la izquierda y el visor a la derecha. La ventana no se mueve:
  crece desde su esquina superior izquierda, que es lo único que hacen igual X11
  y Wayland, así que la columna se queda donde estaba y el documento aparece a
  su lado.
- **Los desplegables se abren hacia abajo**, el selector y el menú «⋯» de la
  lista, porque los dos viven arriba de su columna.
- **El pie no mueve sus botones**: «Ver documentos» en la compacta y «Ocultar» en
  la ampliada ocupan el mismo sitio, y la cuenta atrás de Firmar es la de
  siempre: no se reinicia al ampliar ni al cambiar de documento.
- **La columna de la ampliada mide 400 px y «Ocultar» es solo su icono**, con
  «Ocultar» como nombre accesible y como `title`, siempre y no solo con SHA-1:
  así el pie cabe en una línea con «Firmar igualmente» y su cuenta atrás, y
  no cambia de forma. El visor se queda con el resto de los 1080 px.
- **En el pie, la acción principal y «Cancelar» no ceden**: si no cabe todo,
  cede «Ver documentos», que se corta con puntos suspensivos y conserva su icono
  y el texto entero en el `title`.

- **Una persona nativa revisa las traducciones** de las
  cadenas `sede.received.*` del consentimiento ampliable al catalán, al gallego,
  al euskera y al inglés: nadie que hable esos idiomas las ha revisado.

### El resto de momentos con el esqueleto nuevo

Los demás momentos usan el mismo esqueleto que el consentimiento compacto. Es el
de la ventana real; las decisiones de abajo son las de cada momento.

- **Un solo esqueleto en todos los momentos**: arriba la cabecera `SedeOrigin` de
  56 px; el cuerpo, alineado a la izquierda, con el icono a la izquierda del
  título, y abajo el pie fijo de 56 px. Las acciones ocupan los sitios del
  consentimiento: «Cancelar» y la principal a la derecha, sin ceder, y a la
  izquierda, donde va «Ver documentos», la secundaria, que cede con puntos
  suspensivos. Nada va centrado, para que pasar de un momento a otro no mueva
  la vista.
- **La cabecera dice «Te pide la firma» o «Te pide tus datos» solo cuando es
  verdad**: en el desenlace y al guardar o cargar lleva solo el nombre de la
  sede, y con una orden de terminal, solo «Una orden de terminal», porque la
  orden la escribe la propia persona.
- **Los títulos ya no nombran la sede**: ya la nombra la cabecera.
- **Ninguna frase explica lo obvio**: la interfaz no es un manual. Sobra lo que
  repiten la cabecera, los botones o lo que se ve, como «La firma ya está en…»,
  «rFirma no guarda copia», «Elige en el diálogo del sistema…», «Necesitas uno
  instalado…» o «Consíguelo en la FNMT…».
- **El desenlace es solo icono y título**, sin la fila del documento ni el
  recuento, que ya se enseñaron al consentir. El cierre automático se ve en el
  botón, «Cerrar (15)», que baja cada segundo, y no en la frase «Se cerrará
  sola…».
- **El rechazo lleva su frase y el detalle copiable en un `Admonition` neutro
  con «Copiar»**. Desaparece la pista de permitir SHA-1 en Preferencias: en el
  uso normal ya no se llega a ese rechazo, porque el consentimiento ofrece
  «Firmar igualmente».
- **Sin certificado, el título no nombra la sede**: «No acepta ninguno de tus
  {{count}} certificados». El pie lleva «Volver a buscar» a la izquierda y
  «Cancelar» e «Instalar un certificado…» a la derecha; con una orden de
  terminal y todos excluidos, solo «Cerrar».
- **El fallo al instalar es un `Admonition` de error sin «Copiar»**, porque
  ese detalle no se lleva a ninguna sede.
- **En la espera, «no ha llegado» y «sin canal» son una sola pantalla**: para
  la persona la situación es la misma.
- **El aviso «Falta la CA local» sale solo cuando rFirma sabe que falta**, y
  siempre encima de las pestañas. Entonces «Instalar» es la acción principal y
  «Cerrar» queda discreto, porque instalarla es lo que desbloquea el trámite.
- **Las recetas de Chrome y Firefox van en las pestañas del sistema de diseño**,
  en la variante con raya, y cada receta es el panel de su pestaña. La frase de
  reintentar va en el pie, a la izquierda.
- **Firmando y guardar o cargar enseñan solo el título**, y la barra al firmar.
  Un destino donde no se puede escribir es un `Admonition` de error.
- **Marcar el área tiene la geometría de la ampliada**: la columna de 400 px a
  la izquierda, con cabecera y pie, y el visor a la derecha, sin frase de
  ayuda. El recuadro aparece ya en su posición estándar y «Continuar» está
  habilitado desde el principio, porque la posición estándar ya es una
  respuesta válida.
- **«En qué páginas» lleva el estilo del rótulo «Certificado»**, y un documento
  ilegible es un `Admonition` de error.
- **La página desactualizada es una sola frase**, «Puede tener errores o no ser
  segura.», con «Cancelar»: si se avisa de que puede no ser segura, tiene que
  poder pararse.
- **Confirmar lo que señala el validador conserva sus textos y su flujo**: solo
  cambia el esqueleto.
- **Como mucho un `Admonition` por pantalla, con un solo estilo para todos los
  tonos**: el tono solo cambia el icono.
- **Las historias de «Pantallas/Ventana de sede» son las de la ventana real**,
  incluidas las `Expanded*` del consentimiento.

### Marcar el área

- **Es el único momento en que la ventana crece**, porque en la caja útil no cabe
  una página que se pueda marcar. Se reparte como la ampliada: la columna a la
  izquierda, con el bloque «En qué páginas» del panel de firma, y el visor a la
  derecha.
- **Ni modelo ni rúbrica**: lo que va dentro del recuadro lo pone la sede
  (ADR-0019).
- **Cerrar con la cruz es pulsar cancelar**, como cerrar el diálogo del área en el
  original. Con la firma visible obligatoria y sin área en la petición, la sede
  recibe `SAF_43` y queda el desenlace «cancelado»; en los demás casos sigue el
  consentimiento.

### Confirmar

- **Se pregunta con las palabras del original**, elegidas por el código del
  mensaje que cruza la frontera. Un código que rFirma no sepa redactar sale con
  una frase genérica que lo nombra, porque es lo único que permite reportarlo:
  rFirma no reinterpreta ni gradúa un aviso cuyo sentido conoce el original.
- **Llega antes del consentimiento**, así que no hay documento que resumir ni
  certificado que elegir. El original pregunta lo del PDF certificado después de
  elegir certificado porque lo descubre al firmar; rFirma lo descubre al leer y
  pregunta antes, con el mismo resultado para la sede.
- **Con `headless=true` no hay pregunta**: la sede recibe `SAF_50`. Con
  `allowSigningCertifiedPdfs=false`, el PDF certificado se rechaza sin preguntar
  con `SAF_35`.

### Firmando

- **No es el diálogo de progreso de la ventana principal.** Allí se listan las
  fases trifásicas porque hay un fichero que guardar; aquí contar la «prefirma»
  sería estado interno del motor
  ([`dialogo-progreso-firma.md`](dialogo-progreso-firma.md)).
- **Dos momentos y ninguno criptográfico**: firmar, con el certificado que la
  persona acaba de elegir —lo único que reconoce como suyo—, y devolver la firma,
  que importa porque es el tramo que ya no depende de rFirma. La barra avanza de
  verdad entre ambos para que no se vean iguales.
- **Hasta dónde se puede parar**: mientras rFirma firma, cancelar es limpio —la
  sede no ha recibido nada—. Con la respuesta ya en camino no hay nada que
  cancelar y el pie se queda vacío en vez de ofrecer un botón que mentiría.
- **Guardar y cargar no preguntan en esta ventana** (ADR-0011): la orden abre el
  diálogo del portal y aquí solo se nombra el fichero que propone la sede, nunca
  una ruta.

### Desenlace

- **Tres tipos de final y en todos la sede ya tiene su respuesta**: firmado,
  cancelado y rechazado. Lo que lleva cada uno, en «El resto de momentos con el
  esqueleto nuevo».
- **El rechazo se enseña aunque la persona no pueda arreglarlo**: acaba de
  arrancarse un programa en su equipo a petición de una web, y un rFirma que
  aparece y desaparece en silencio es indistinguible de uno roto. Lo accionable es
  el detalle copiable, para llevárselo a quien mantiene la sede.
- **Cada rechazo propio de la sede lleva una acción**, salvo las firmas que rFirma se niega a hacer (reintentar, contactar con la
  sede, cerrar la otra aplicación, elegir otro certificado) y es lo que protege
  `REFUSAL_ACTION_OF`. Los rechazos del token, el puente y el documento se cuentan
  con el título que les da la ventana principal, sin redactarlos dos veces. Solo
  cae en la frase genérica lo que ni el backend sabe clasificar.
- **Las firmas que rFirma se niega a hacer** (SHA-1, cofirma o
  contrafirma de factura, contrafirma fuera de CAdES, CMS y XAdES; ADR-0023) dicen
  que no es un fallo de quien firma, y esa causa ocupa el lugar de la acción. La
  nota para quien mantiene la sede va dentro de la caja del detalle y se copia con él.
- **La caja del detalle es de la sede y solo de la sede.** El enlace a comentarios
  y ayuda, que solo aparece cuando ni se sabe qué se rechazó, va fuera: eso no se
  lleva a la sede, se reporta a rFirma.
- **Se cierra solo a los 15 segundos, no a los 5**: con 5 no da tiempo a leer, y
  el caso que lo decide es el rechazo, donde irse solo reproduciría el síntoma que
  el aviso venía a evitar. Los rechazos que piden actuar o que llevan la ayuda se
  quedan abiertos. El botón de cerrar es el único `--primary`.
- **El rechazo de la petición misma por un canal ya abierto no contesta hasta
  cerrar**: el `SAF_NN` sale al pulsar cerrar o al cerrar la ventana; si llegan
  varios, se enseñan y se contestan de uno en uno. Los demás rechazos de
  transporte se contestan en el acto y no enseñan nada, porque el original
  tampoco.

### Sin certificado

- **No es una variante del consentimiento**: no hay nada que consentir ni elegir,
  el desplegable no pinta nada y el botón principal no puede decir «firmar».
- **Las dos causas se sienten distintas porque la salida lo es.** «No tienes
  ninguno» tiene arreglo que no depende de la sede. «La sede los excluyó todos»
  ofrece lo mismo, porque el recién instalado quizá sí valga, y dice cuántos
  certificados tiene la persona —estado de su almacén—, sin decir qué rechazó la
  sede de cada uno. Los caducados no se entregan nunca (ADR-0023).
- **Volver a buscar es la acción secundaria del pie**, a la izquierda, por si se
  instaló un certificado con la ventana abierta.
- **Salir abandona el trámite**, por el pie o por la cruz del sistema: la sede no
  ha recibido nada todavía. Solo el desenlace cierra sin cancelar.

### Origen orden de terminal

La acción es de la persona, que acaba de escribir la orden: no hay frase de
origen ni nada dirigido a la sede, y no se repite lo que la orden ya dice.

- **Consentimiento**: la cabecera dice solo «Una orden de terminal» y, donde la
  compacta pone el recuento, «Firmar» con el nombre del documento de `-i`,
  recortado por el medio conservando principio, final y extensión, con la ruta
  completa en el tooltip. Sin descarga, «Ver documentos», destino ni nota de
  `-filter`.
- **La ventana solo elige**: se cierra al aceptar el secreto o al cancelar, y el
  resultado sale en la terminal; no hay firmando ni desenlace en ventana.
- **Sin certificado utilizable** se abre la ventana aunque no haya terminal.
  «Excluidos» es que el `-filter` no deja ninguno, y solo ofrece cerrar.
- **`-config` con firma visible o comprobación de firmas** no añade pantallas.

### El diálogo del secreto no cambia

Es exactamente [dialogo-pin.md](dialogo-pin.md): sin artboard propio ni palanca de
contexto, porque dos sitios donde mirar la misma pantalla serían dos verdades.

### Lo que se descartó

- **Una frase de origen, filas de carpeta y destino o «firmando» en ventana para
  la terminal**: atribuían a un tercero lo que lanza la propia persona, repetían
  rutas recién escritas y ensanchaban sin necesidad el contrato del elector
  gráfico.
- **El nombre del fichero en el botón**: el botón lo recorta a unos 40 caracteres.
- **Reutilizar el selector de certificados de AutoFirma tal cual**, sin decir
  quién pide ni qué se firma.
- **No enseñar nada mientras se firma**: es el fallo actual.
- **Listar las fases criptográficas durante la firma**: son estado interno del
  motor.
- **Mutilar el desplegable para que cupiera** (152 y luego 156 px con
  desplazamiento propio): las dos veces era tapar el fallo real.
- **Una quinta situación de consentimiento para «cero tras el filtro»**: es otra
  situación y vive en un solo sitio, «sin certificado».
- **Un lote de documentos listado para el lote remoto**: su respuesta es un
  recuento.
- **Prosa que pone en guardia sin dar información**: la regla de redacción está en
  [design-system.md](design-system.md).
- **Temporizadores propios en la ventana** para decidir «no ha llegado» o para
  retrasar el pintado.
- **Una caja aparte para el origen sin identificar** y **la línea fija «ya lleva
  una firma»**, sustituida por el aviso de firmas previas.

## Componentes y tokens

La ventana se compone con los primitivos `Button`, `Stack` y `Row` del sistema de
diseño, el selector de certificado compartido con el panel de firma, el visor del
documento en el momento 1c y el aviso de firmas previas del panel. Los iconos son
los del sistema de diseño.

Clases `rf-*` de texto y campo —`rf-title`, `rf-prose`, `rf-hint`, `rf-label`,
`rf-input`— y las propias de la ventana en `SedeWindow.css`.

Tokens: `--rf-bg`, `--rf-surface`, `--rf-text`, `--rf-text-muted`,
`--rf-border-subtle`, `--rf-border-strong`, `--rf-primary`, `--rf-on-primary`,
`--rf-radius-md|lg|pill`, `--rf-shadow-elevated`, `--rf-space-xs|sm|md`. Ni un
color ni una sombra literales.

## Historias

La verdad de lo que se ve es el código y estas historias, junto a sus componentes
en `rfirma-app/src/sede/`. Cada momento pinta su componente, desnudo y con props
finas, sobre el fondo de la ventana. `SedeView.stories.tsx`
(«Pantallas/Ventana de sede») compone la ventana entera con su marco: `Waiting`,
`Consent` y `Signed` a 520 × 420 y `MarkingTheArea` a 1080 × 660. `SedeView` no
conoce ningún puerto de Tauri; `SedeWindow` es la parte conectada a
`SiteErrandPort`.

| Momento | Historias |
| --- | --- |
| 0 y 2b · avisos previos | `SedeGuards.stories.tsx`: la página desactualizada y confirmar lo que señala el validador |
| 1 y 3 · espera, firmando, guardar y cargar | `SedePassing.stories.tsx`: los momentos de paso |
| 1c · marcar el área | `SedeAreaMarking.stories.tsx`: con la geometría de la ampliada |
| 2 · consentimiento | `SedeConsent.stories.tsx`: `Compact*` a 520 × 420 (lote remoto, lote remoto con SHA-1, uno, varios, huella, servidor de la sede, cuenta atrás) y `Expanded*` a 1080 × 660 (varios, uno, XML, factura, imagen, sin vista previa, firmas PAdES con hallazgo, firmas XAdES con contrafirma, lote local con huellas); las piezas en «Dominio/Sede» |
| 4 · desenlace | `SedeEnding.stories.tsx`: los finales y los rechazos |
| 5 · sin certificado | `SedeMissingCertificate.stories.tsx`: las causas y el fallo al instalar |

`src/stories.test.tsx` las pinta todas con axe, así que una historia nueva queda
revisada sin escribir otro test. El momento de consentimiento, que comparten las
pruebas, está en `sede/testing/fixtures/sedeWindow.ts`; el resto de lo que usan las historias:
las firmas previas y el PDF en blanco en `sede/testing/fixtures/previousSignatures.ts`,
los espías de las órdenes en `sede/testing/fixtures/sedeView.ts` y los
marcos —520 × 420, y 1080 × 660 al marcar el área— en
`rfirma-app/.storybook/decorators/sedeWindow.tsx`.

## Claves i18n

Todos los textos salen del catálogo; el castellano está en `po/es.po`, bajo
`sede.*`, con un espacio de nombres por momento (la cabecera en `sede.origin.*`;
lo recibido y la vista ampliada en `sede.received.*` y `sede.signatures.*`), y
las acciones comunes bajo `actions.*`. La lista de claves es la del catálogo,
no se copia aquí.
