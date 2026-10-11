# Bienvenida

El punto de partida al arrancar rFirma sin documento: reúne las acciones de
inicio —abrir un PDF, ver el estado de rFirma— con los documentos recientes, en
el hueco del visor, con la cabecera y las pestañas a la vista.

**La verdad del dibujo es el código y sus historias:**
`rfirma-app/src/documents/Welcome.tsx` y `Welcome.stories.tsx`
(«Pantallas/Documentos/Welcome»). Medidas, colores y textos salen de ahí y del
catálogo (`welcome.*` en `po/messages.pot`); esta ficha cuenta lo que una
historia no enseña.

## Casos de uso que la usan

- **Arrancar rFirma sin documento**, con «Mostrar la bienvenida al abrir»
  activada: es la primera pantalla. Arrancar con un documento invocado lo enseña
  a él y no a la bienvenida.

## Cuándo sale y cuándo no

- **Solo en el arranque**, sin documento y con la preferencia activada. La
  preferencia nace activada, también para quien actualiza desde una versión que
  no la tenía.
- **Con la preferencia desactivada, o al cerrar la última pestaña a mitad de
  sesión**, el visor enseña la [zona de soltar](visor-de-documento.md) sola,
  centrada y sin recientes: la historia `Empty` del visor. La bienvenida es para
  el arranque, no para cada vez que la ventana se queda vacía.
- **Sin parpadeo**: la decisión se toma con la preferencia que ya se leyó antes
  del primer pintado, no con la relectura posterior de las preferencias.

## Estructura

Cabecera con el nombre de la aplicación, que no se traduce, y una línea que dice
qué hace. Debajo, dos columnas que se apilan cuando la ventana no da para las
dos; al pie, la casilla.

- **«Empezar»**: «Abrir PDF…» lanza el mismo diálogo que las pestañas y Ctrl+O;
  «Estado de rFirma» abre el [panel de estado](panel-de-estado.md). Debajo, la
  zona de soltar, la misma que la del visor vacío: se pulsa para abrir el mismo
  diálogo, o se arrastra un PDF a la ventana.
- **Recientes**: la sección de recientes de siempre
  ([pestañas de documentos](pestanas-de-documentos.md)); seleccionar uno lo abre
  y «Vaciar la lista» la vacía.
- **«Mostrar la bienvenida al abrir»**: guarda la preferencia en el acto. Es una
  casilla y no un interruptor por la regla de
  [casilla o interruptor](design-system.md#casilla); el mismo ajuste vive como
  interruptor en [Preferencias](preferencias.md), que es donde se recupera
  cuando la casilla ya no está a la vista.

## Estados

### Con recientes

La sección de recientes ocupa la columna. Historia: `WithRecents`.

### Sin recientes

La lista está vacía y «recordar actividad» está activado: la misma sección, con
su rótulo, dice que aún no hay ninguno, sin «Vaciar la lista». Historia:
`WithoutRecents`.

### Sin actividad recordada

Con «recordar actividad» desactivado no habrá recientes, así que no se promete
ninguno: la columna queda vacía, pero existe y ocupa lo mismo, y «Empezar» no
cambia de tamaño ni de sitio. Historia: `ActivityNotRemembered`.

### Tema oscuro

La pantalla y la casilla siguen al tema. Historia: `DarkTheme`.

### Ventana estrecha

Las dos columnas se apilan y la zona de soltar encoge al ancho disponible.
Historia: `NarrowWindow`.

## Componentes y tokens

`Button` (`ghost`, con icono), `Checkbox` en el rol `body`, `DropZone` y
`RecentsSection`; maquetación propia en `Welcome.css`, con `var(--rf-*)`.

## Decisiones

- **«Abrir PDF…» se queda aunque la zona de soltar también abre**: el botón es
  la acción explícita y la zona invita a arrastrar.
- **La zona de soltar es una sola**, con el mismo alto, icono y texto en la
  bienvenida y en el visor vacío; solo el ancho se ajusta. Se descartó la
  variante compacta del boceto, que cambiaba el texto por «También puedes
  arrastrar un PDF a esta ventana».
- **Se retiró la línea «No sale de tu ordenador»** de la zona de soltar: sonaba
  rara y no aportaba.
- **El visor vacío fuera del arranque no lleva recientes**: quedan en la
  bienvenida y en el menú de las pestañas.
