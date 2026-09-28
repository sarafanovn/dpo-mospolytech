import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";

const require = createRequire(import.meta.url);
const dejavuDir = path.join(path.dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
const FONT_PATH = path.join(dejavuDir, "DejaVuSans.ttf");
const FONT_BOLD_PATH = path.join(dejavuDir, "DejaVuSans-Bold.ttf");

export async function embedCyrillicFonts(
  pdfDoc: PDFDocument
): Promise<{ regular: PDFFont; bold: PDFFont }> {
  pdfDoc.registerFontkit(fontkit);
  const regularBytes = fs.readFileSync(FONT_PATH);
  const boldBytes = fs.readFileSync(FONT_BOLD_PATH);
  const regular = await pdfDoc.embedFont(regularBytes);
  const bold = await pdfDoc.embedFont(boldBytes);
  return { regular, bold };
}
