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

// Tinos is metric-compatible with Times New Roman (the font of the university's Word templates),
// so lines wrap exactly as they do in the .docx files, and unlike Times it is freely redistributable.
const tinosDir = path.dirname(require.resolve("@expo-google-fonts/tinos/package.json"));
const tinosFile = (style: string) => path.join(tinosDir, style, `Tinos_${style}.ttf`);

export interface SerifFonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}

export async function embedSerifFonts(pdfDoc: PDFDocument): Promise<SerifFonts> {
  pdfDoc.registerFontkit(fontkit);
  const embed = (style: string) => pdfDoc.embedFont(fs.readFileSync(tinosFile(style)));
  const [regular, bold, italic, boldItalic] = await Promise.all([
    embed("400Regular"),
    embed("700Bold"),
    embed("400Regular_Italic"),
    embed("700Bold_Italic"),
  ]);
  return { regular, bold, italic, boldItalic };
}
