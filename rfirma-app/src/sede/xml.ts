//! El XML recibido como lo enseña el visor: decodificado con la codificación que declara e indentado en trozos del documento con su profundidad. Sin React.

/** Un trozo del documento, tal como viene, con la profundidad a la que se enseña. */
export interface XmlLine {
  depth: number;
  text: string;
}

type TokenKind = "open" | "close" | "empty" | "text" | "cdata" | "markup";

interface Token {
  kind: TokenKind;
  start: number;
  end: number;
}

type XmlNode =
  | { kind: "element"; open: Token; close: Token; children: XmlNode[] }
  | { kind: "leaf"; token: Token };

const DECLARED_ENCODING = /^(?:ï»¿)?<\?xml\s[^>]*?encoding\s*=\s*["']([^"']+)["']/;
const DECLARATION_REACH = 256;

/** El texto de los bytes con la codificación que declara el XML, o en UTF-8 si no declara ninguna que se conozca. */
export function decodedXml(bytes: Uint8Array): string {
  const head = String.fromCharCode(...bytes.subarray(0, DECLARATION_REACH));
  const label = DECLARED_ENCODING.exec(head)?.[1];
  return decoderFor(label).decode(bytes);
}

function decoderFor(label: string | undefined): TextDecoder {
  if (label === undefined) return new TextDecoder();
  try {
    return new TextDecoder(label);
  } catch {
    return new TextDecoder();
  }
}

/** Las líneas indentadas del XML, o `null` si no se puede analizar. */
export function indentedXml(text: string): readonly XmlLine[] | null {
  if (!parses(text)) return null;
  const tokens = tokenize(text);
  const nodes = tokens === null ? null : treeOf(tokens);
  if (nodes === null) return null;
  const lines: XmlLine[] = [];
  for (const node of nodes) emit(node, 0, text, lines);
  return lines;
}

function parses(text: string): boolean {
  const parsed = new DOMParser().parseFromString(text, "application/xml");
  return parsed.getElementsByTagName("parsererror").length === 0;
}

function tokenize(text: string): Token[] | null {
  const tokens: Token[] = [];
  let at = 0;
  while (at < text.length) {
    const token = tokenAt(text, at);
    if (token === null) return null;
    tokens.push(token);
    at = token.end;
  }
  return tokens;
}

function tokenAt(text: string, start: number): Token | null {
  if (text[start] !== "<") {
    const next = text.indexOf("<", start);
    return { kind: "text", start, end: next === -1 ? text.length : next };
  }
  if (text.startsWith("<!--", start)) return delimited(text, start, "-->", "markup");
  if (text.startsWith("<![CDATA[", start)) return delimited(text, start, "]]>", "cdata");
  if (text.startsWith("<?", start)) return delimited(text, start, "?>", "markup");
  if (text.startsWith("<!", start)) return declaration(text, start);
  if (text.startsWith("</", start)) return delimited(text, start, ">", "close");
  return tag(text, start);
}

function delimited(text: string, start: number, closing: string, kind: TokenKind): Token | null {
  const at = text.indexOf(closing, start);
  return at === -1 ? null : { kind, start, end: at + closing.length };
}

function declaration(text: string, start: number): Token | null {
  let quote: string | null = null;
  let brackets = 0;
  for (let at = start + 2; at < text.length; at++) {
    const char = text[at];
    if (quote !== null) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === "[") brackets++;
    else if (char === "]") brackets--;
    else if (char === ">" && brackets === 0) return { kind: "markup", start, end: at + 1 };
  }
  return null;
}

function tag(text: string, start: number): Token | null {
  let quote: string | null = null;
  for (let at = start + 1; at < text.length; at++) {
    const char = text[at];
    if (quote !== null) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === ">") {
      return { kind: text[at - 1] === "/" ? "empty" : "open", start, end: at + 1 };
    }
  }
  return null;
}

function treeOf(tokens: readonly Token[]): XmlNode[] | null {
  const root: XmlNode[] = [];
  const open: { token: Token; children: XmlNode[] }[] = [];
  for (const token of tokens) {
    const siblings = open.at(-1)?.children ?? root;
    if (token.kind === "open") {
      open.push({ token, children: [] });
    } else if (token.kind === "close") {
      const element = open.pop();
      if (element === undefined) return null;
      (open.at(-1)?.children ?? root).push({
        kind: "element",
        open: element.token,
        close: token,
        children: element.children,
      });
    } else {
      siblings.push({ kind: "leaf", token });
    }
  }
  return open.length === 0 ? root : null;
}

function emit(node: XmlNode, depth: number, text: string, lines: XmlLine[]) {
  if (node.kind === "leaf") {
    if (!isBlank(node.token, text)) lines.push(lineOf(node.token.start, node.token.end));
    return;
  }
  if (staysOnOneLine(node.children, text)) {
    lines.push(lineOf(node.open.start, node.close.end));
    return;
  }
  lines.push(lineOf(node.open.start, node.open.end));
  for (const child of node.children) emit(child, depth + 1, text, lines);
  lines.push(lineOf(node.close.start, node.close.end));

  function lineOf(start: number, end: number): XmlLine {
    return { depth, text: text.slice(start, end) };
  }
}

function staysOnOneLine(children: readonly XmlNode[], text: string): boolean {
  const hasElements = children.some(
    (child) => child.kind === "element" || child.token.kind === "empty",
  );
  return !hasElements || children.some((child) => carriesText(child, text));
}

function carriesText(node: XmlNode, text: string): boolean {
  if (node.kind === "element") return false;
  return node.token.kind === "cdata" || (node.token.kind === "text" && !isBlank(node.token, text));
}

function isBlank(token: Token, text: string): boolean {
  return token.kind === "text" && text.slice(token.start, token.end).trim() === "";
}
