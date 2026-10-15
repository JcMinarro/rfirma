# El tipo de un documento de la sede lo detecta rFirma en sus bytes

En la vista ampliada del consentimiento, la persona puede sacar de rFirma un
documento que ha recibido de la sede: abrirlo con una aplicación del sistema
(«Abrir con…») o guardarlo («Descargar», «Guardar copia»). Los bytes los manda
la sede, y rFirma no se fía de lo que la sede declara de ellos: ni el nombre, ni
la extensión, ni el tipo MIME deciden nada.

1. **El tipo lo detecta rFirma por el contenido.** Es el mismo tipo con el que
   el visor decide cómo pintar el documento y la lista elige su icono.
2. **La extensión del fichero que recibe el sistema sale de ese tipo**, porque
   es la extensión la que decide qué aplicación lo abre. Después, el sistema
   operativo elige la aplicación con su asociación habitual. rFirma no es un
   visor universal (ADR-0018): ni elige visor ni lanza un programa concreto.
3. **Un contenido de tipo desconocido se guarda como `.bin` y no ofrece «Abrir
   con…»**, ni en el visor ni en el menú «⋯» de la lista.
4. **Que rFirma no tenga vista previa de un tipo no quita «Abrir con…».** Un tipo
   reconocido que el visor no pinta, como una hoja de cálculo, se abre fuera:
   quien no se fía de la sede tiene que poder ver lo que firma.
5. **«Descargar» con un documento guarda sus bytes tal cual.** «Descargar todo»
   genera un `.zip` con los documentos y un `SHA256SUMS`.

La pantalla, en `docs/design/ventana-de-sede.md`.

## Consequences

- Un documento cuyo nombre no coincide con su contenido se entrega con la
  extensión de su contenido, que puede no ser la que anunciaba la sede.
- El catálogo de tipos reconocidos decide qué documentos se pueden abrir fuera.
  Uno que falte se queda en `.bin` hasta que entre en la detección, aunque el
  sistema tuviera con qué abrirlo.
