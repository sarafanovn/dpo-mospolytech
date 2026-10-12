// Layout engine for templates that must look like the university's Word forms (application, contract).
// A template is a small line-based markup (first line "@doc"); see parseLayout for the syntax.
import { PDFDocument, PDFPage, rgb } from "pdf-lib";
import { embedSerifFonts, type SerifFonts } from "./fonts.js";
import { formatSignedAt } from "./formatDate.js";

export const LAYOUT_MARKER = "@doc";

const TW = 1 / 20; // twip -> pt
const PAGE: [number, number] = [595.3, 841.9]; // A4
// Margins and typography of the Word templates: Times New Roman 12 pt, single spacing, no space after paragraphs.
const MARGIN = { top: 851 * TW, right: 850 * TW, bottom: 1134 * TW, left: 1701 * TW };
const BASE_SIZE = 12;
const LINE_FACTOR = 1.149; // Times New Roman line height / font size
const ASCENT = 0.891;
const FIRST_INDENT = 708 * TW;
const CELL_PAD = 108 * TW;
const BORDER = 0.5;
const STAMP_W = 230;
const STAMP_H = 38;
const CRIMSON = rgb(0.902, 0.196, 0.275);
const BLACK = rgb(0, 0, 0);

type Align = "left" | "center" | "right" | "justify";

interface ParaStyle {
  align: Align;
  firstIndent: number;
  leftIndent: number;
  size: number;
  bold: boolean;
  italic: boolean;
}

interface Cell {
  span: number;
  borders: string; // letters t r b l
  valign: "top" | "center";
  blocks: Block[];
}

interface Row {
  minHeight: number;
  keep: boolean;
  cells: Cell[];
}

type Block =
  | { kind: "para"; text: string; style: ParaStyle }
  | { kind: "pagebreak" }
  | { kind: "sign"; who: string; align: Align; underline: boolean; minHeight: number }
  | { kind: "field"; text: string; caption: string; minHeight: number }
  | { kind: "fill"; label: string; text: string; minHeight: number; labelWidth: number | null }
  | { kind: "table"; widths: number[]; indent: number; rows: Row[] };

export interface SignatureStamp {
  title: string;
  name: string;
  /** ISO timestamp; null means "not signed yet". */
  signedAt: string | null;
  id: string;
}

// ---------- parsing ----------

const defaultStyle = (): ParaStyle => ({ align: "left", firstIndent: 0, leftIndent: 0, size: BASE_SIZE, bold: false, italic: false });

function applyFlag(style: ParaStyle, token: string): boolean {
  const [key, val] = token.split("=");
  const num = Number(val);
  switch (key) {
    case "c": style.align = "center"; return true;
    case "r": style.align = "right"; return true;
    case "j": style.align = "justify"; return true;
    case "i": style.firstIndent = FIRST_INDENT; return true;
    case "b": style.bold = true; return true;
    case "it": style.italic = true; return true;
    case "ind": style.leftIndent = num; return true;
    case "s": style.size = num; return true;
    default: return false;
  }
}

/** Leading "{c b s=8}" paragraph flags. A double brace is a placeholder, never a flag block. */
function splitFlags(line: string, base: ParaStyle): { style: ParaStyle; text: string } {
  const style = { ...base };
  const m = /^\{([^{}]+)\}\s?/.exec(line);
  if (!m) return { style, text: line };
  for (const token of m[1].trim().split(/\s+/)) applyFlag(style, token);
  return { style, text: line.slice(m[0].length) };
}

/** Leading "key=value" / bare keyword options of a directive. */
function splitOptions(rest: string): { opts: Record<string, string>; text: string } {
  const opts: Record<string, string> = {};
  let text = rest.trim();
  for (;;) {
    const m = /^([a-z]+)(?:=(\S+))?(?:\s+|$)/.exec(text);
    if (!m || !OPTION_KEYS.has(m[1])) break;
    opts[m[1]] = m[2] ?? "1";
    text = text.slice(m[0].length);
  }
  return { opts, text };
}
const OPTION_KEYS = new Set(["h", "w", "keep", "line", "span", "border", "va", "widths", "indent", "cb"]);

/**
 * Template syntax (one block per line):
 *   @doc                              first line, switches the layout engine on
 *   @pagenumbers                      page number at the top centre, from page 2
 *   @pagebreak
 *   (empty line)                      blank line
 *   {c b s=8 it i ind=226.8} text     paragraph; c/r/j align, b bold, it italic, s size, i first-line indent, ind left indent (pt)
 *   **bold** inside a text            bold run
 *   {{key}}                           value placeholder
 *   @field [h=pt] value | caption     value above a rule with a small caption under it
 *   @fill [h=pt] [w=pt] label | value label followed by a value on a rule
 *   @sign who [l|r|c] [line] [h=pt]   electronic signature stamp (or an empty line / space while unsigned)
 *   @table widths=tw,tw [indent=pt] [cb=b/-/b]   ... @endtable
 *     @r [h=pt] [keep] | cell | cell  one-line row (cb = default borders per column, letters t r b l, "-" none)
 *     @row [h=pt] [keep]  +  @cell [span=n] [border=tblr] [va=center] [c b s=8 ...]  followed by block lines
 */
export function parseLayout(content: string): { blocks: Block[]; pageNumbers: boolean } {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  let pageNumbers = false;

  const parseBlocks = (start: number, until: (line: string) => boolean, base: ParaStyle): { blocks: Block[]; next: number } => {
    const blocks: Block[] = [];
    let i = start;
    while (i < lines.length && !until(lines[i])) {
      const raw = lines[i].trimEnd();
      i += 1;
      if (raw.startsWith("@")) {
        const [, name, rest = ""] = /^@(\w+)\s*(.*)$/.exec(raw) ?? [];
        if (name === "pagenumbers") pageNumbers = true;
        else if (name === "pagebreak") blocks.push({ kind: "pagebreak" });
        else if (name === "field") {
          const { opts, text } = splitOptions(rest);
          const [value, caption = ""] = text.split("|").map((s) => s.trim());
          blocks.push({ kind: "field", text: value, caption, minHeight: Number(opts.h ?? 0) });
        } else if (name === "fill") {
          const { opts, text } = splitOptions(rest);
          const [label, value = ""] = text.split("|").map((s) => s.trim());
          blocks.push({ kind: "fill", label, text: value, minHeight: Number(opts.h ?? 0), labelWidth: opts.w ? Number(opts.w) : null });
        } else if (name === "sign") {
          const [who, ...flags] = rest.split(/\s+/).filter(Boolean);
          blocks.push({
            kind: "sign",
            who,
            align: flags.includes("r") ? "right" : flags.includes("c") ? "center" : "left",
            underline: flags.includes("line"),
            minHeight: Number(flags.find((f) => f.startsWith("h="))?.slice(2) ?? 0),
          });
        } else if (name === "table") {
          const parsed = parseTable(rest, i, base);
          blocks.push(parsed.block);
          i = parsed.next;
        }
        continue;
      }
      if (raw.trim() === "") {
        blocks.push({ kind: "para", text: "", style: { ...base } });
        continue;
      }
      const { style, text } = splitFlags(raw, base);
      blocks.push({ kind: "para", text, style });
    }
    return { blocks, next: i };
  };

  const isTableDirective = (line: string) => /^@(row|r|cell|endtable)\b/.test(line);

  const parseTable = (header: string, start: number, base: ParaStyle): { block: Block; next: number } => {
    const { opts } = splitOptions(header);
    const widths = (opts.widths ?? "").split(",").map((w) => Number(w) * TW);
    const columnBorders = (opts.cb ?? "").split("/");
    const rows: Row[] = [];
    let i = start;
    while (i < lines.length) {
      const raw = lines[i].trimEnd();
      if (raw.startsWith("@endtable")) {
        i += 1;
        break;
      }
      if (raw.startsWith("@r ")) {
        const [head, ...cellTexts] = raw.split("|").map((s) => s.trim());
        const { opts: rowOpts } = splitOptions(head.slice(2));
        rows.push({
          minHeight: Number(rowOpts.h ?? 0),
          keep: "keep" in rowOpts,
          cells: cellTexts.map((t, col) => {
            const { style, text } = splitFlags(t, base);
            const borders = (columnBorders[col] ?? "-").replace("-", "");
            return { span: 1, borders, valign: "top", blocks: [{ kind: "para", text, style }] };
          }),
        });
        i += 1;
      } else if (raw.startsWith("@row")) {
        const { opts: rowOpts } = splitOptions(raw.slice(4));
        const cells: Cell[] = [];
        i += 1;
        while (i < lines.length && /^@cell\b/.test(lines[i])) {
          const cellHead = lines[i].trimEnd().slice(5).trim();
          const cellStyle = { ...base };
          let span = 1;
          let borders = "";
          let valign: "top" | "center" = "top";
          for (const token of cellHead.split(/\s+/).filter(Boolean)) {
            if (token.startsWith("span=")) span = Number(token.slice(5));
            else if (token.startsWith("border=")) borders = token.slice(7);
            else if (token === "va=center") valign = "center";
            else applyFlag(cellStyle, token);
          }
          i += 1;
          const inner = parseBlocks(i, (l) => isTableDirective(l), cellStyle);
          i = inner.next;
          cells.push({ span, borders, valign, blocks: inner.blocks });
        }
        rows.push({ minHeight: Number(rowOpts.h ?? 0), keep: "keep" in rowOpts, cells });
      } else {
        i += 1;
      }
    }
    return { block: { kind: "table", widths, indent: Number(opts.indent ?? 0), rows }, next: i };
  };

  const { blocks } = parseBlocks(lines[0]?.trim() === LAYOUT_MARKER ? 1 : 0, () => false, defaultStyle());
  return { blocks, pageNumbers };
}

// ---------- layout + drawing ----------

interface Word {
  text: string;
  width: number;
  bold: boolean;
}

interface TextLine {
  words: Word[];
  width: number;
  spaces: number;
  last: boolean;
}

const lineHeight = (size: number) => size * LINE_FACTOR;

export class LayoutRenderer {
  private page!: PDFPage;
  private y = 0;
  private pageNo = 0;

  private constructor(
    private pdf: PDFDocument,
    private fonts: SerifFonts,
    private fill: (text: string) => string,
    private signatures: Record<string, SignatureStamp | undefined>,
    private pageNumbers: boolean
  ) {}

  static async render(
    content: string,
    fill: (text: string) => string,
    signatures: Record<string, SignatureStamp | undefined>
  ): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const fonts = await embedSerifFonts(pdf);
    const { blocks, pageNumbers } = parseLayout(content);
    const r = new LayoutRenderer(pdf, fonts, fill, signatures, pageNumbers);
    r.newPage();
    for (const block of blocks) r.flow(block);
    return pdf.save();
  }

  private get contentWidth() {
    return PAGE[0] - MARGIN.left - MARGIN.right;
  }

  private newPage() {
    this.page = this.pdf.addPage(PAGE);
    this.pageNo += 1;
    this.y = PAGE[1] - MARGIN.top;
    if (this.pageNumbers && this.pageNo > 1) {
      const label = String(this.pageNo);
      const size = 10;
      const w = this.fonts.regular.widthOfTextAtSize(label, size);
      this.page.drawText(label, { x: (PAGE[0] - w) / 2, y: PAGE[1] - 35.4 - size, size, font: this.fonts.regular });
    }
  }

  private ensure(height: number) {
    if (this.y - height < MARGIN.bottom) this.newPage();
  }

  private flow(block: Block) {
    switch (block.kind) {
      case "pagebreak":
        this.newPage();
        return;
      case "para": {
        const lines = this.breakLines(block.text, block.style, this.contentWidth);
        const lh = lineHeight(block.style.size);
        lines.forEach((line, index) => {
          this.ensure(lh);
          this.drawLine(line, index === 0, block.style, MARGIN.left, this.y, this.contentWidth);
          this.y -= lh;
        });
        return;
      }
      case "table":
        this.flowTable(block);
        return;
      default: {
        const h = this.measure(block, this.contentWidth);
        this.ensure(h);
        this.draw(block, MARGIN.left, this.y, this.contentWidth);
        this.y -= h;
      }
    }
  }

  private flowTable(table: Extract<Block, { kind: "table" }>) {
    const width = this.contentWidth - table.indent;
    const heights = table.rows.map((row) => this.rowHeight(table, row));
    table.rows.forEach((row, index) => {
      const needed = heights[index] + (row.keep ? (heights[index + 1] ?? 0) : 0);
      this.ensure(needed);
      this.drawRow(table, row, heights[index], MARGIN.left + table.indent, this.y);
      this.y -= heights[index];
    });
    void width;
  }

  // ----- text -----

  private fontFor(style: ParaStyle, bold: boolean) {
    const b = style.bold || bold;
    if (b && style.italic) return this.fonts.boldItalic;
    if (b) return this.fonts.bold;
    return style.italic ? this.fonts.italic : this.fonts.regular;
  }

  /** Splits text into styled words ("**" toggles bold), fills placeholders and wraps to the given width. */
  private breakLines(raw: string, style: ParaStyle, width: number): TextLine[] {
    const words: Word[] = [];
    raw.split("**").forEach((segment, idx) => {
      const bold = idx % 2 === 1;
      const font = this.fontFor(style, bold);
      for (const word of this.fill(segment).split(/[ \t\r\n]+/).filter(Boolean)) {
        const text = word.replace(/ /g, " ");
        words.push({ text, width: font.widthOfTextAtSize(text, style.size), bold: style.bold || bold });
      }
    });
    const space = this.fontFor(style, false).widthOfTextAtSize(" ", style.size);
    const lines: TextLine[] = [];
    let current: Word[] = [];
    let currentWidth = 0;
    const avail = (first: boolean) => width - style.leftIndent - (first ? style.firstIndent : 0);
    const flush = () => {
      lines.push({ words: current, width: currentWidth, spaces: Math.max(0, current.length - 1), last: false });
      current = [];
      currentWidth = 0;
    };
    for (const word of words) {
      const next = current.length ? currentWidth + space + word.width : word.width;
      if (current.length && next > avail(lines.length === 0)) flush();
      currentWidth = current.length ? currentWidth + space + word.width : word.width;
      current.push(word);
    }
    if (current.length || lines.length === 0) flush();
    lines[lines.length - 1].last = true;
    return lines;
  }

  private drawLine(line: TextLine, first: boolean, style: ParaStyle, x: number, yTop: number, width: number) {
    const font = (w: Word) => this.fontFor(style, w.bold);
    const space = this.fontFor(style, false).widthOfTextAtSize(" ", style.size);
    const left = x + style.leftIndent + (first ? style.firstIndent : 0);
    const avail = x + width - left;
    let gap = space;
    let cursor = left;
    if (style.align === "center") cursor = left + (avail - line.width) / 2;
    else if (style.align === "right") cursor = left + avail - line.width;
    else if (style.align === "justify" && !line.last && line.spaces > 0) gap = space + (avail - line.width) / line.spaces;
    const baseline = yTop - ASCENT * style.size;
    for (const word of line.words) {
      this.page.drawText(word.text, { x: cursor, y: baseline, size: style.size, font: font(word) });
      cursor += word.width + gap;
    }
  }

  private paraHeight(text: string, style: ParaStyle, width: number) {
    return this.breakLines(text, style, width).length * lineHeight(style.size);
  }

  private drawPara(text: string, style: ParaStyle, x: number, yTop: number, width: number): number {
    const lines = this.breakLines(text, style, width);
    lines.forEach((line, index) => this.drawLine(line, index === 0, style, x, yTop - index * lineHeight(style.size), width));
    return lines.length * lineHeight(style.size);
  }

  // ----- blocks inside containers (cells) -----

  private rule(x1: number, x2: number, y: number) {
    this.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: BORDER, color: BLACK });
  }

  private vrule(x: number, y1: number, y2: number) {
    this.page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: BORDER, color: BLACK });
  }

  private captionStyle(): ParaStyle {
    return { ...defaultStyle(), align: "center", size: 8, italic: true };
  }

  private signed(who: string) {
    const s = this.signatures[who];
    return s?.signedAt ? s : null;
  }

  private measure(block: Block, width: number): number {
    switch (block.kind) {
      case "para":
        return this.paraHeight(block.text, block.style, width);
      case "pagebreak":
        return 0;
      case "sign":
        return this.signed(block.who) ? STAMP_H : block.underline ? lineHeight(BASE_SIZE) : block.minHeight;
      case "field": {
        const value = Math.max(block.minHeight, this.paraHeight(block.text, { ...defaultStyle(), align: "center" }, width - 2 * CELL_PAD));
        return value + (block.caption ? lineHeight(8) : 0);
      }
      case "fill": {
        const { labelW, valueW } = this.fillWidths(block, width);
        void labelW;
        return Math.max(block.minHeight, this.paraHeight(block.text, defaultStyle(), valueW), lineHeight(BASE_SIZE));
      }
      case "table":
        return block.rows.reduce((sum, row) => sum + this.rowHeight(block, row), 0);
    }
  }

  private fillWidths(block: Extract<Block, { kind: "fill" }>, width: number) {
    const labelW = block.label
      ? (block.labelWidth ?? this.fonts.regular.widthOfTextAtSize(this.fill(block.label), BASE_SIZE) + 6)
      : 0;
    return { labelW, valueW: width - labelW };
  }

  private draw(block: Block, x: number, yTop: number, width: number) {
    switch (block.kind) {
      case "para":
        this.drawPara(block.text, block.style, x, yTop, width);
        return;
      case "pagebreak":
        return;
      case "sign": {
        const stamp = this.signed(block.who);
        if (stamp) {
          const w = Math.min(STAMP_W, width);
          const sx = block.align === "right" ? x + width - w : block.align === "center" ? x + (width - w) / 2 : x;
          this.drawStamp(stamp, sx, yTop, w);
        } else if (block.underline) {
          this.drawPara("______________", { ...defaultStyle(), align: block.align === "left" ? "left" : block.align }, x, yTop, width);
        }
        return;
      }
      case "field": {
        const valueH = this.measure({ ...block, caption: "" }, width);
        this.drawPara(block.text, { ...defaultStyle(), align: "center" }, x + CELL_PAD, yTop, width - 2 * CELL_PAD);
        this.rule(x, x + width, yTop - valueH);
        if (block.caption) this.drawPara(block.caption, this.captionStyle(), x, yTop - valueH, width);
        return;
      }
      case "fill": {
        const { labelW, valueW } = this.fillWidths(block, width);
        const h = this.measure(block, width);
        if (block.label) this.drawPara(block.label, defaultStyle(), x, yTop, labelW);
        this.drawPara(block.text, defaultStyle(), x + labelW, yTop, valueW);
        this.rule(x + labelW, x + width, yTop - h);
        return;
      }
      case "table": {
        let y = yTop;
        for (const row of block.rows) {
          const h = this.rowHeight(block, row);
          this.drawRow(block, row, h, x + block.indent, y);
          y -= h;
        }
      }
    }
  }

  private cellWidth(table: Extract<Block, { kind: "table" }>, row: Row, index: number) {
    let col = 0;
    for (let c = 0; c < index; c++) col += row.cells[c].span;
    const span = row.cells[index].span;
    return {
      left: table.widths.slice(0, col).reduce((a, b) => a + b, 0),
      width: table.widths.slice(col, col + span).reduce((a, b) => a + b, 0),
    };
  }

  private cellHeight(cell: Cell, width: number) {
    return cell.blocks.reduce((sum, b) => sum + this.measure(b, width - 2 * CELL_PAD), 0);
  }

  private rowHeight(table: Extract<Block, { kind: "table" }>, row: Row) {
    let h = Math.max(row.minHeight, lineHeight(BASE_SIZE) * 0);
    row.cells.forEach((cell, index) => {
      h = Math.max(h, this.cellHeight(cell, this.cellWidth(table, row, index).width));
    });
    return h;
  }

  private drawRow(table: Extract<Block, { kind: "table" }>, row: Row, height: number, x: number, yTop: number) {
    row.cells.forEach((cell, index) => {
      const { left, width } = this.cellWidth(table, row, index);
      const cx = x + left;
      const inner = width - 2 * CELL_PAD;
      let y = yTop;
      if (cell.valign === "center") y -= (height - this.cellHeight(cell, width)) / 2;
      for (const block of cell.blocks) {
        this.draw(block, cx + CELL_PAD, y, inner);
        y -= this.measure(block, inner);
      }
      if (cell.borders.includes("t")) this.rule(cx, cx + width, yTop);
      if (cell.borders.includes("b")) this.rule(cx, cx + width, yTop - height);
      if (cell.borders.includes("l")) this.vrule(cx, yTop, yTop - height);
      if (cell.borders.includes("r")) this.vrule(cx + width, yTop, yTop - height);
    });
  }

  private drawStamp(stamp: SignatureStamp, x: number, yTop: number, width: number) {
    const { regular, bold } = this.fonts;
    this.page.drawRectangle({ x, y: yTop - STAMP_H, width, height: STAMP_H, borderColor: CRIMSON, borderWidth: 1 });
    this.page.drawText("ПОДПИСАНО ЭЛЕКТРОННОЙ ПОДПИСЬЮ", { x: x + 6, y: yTop - 11, size: 7.5, font: bold, color: CRIMSON });
    this.page.drawText(`${stamp.title}`, { x: x + 6, y: yTop - 20.5, size: 7.5, font: regular });
    this.page.drawText(`${stamp.name} · ${formatSignedAt(stamp.signedAt!)}`, { x: x + 6, y: yTop - 29, size: 7.5, font: bold });
    this.page.drawText(`ID подписи: ${stamp.id}`, { x: x + 6, y: yTop - 35.5, size: 6, font: regular, color: rgb(0.4, 0.4, 0.4) });
  }
}
