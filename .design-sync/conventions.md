## Convenciones de rFirma

rFirma es una aplicación de escritorio de firma electrónica para España. Los textos van en castellano de España, de tú, cortos y sin jerga criptográfica.

### Envoltura obligatoria: `DesignRoot`

Todo diseño se monta dentro de `DesignRoot`. Aporta tres cosas:
- el catálogo de textos en el idioma pedido: los componentes no llevan ni una cadena escrita en línea, y sin él se pintan vacíos;
- la clase `rf-root`, de la que cuelgan la tipografía y el fondo;
- el tema, con `data-theme`.

```jsx
const { DesignRoot } = window.RFirma;
<DesignRoot language="es" theme="light">{/* pantalla */}</DesignRoot>
```

`language`: `es` | `ca` | `en` | `eu` | `gl`. `theme`: `light` | `dark`.

### Estilo: primitivos, clases `rf-*` y tokens `--rf-*`

Las pantallas se componen con primitivos: `Button`, `Card`, `Field`, `Badge`, `Dialog`, `Popover`, `Menu` (con `MenuItem`), `Select`, `Switch`, `ProgressBar`, `Stack` y `Row` (todos en `window.RFirma`). Una clase `rf-*` se escribe a mano solo si aún no tiene primitivo: el texto, `rf-input`, `rf-divider`, `rf-label` y poco más. No inventes clases ni escribas colores, radios o sombras literales: para tu maquetación propia, `var(--rf-*)`.

| Primitivo | Props |
| --- | --- |
| `Button` | `variant`: `primary` / `secondary` / `ghost`; `type="button"` por defecto |
| `Card` | `elevated` |
| `Field` | etiqueta, control y ayuda apilados |
| `Badge` | `variant`: `primary` |
| `Dialog` | `label`, `onClose`, `role`: `dialog` / `alertdialog` |
| `Popover` | `open`, `onClose`, `anchorRef` |
| `Stack` / `Row` | `gap`: `xs` / `md` en `Stack`, `xs` / `sm` en `Row` |

Clases a mano, solo las que no tienen primitivo:

| Familia | Clases |
| --- | --- |
| Superficies | `rf-surface`, `rf-section`, `rf-divider` |
| Texto | `rf-display`, `rf-heading`, `rf-headline`, `rf-title`, `rf-subtitle`, `rf-ui`, `rf-ui--strong`, `rf-body`, `rf-prose`, `rf-caption`, `rf-label`, `rf-hint`, `rf-text-muted`, `rf-text-primary` |
| Formularios | `rf-input` |

El texto elige rol, no números: cada clase de rol fija tamaño, peso e interlínea juntos. No escribas `font-size`, `font-weight` ni `line-height` literales.

Las clases de los primitivos (`rf-btn`, `rf-card`, `rf-field`, `rf-badge`, `rf-dialog`, `rf-scrim`, `rf-stack`, `rf-row`, `rf-gap-*`) las pone el primitivo: no las escribas.

Tokens: color `--rf-bg`, `--rf-surface`, `--rf-text`, `--rf-text-muted`, `--rf-primary`, `--rf-primary-hover`, `--rf-on-primary`, `--rf-accent`, `--rf-border-subtle`, `--rf-border-strong`; espacio `--rf-space-xs` … `--rf-space-2xl`; radio `--rf-radius-sm` / `-md` / `-lg` / `-xl` / `-pill`; sombra `--rf-shadow-card`, `--rf-shadow-elevated`; movimiento `--rf-duration-fast` / `-base`, `--rf-easing`; tipografía `--rf-<rol>-size` / `-weight` / `-leading` por rol, `--rf-ui-strong-weight` y `--rf-body-prose-leading`.

### Iconos

Un solo componente, `Icon`, que se pide por papel y no por dibujo: `<Icon name="done" />`. `size` es el lado en px y, si no lo das, cada papel trae el suyo; `strokeWidth`, el grosor. Los papeles están en la historia `Primitivos/Icon`. El icono es decorativo y toma el color del texto: acompáñalo siempre de una palabra.

### Pantallas

El kit no trae pantallas: se componen con los primitivos y las piezas de dominio, el texto con sus clases y los iconos.

Un momento nuevo de la ventana que abre una sede electrónica se diseña dentro de `SedeBody`, su marco: el cuerpo que se desplaza y el pie con las acciones. Va sobre una superficie de 520 × 420 con la clase `sede-window`, como en la ventana real.

```jsx
const { DesignRoot, SedeBody, Button } = window.RFirma;
<DesignRoot language="es" theme="light">
  <div className="sede-window" style={{ width: 520, height: 420 }}>
    <SedeBody footer={<><Button variant="ghost">Cancelar</Button><Button variant="primary">Continuar</Button></>}>
      {/* el momento */}
    </SedeBody>
  </div>
</DesignRoot>
```

### Catálogo publicado

Lo que hay en `window.RFirma`, por capa y título de historia.

<!-- design-sync:catalog:start -->
| Capa | Título | Componente |
| --- | --- | --- |
| Dominio | Actualizaciones / NewVersionStrip | `NewVersionStrip` |
| Dominio | Documentos / DocumentTabs | `DocumentTabs` |
| Dominio | Documentos / RecentsSection | `RecentsSection` |
| Dominio | Errores / ErrorNotice | `ErrorNotice` |
| Dominio | Firma / CertificateCard | `CertificateCard` |
| Dominio | Firma / CertificateSelect | `CertificateSelect` |
| Dominio | Firma / PlacementBlock | `PlacementBlock` |
| Dominio | Sede / SedeBody | `SedeBody` |
| Primitivos | Badge | `Badge` |
| Primitivos | Button | `Button` |
| Primitivos | Card | `Card` |
| Primitivos | Combobox | `Combobox` |
| Primitivos | DesignRoot | `DesignRoot` |
| Primitivos | Dialog | `Dialog` |
| Primitivos | Field | `Field` |
| Primitivos | Icon | `Icon` |
| Primitivos | Menu | `Menu` |
| Primitivos | MenuItem | `MenuItem` |
| Primitivos | Popover | `Popover` |
| Primitivos | ProgressBar | `ProgressBar` |
| Primitivos | Row | `Row` |
| Primitivos | Select | `Select` |
| Primitivos | SplitButton | `SplitButton` |
| Primitivos | Stack | `Stack` |
| Primitivos | Switch | `Switch` |
| Primitivos | Tabs | `Tabs` |
<!-- design-sync:catalog:end -->

### Dónde mirar

- `styles.css` e `_ds_bundle.css`: todas las clases y tokens.

### Ejemplo

```jsx
const { DesignRoot, Card, Stack, Row, Button, Icon } = window.RFirma;
<DesignRoot language="es" theme="light">
  <Card>
    <Stack gap="md" style={{ padding: "var(--rf-space-lg)" }}>
      <Row gap="xs">
        <Icon name="done" size={24} />
        <p className="rf-title">Documento firmado</p>
      </Row>
      <p className="rf-prose">La firma se ha guardado junto al documento.</p>
      <Row gap="sm">
        <Button variant="ghost">Ver firmas</Button>
        <Button variant="primary">Cerrar</Button>
      </Row>
    </Stack>
  </Card>
</DesignRoot>
```
