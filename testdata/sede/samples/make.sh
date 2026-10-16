#!/usr/bin/env bash
# Regenera las muestras de ofimática e imagen de la sede de pega, con datos ficticios; necesita LibreOffice e ImageMagick.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cd "$work"

cat > contrato.html <<'HTML'
<html><head><meta charset="utf-8"><style>
body { font-family: "Liberation Serif"; font-size: 11.5pt; line-height: 1.45; }
h1 { font-size: 15pt; text-align: center; } h2 { font-size: 12pt; margin-top: 14pt; }
p { text-align: justify; }
</style></head><body>
<p style="text-align:right">Expediente 2026/CONT/0142</p>
<h1>CONTRATO DE SERVICIO DE MANTENIMIENTO DE INSTALACIONES DEPORTIVAS</h1>
<p>En Villaejemplo, a 6 de octubre de 2026.</p>
<h2>REUNIDOS</h2>
<p>De una parte, el AYUNTAMIENTO DE VILLAEJEMPLO, con NIF P0000000J y domicilio en la plaza Mayor, 1, representado por su alcaldesa, en virtud de las facultades que le confiere el artículo 21 de la Ley 7/1985, de 2 de abril, reguladora de las Bases del Régimen Local.</p>
<p>De otra parte, TALLERES INVENTADOS DEL NORTE, S.L., con NIF A00000000 y domicilio social en el polígono industrial La Prueba, nave 7, representada por su administrador único.</p>
<p>Ambas partes se reconocen capacidad legal suficiente para contratar y obligarse, y a tal efecto</p>
<h2>EXPONEN</h2>
<p>I. Que por resolución de la Alcaldía de 12 de septiembre de 2026 se adjudicó a la empresa contratista el servicio de mantenimiento preventivo y correctivo de las instalaciones del polideportivo municipal, tramitado mediante procedimiento abierto simplificado.</p>
<p>II. Que la empresa contratista ha constituido la garantía definitiva por importe del cinco por ciento del precio de adjudicación, excluido el IVA.</p>
<h2>CLÁUSULAS</h2>
<p><b>Primera. Objeto.</b> El contratista se obliga a prestar el servicio de mantenimiento de las instalaciones de climatización, fontanería, electricidad y cubiertas del polideportivo municipal, con arreglo al pliego de prescripciones técnicas, que forma parte de este contrato.</p>
<p><b>Segunda. Precio.</b> El precio del contrato asciende a 48.400,00 euros, IVA incluido, de los que 40.000,00 euros corresponden a la base imponible y 8.400,00 euros al impuesto sobre el valor añadido. Se abonará en doce mensualidades, previa presentación de la factura electrónica correspondiente a través del punto general de entrada.</p>
<p><b>Tercera. Plazo.</b> El contrato tendrá una duración de un año desde su formalización, prorrogable por un año más por acuerdo expreso de las partes, sin que la duración total pueda exceder de dos años.</p>
<p><b>Cuarta. Obligaciones del contratista.</b> El contratista ejecutará el servicio con estricta sujeción a lo dispuesto en los pliegos, atenderá los avisos de averías en un plazo máximo de cuatro horas y llevará un registro de las intervenciones realizadas, que pondrá a disposición del responsable del contrato.</p>
<p><b>Quinta. Responsable del contrato.</b> Se designa responsable del contrato a la persona titular de la jefatura del servicio de deportes, a quien corresponde supervisar su ejecución y dictar las instrucciones necesarias.</p>
<p><b>Sexta. Penalidades.</b> El incumplimiento de los plazos de atención dará lugar a la imposición de penalidades diarias en la proporción de 0,60 euros por cada 1.000 euros del precio del contrato.</p>
<p><b>Séptima. Régimen jurídico.</b> El presente contrato tiene carácter administrativo y se rige por la Ley 9/2017, de 8 de noviembre, de Contratos del Sector Público, y por sus disposiciones de desarrollo.</p>
<p>Y en prueba de conformidad, ambas partes firman electrónicamente el presente documento.</p>
</body></html>
HTML

cat > justificante.html <<'HTML'
<html><head><meta charset="utf-8"><style>
body { font-family: "Liberation Sans"; font-size: 11pt; }
table { border-collapse: collapse; width: 100%; } td { border: 1px solid #555; padding: 5pt; }
td.k { width: 35%; background: #eee; font-weight: bold; }
</style></head><body>
<p><b>AYUNTAMIENTO DE VILLAEJEMPLO</b><br>Registro Electrónico General</p>
<h2 style="text-align:center">JUSTIFICANTE DE PRESENTACIÓN</h2>
<table border="1" cellpadding="6" cellspacing="0" width="100%">
<tr><td class="k">Número de registro</td><td>REGAGE26e00004417712</td></tr>
<tr><td class="k">Fecha y hora</td><td>06/10/2026 10:42:17</td></tr>
<tr><td class="k">Interesado</td><td>TALLERES INVENTADOS DEL NORTE, S.L. (A00000000)</td></tr>
<tr><td class="k">Asunto</td><td>Garantía definitiva. Expediente 2026/CONT/0142</td></tr>
<tr><td class="k">Unidad de destino</td><td>Servicio de Contratación</td></tr>
<tr><td class="k">Documentos</td><td>aval-bancario.pdf (182 KB)<br>escritura-poder.pdf (1,2 MB)</td></tr>
</table>
<p style="font-size:9pt">El presente justificante tiene validez a efectos de presentación de la documentación. El inicio del cómputo de plazos para la Administración viene determinado por la fecha y hora de entrada en el registro.</p>
</body></html>
HTML

cat > presupuesto.csv <<'CSV'
Concepto;Unidades;Precio unitario;Base;IVA 21 %;Total
Revisión trimestral de climatización;4;2000;=B2*C2;=D2*21/100;=D2+E2
Mantenimiento de fontanería y ACS;12;620;=B3*C3;=D3*21/100;=D3+E3
Revisión de cuadros eléctricos;4;980;=B4*C4;=D4*21/100;=D4+E4
Limpieza y revisión de cubiertas;2;2150;=B5*C5;=D5*21/100;=D5+E5
Bolsa de horas de correctivo;172;95;=B6*C6;=D6*21/100;=D6+E6
Total;;;=SUM(D2:D6);=SUM(E2:E6);=SUM(F2:F6)
CSV

soffice --headless --infilter="HTML (StarWriter)" --convert-to odt contrato.html >/dev/null
soffice --headless --convert-to docx contrato.odt >/dev/null
soffice --headless --convert-to pdf contrato.odt >/dev/null
soffice --headless --infilter="HTML (StarWriter)" --convert-to pdf justificante.html >/dev/null
soffice --headless --infilter="CSV:59,34,76,1,,3082" --convert-to ods presupuesto.csv >/dev/null
soffice --headless --convert-to xlsx presupuesto.ods >/dev/null

magick -density 110 "justificante.pdf[0]" -background white -flatten -colorspace Gray \
  -crop 100%x45%+0+0 +repage -rotate 0.6 -attenuate 0.25 +noise Gaussian -quality 82 justificante.jpg
magick -size 900x520 xc:white -font Liberation-Sans -fill '#222' -pointsize 26 \
  -annotate +40+50 'Ejecución del contrato 2026/CONT/0142 (euros)' -fill '#067781' \
  -draw 'rectangle 80,420 180,300' -draw 'rectangle 230,420 330,240' -draw 'rectangle 380,420 480,190' \
  -draw 'rectangle 530,420 630,150' -draw 'rectangle 680,420 780,110' -fill '#222' -pointsize 18 \
  -annotate +105+450 'Ene' -annotate +255+450 'Feb' -annotate +405+450 'Mar' -annotate +555+450 'Abr' -annotate +705+450 'May' \
  -draw 'line 60,420 820,420' ejecucion.png

cat > declaracion.txt <<'TXT'
DECLARACIÓN RESPONSABLE

La empresa TALLERES INVENTADOS DEL NORTE, S.L., con NIF A00000000, en relación con el
expediente 2026/CONT/0142, DECLARA bajo su responsabilidad:

1. Que cumple las condiciones establecidas legalmente para contratar con la Administración.
2. Que no está incursa en ninguna prohibición para contratar.
3. Que se halla al corriente en el cumplimiento de sus obligaciones tributarias y con la
   Seguridad Social.

En Villaejemplo, a 6 de octubre de 2026.
TXT

cat > solicitud.xml <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<solicitud xmlns="urn:villaejemplo:sede:solicitud:1.0">
  <expediente>2026/CONT/0142</expediente>
  <procedimiento codigo="CON-07">Presentación de garantía definitiva</procedimiento>
  <interesado>
    <razonSocial>TALLERES INVENTADOS DEL NORTE, S.L.</razonSocial>
    <nif>A00000000</nif>
    <domicilio>Polígono industrial La Prueba, nave 7</domicilio>
  </interesado>
  <importe moneda="EUR">2000.00</importe>
  <documentos>
    <documento nombre="aval-bancario.pdf" tipo="TD99"/>
    <documento nombre="escritura-poder.pdf" tipo="TD02"/>
  </documentos>
  <fecha>2026-10-06</fecha>
</solicitud>
XML

zip -q -X expediente.zip contrato.pdf presupuesto.xlsx justificante.jpg

cp contrato.odt contrato.docx contrato.pdf presupuesto.ods presupuesto.xlsx justificante.jpg \
  ejecucion.png declaracion.txt solicitud.xml expediente.zip "$here/"
