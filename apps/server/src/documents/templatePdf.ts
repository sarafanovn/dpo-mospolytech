import crypto from "node:crypto";
import { PDFDocument, rgb } from "pdf-lib";
import { embedCyrillicFonts } from "./fonts.js";
import { formatSignedAt } from "./formatDate.js";
import { LAYOUT_MARKER, LayoutRenderer, type SignatureStamp } from "./layoutPdf.js";

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4
const MARGIN = 56;
const CRIMSON = rgb(0.902, 0.196, 0.275); // #E63246
const STAMP_WIDTH = 240;
const STAMP_HEIGHT = 68;

export interface PdfStamp {
  title: string;
  name: string;
  /** ISO timestamp of signing; null renders an empty signature line instead of a stamp. */
  signedAt: string | null;
  side: "left" | "right";
}

/** Short fingerprint printed on the stamp so a signed PDF can be tied back to the signing event. */
export function signatureId(...parts: (string | number)[]): string {
  const hash = crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16).toUpperCase();
  return hash.replace(/(.{4})(?=.)/g, "$1-");
}

type Font = { widthOfTextAtSize: (t: string, s: number) => number };

function wrapText(text: string, font: Font, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function fillPlaceholders(content: string, values: Record<string, string>): string {
  // Unknown placeholders stay visible so typos in an uploaded template are easy to spot.
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? values[key] || "—" : match
  );
}

export async function renderTemplatePdf(
  content: string,
  values: Record<string, string>,
  stamps: PdfStamp[],
  signatureSeed: string
): Promise<Uint8Array> {
  if (content.trimStart().startsWith(LAYOUT_MARKER)) return renderLayoutPdf(content, values, stamps, signatureSeed);

  const pdfDoc = await PDFDocument.create();
  const { regular, bold } = await embedCyrillicFonts(pdfDoc);
  let page = pdfDoc.addPage(PAGE_SIZE);
  const contentWidth = PAGE_SIZE[0] - MARGIN * 2;
  let y = PAGE_SIZE[1] - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdfDoc.addPage(PAGE_SIZE);
      y = PAGE_SIZE[1] - MARGIN;
    }
  };

  const drawParagraph = (text: string, size: number, font: typeof regular, gap: number) => {
    for (const line of wrapText(text, font, size, contentWidth)) {
      ensureSpace(size * 1.5);
      page.drawText(line, { x: MARGIN, y: y - size, size, font });
      y -= size * 1.5;
    }
    y -= gap;
  };

  for (const rawLine of fillPlaceholders(content, values).split("\n")) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      y -= 8;
    } else if (line.startsWith("## ")) {
      y -= 6;
      drawParagraph(line.slice(3), 13, bold, 4);
    } else if (line.startsWith("# ")) {
      drawParagraph(line.slice(2), 18, bold, 2);
    } else {
      drawParagraph(line, 11, regular, 2);
    }
  }

  if (stamps.length > 0) {
    ensureSpace(STAMP_HEIGHT + 30);
    y -= 24;
    for (const stamp of stamps) {
      const x = stamp.side === "left" ? MARGIN : PAGE_SIZE[0] - MARGIN - STAMP_WIDTH;
      if (!stamp.signedAt) {
        page.drawText(`${stamp.title}: ______________________`, { x, y: y - 14, size: 9, font: regular });
        page.drawText("(не подписано)", { x, y: y - 28, size: 8, font: regular, color: rgb(0.45, 0.45, 0.45) });
        continue;
      }
      page.drawRectangle({
        x,
        y: y - STAMP_HEIGHT,
        width: STAMP_WIDTH,
        height: STAMP_HEIGHT,
        borderColor: CRIMSON,
        borderWidth: 1.5,
      });
      page.drawText("ПОДПИСАНО ЭЛЕКТРОННОЙ ПОДПИСЬЮ", { x: x + 10, y: y - 16, size: 8.5, font: bold, color: CRIMSON });
      page.drawText(stamp.title, { x: x + 10, y: y - 29, size: 8, font: regular });
      page.drawText(stamp.name, { x: x + 10, y: y - 43, size: 10, font: bold });
      page.drawText(formatSignedAt(stamp.signedAt), { x: x + 10, y: y - 54, size: 8, font: regular });
      page.drawText(`ID подписи: ${signatureId(signatureSeed, stamp.side, stamp.signedAt)}`, {
        x: x + 10,
        y: y - 64,
        size: 7,
        font: regular,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }

  return pdfDoc.save();
}

/**
 * Templates that reproduce the university's Word forms. The left stamp is the student's signature and the
 * right one the executor's; a template places them with "@sign student" / "@sign executor".
 */
function renderLayoutPdf(content: string, values: Record<string, string>, stamps: PdfStamp[], signatureSeed: string) {
  const signatures: Record<string, SignatureStamp> = {};
  for (const stamp of stamps) {
    signatures[stamp.side === "left" ? "student" : "executor"] = {
      title: stamp.title,
      name: stamp.name,
      signedAt: stamp.signedAt,
      id: signatureId(signatureSeed, stamp.side, stamp.signedAt ?? ""),
    };
  }
  // Unknown placeholders stay visible so typos in an edited template are easy to spot; empty values stay blank.
  const fill = (text: string) => text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => (key in values ? values[key] : match));
  return LayoutRenderer.render(content, fill, signatures);
}
