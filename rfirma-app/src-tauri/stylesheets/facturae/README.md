# Hojas de estilos de FacturaE

Las hojas XSLT del visor de FACe con que se pinta una FacturaE (ADR-0051), una
por versión del formato. Se guardan **byte a byte como se publican**, con sus
saltos de línea CRLF y su codificación: no se reformatean ni se corrigen. Para
cambiar una, se sustituye por otra publicada y se actualiza esta tabla.

| Fichero | Versión de FacturaE | SHA-256 |
|---|---|---|
| `visorFace-3.2.1.xsl` | 3.2.1 | `b88dfbcd82b2d6af5c22b6dac3bbf70bb5f4adee4c18823f129b8d6927ed34d7` |
| `visorFace-3.2.2.xsl` | 3.2.2 | `b559794bd984ec30208604bcccccbc1fb03f1495639905e5ec641486e77cc6aa` |

## Origen

`eeutil-igae-src_6.8.2.zip`, el código fuente de Eeutil-Igae 6.8.2 de la
Suite CSVCreator (Eeutils), que distribuye el Centro de Transferencia de
Tecnología en <https://administracionelectronica.gob.es/ctt/csvcreator/descargas>.
Las hojas son `resources/config/visorFace/<versión>/visorFace.xsl` dentro del
zip.

La réplica en GitHub, [`carm-es/eeutil-igae`](https://github.com/carm-es/eeutil-igae),
trae los mismos ficheros byte a byte en el commit
`d6a520f1eda8fa358e9ebd97fa965a47679196be`, por si el zip deja de estar
publicado.

## Licencia

EUPL 1.1: el `fuentes/LICENSES.txt` del zip declara Eeutil-Igae bajo esa
licencia. Su texto, el mismo PDF que `fuentes/LICENSE_EUPL_1.1.pdf` del zip,
está en `packaging/licenses/EUPL-1.1.pdf`. rFirma se distribuye con la
EUPL-1.2 (ADR-0008).
