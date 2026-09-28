import { PDFDocument, rgb } from "pdf-lib";
import { formatCourseDate, type ApplicationForm, type Course } from "@meridian/shared";
import { embedCyrillicFonts } from "./fonts.js";
import { formatSignedAt } from "./formatDate.js";

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const CRIMSON = rgb(0.925, 0.145, 0.314);

function wrapText(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
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

export async function generateContractPdf(
  form: ApplicationForm,
  course: Course,
  contractNumber: string | null,
  studentSignedAt: string | null,
  executorSignedAt: string | null
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { regular, bold } = await embedCyrillicFonts(pdfDoc);
  let page = pdfDoc.addPage(PAGE_SIZE);
  const contentWidth = PAGE_SIZE[0] - MARGIN * 2;
  let y = PAGE_SIZE[1] - MARGIN;

  const drawLine = (text: string, options: { size?: number; font?: typeof regular; gap?: number } = {}) => {
    const size = options.size ?? 11;
    const font = options.font ?? regular;
    const lines = wrapText(text, font, size, contentWidth);
    for (const line of lines) {
      if (y < MARGIN + 40) {
        page = pdfDoc.addPage(PAGE_SIZE);
        y = PAGE_SIZE[1] - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y, size, font });
      y -= size * 1.5;
    }
    y -= options.gap ?? 4;
  };

  drawLine("ДОГОВОР", { size: 18, font: bold, gap: 2 });
  drawLine("об оказании платных образовательных услуг", { size: 12, gap: 4 });
  drawLine(`№ ${contractNumber ?? "не присвоен"}`, { size: 11, gap: 16 });

  drawLine(
    "Федеральное государственное бюджетное образовательное учреждение высшего образования «Московский политехнический университет» (Московский Политех), именуемое в дальнейшем «Исполнитель», с одной стороны,",
    { gap: 8 }
  );
  drawLine(`и ${form.fullName}, именуемый(ая) в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор о нижеследующем:`, {
    gap: 16,
  });

  drawLine("1. Предмет договора", { size: 13, font: bold, gap: 6 });
  drawLine(
    `Исполнитель обязуется оказать услуги по программе дополнительного профессионального образования «${course.title}» объёмом ${course.hours} ак. ч. в срок с ${formatCourseDate(course.durationFrom)} по ${formatCourseDate(course.durationTo)}, а Заказчик обязуется оплатить указанные услуги.`,
    { gap: 16 }
  );

  drawLine("2. Реквизиты и подписи сторон", { size: 13, font: bold, gap: 10 });
  drawLine("Заказчик:", { size: 11, font: bold, gap: 3 });
  drawLine(`Ф. И. О.: ${form.fullName}`, { gap: 2 });
  drawLine(`Паспорт: ${form.passport}, выдан: ${form.passportIssuedBy}`, { gap: 2 });
  drawLine(`Адрес регистрации: ${form.addressRegistration}`, { gap: 2 });
  drawLine(`Телефон: ${form.phone}, e-mail: ${form.email}`, { gap: 16 });

  const stampWidth = 240;
  const stampHeight = 56;

  if (studentSignedAt) {
    page.drawRectangle({ x: MARGIN, y: y - stampHeight, width: stampWidth, height: stampHeight, borderColor: CRIMSON, borderWidth: 1.5 });
    page.drawText("ПОДПИСЬ ЗАКАЗЧИКА", { x: MARGIN + 10, y: y - 18, size: 9, font: bold, color: CRIMSON });
    page.drawText(form.fullName, { x: MARGIN + 10, y: y - 32, size: 10, font: regular });
    page.drawText(formatSignedAt(studentSignedAt), { x: MARGIN + 10, y: y - 44, size: 9, font: regular });
  }

  if (executorSignedAt) {
    const rightX = PAGE_SIZE[0] - MARGIN - stampWidth;
    page.drawRectangle({ x: rightX, y: y - stampHeight, width: stampWidth, height: stampHeight, borderColor: CRIMSON, borderWidth: 1.5 });
    page.drawText("ПОДПИСЬ ИСПОЛНИТЕЛЯ", { x: rightX + 10, y: y - 18, size: 9, font: bold, color: CRIMSON });
    page.drawText("Московский Политех", { x: rightX + 10, y: y - 32, size: 10, font: regular });
    page.drawText(formatSignedAt(executorSignedAt), { x: rightX + 10, y: y - 44, size: 9, font: regular });
  }

  return pdfDoc.save();
}
