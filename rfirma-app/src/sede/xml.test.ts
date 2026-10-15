import { describe, expect, it } from "vitest";
import { decodedXml, indentedXml } from "./xml";

describe("indentedXml", () => {
  it.each([
    [
      "one line",
      '<?xml version="1.0"?><baremo convocatoria="FACHADAS-2026"><criterio id="1">Antigüedad</criterio><solicitudes total="38"/></baremo>',
      [
        [0, '<?xml version="1.0"?>'],
        [0, '<baremo convocatoria="FACHADAS-2026">'],
        [1, '<criterio id="1">Antigüedad</criterio>'],
        [1, '<solicitudes total="38"/>'],
        [0, "</baremo>"],
      ],
    ],
    [
      "already indented",
      "<a>\n\n  <b>\n    <c>uno</c>\n  </b>\n\n</a>\n",
      [
        [0, "<a>"],
        [1, "<b>"],
        [2, "<c>uno</c>"],
        [1, "</b>"],
        [0, "</a>"],
      ],
    ],
    [
      "mixed content",
      "<doc><p>Pagar <b>ya</b> o  <i>nunca</i>.</p></doc>",
      [
        [0, "<doc>"],
        [1, "<p>Pagar <b>ya</b> o  <i>nunca</i>.</p>"],
        [0, "</doc>"],
      ],
    ],
    [
      "CDATA beside elements",
      "<doc><nota><![CDATA[a < b]]><b/></nota><dato><![CDATA[x]]></dato></doc>",
      [
        [0, "<doc>"],
        [1, "<nota><![CDATA[a < b]]><b/></nota>"],
        [1, "<dato><![CDATA[x]]></dato>"],
        [0, "</doc>"],
      ],
    ],
    [
      "comments and processing instructions",
      '<!-- cabecera --><?hoja tipo="x"?><doc><!-- dentro --><?paso uno?><a/></doc><!-- pie -->',
      [
        [0, "<!-- cabecera -->"],
        [0, '<?hoja tipo="x"?>'],
        [0, "<doc>"],
        [1, "<!-- dentro -->"],
        [1, "<?paso uno?>"],
        [1, "<a/>"],
        [0, "</doc>"],
        [0, "<!-- pie -->"],
      ],
    ],
    [
      "attributes with namespaces and a > in their value",
      "<fe:Facturae xmlns:fe='urn:fe'  b=\"1 > 0\"><fe:Total moneda='EUR'>10</fe:Total></fe:Facturae>",
      [
        [0, "<fe:Facturae xmlns:fe='urn:fe'  b=\"1 > 0\">"],
        [1, "<fe:Total moneda='EUR'>10</fe:Total>"],
        [0, "</fe:Facturae>"],
      ],
    ],
    [
      "a doctype with its internal subset",
      '<!DOCTYPE doc [<!ATTLIST a t CDATA "x>y">]><doc><a>e</a></doc>',
      [
        [0, '<!DOCTYPE doc [<!ATTLIST a t CDATA "x>y">]>'],
        [0, "<doc>"],
        [1, "<a>e</a>"],
        [0, "</doc>"],
      ],
    ],
  ])("indents %s", (_, text, lines) => {
    expect(indentedXml(text)?.map(({ depth, text }) => [depth, text])).toEqual(lines);
  });

  it.each([
    ["an unclosed element", "<a><b></a>"],
    ["plain text", "esto no es XML"],
  ])("gives nothing for %s", (_, text) => {
    expect(indentedXml(text)).toBeNull();
  });
});

describe("decodedXml", () => {
  const latin1 = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));

  it("decodes with the encoding the XML declares", () => {
    const bytes = latin1('<?xml version="1.0" encoding="ISO-8859-1"?><n>Peña Antigüedad</n>');

    expect(decodedXml(bytes)).toBe(
      '<?xml version="1.0" encoding="ISO-8859-1"?><n>Peña Antigüedad</n>',
    );
  });

  it.each([
    ["without a declaration", "<n>Peña</n>"],
    ["with an unknown encoding", '<?xml version="1.0" encoding="x-desconocida"?><n>Peña</n>'],
  ])("decodes as UTF-8 %s", (_, text) => {
    expect(decodedXml(new TextEncoder().encode(text))).toBe(text);
  });
});
