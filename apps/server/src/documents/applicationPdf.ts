import { PDFDocument, rgb } from "pdf-lib";
import { formatCourseDate, type ApplicationForm, type Course } from "@meridian/shared";
import { embedCyrillicFonts } from "./fonts.js";
import { formatSignedAt } from "./formatDate.js";

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4
const MARGIN = 56;
const CRIMSON = rgb(0.925, 0.145, 0.314); // #EC2550

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

export async function generateApplicationPdf(form: ApplicationForm, course: Course, signedAt: string | null): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { regular, bold } = await embedCyrillicFonts(pdfDoc);
  let page = pdfDoc.addPage(PAGE_SIZE);
  const contentWidth = PAGE_SIZE[0] - MARGIN * 2;
  let y = PAGE_SIZE[1] - MARGIN;

  const drawLine = (text: string, options: { size?: number; font?: typeof regular; gap?: number; color?: ReturnType<typeof rgb> } = {}) => {
    const size = options.size ?? 11;
    const font = options.font ?? regular;
    const lines = wrapText(text, font, size, contentWidth);
    for (const line of lines) {
      if (y < MARGIN + 40) {
        page = pdfDoc.addPage(PAGE_SIZE);
        y = PAGE_SIZE[1] - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y, size, font, color: options.color ?? rgb(0, 0, 0) });
      y -= size * 1.5;
    }
    y -= options.gap ?? 4;
  };

  drawLine("ЗАЯВЛЕНИЕ", { size: 18, font: bold, gap: 4 });
  drawLine("о приёме на обучение по программе дополнительного профессионального образования", {
    size: 11,
    gap: 16,
  });

  drawLine(`Ректору Московского Политеха`, { size: 11 });
  drawLine(`от ${form.fullName}`, { size: 11, gap: 16 });

  drawLine(
    `Прошу принять меня на обучение по программе «${course.title}» (${course.hours} ак. ч., срок обучения: ${formatCourseDate(course.durationFrom)} — ${formatCourseDate(course.durationTo)}).`,
    { gap: 16 }
  );

  drawLine("Сведения о заявителе", { size: 13, font: bold, gap: 8 });
  const fields: [string, string][] = [
    ["Ф. И. О.", form.fullName],
    ["Дата рождения", form.birthDate],
    ["Телефон", form.phone],
    ["E-mail", form.email],
    ["Паспорт", form.passport],
    ["Выдан", form.passportIssuedBy],
    ["Адрес регистрации", form.addressRegistration],
    ["Адрес проживания", form.addressResidence],
    ["СНИЛС", form.snils],
    ["ИНН", form.inn],
    ["Образование", form.education],
    ["Уровень образования", form.educationLevel],
    ["Категория работников", form.workerCategory],
    ["Категория должности", form.positionCategory],
    ["Отрасль экономики", form.industry],
  ];
  for (const [label, value] of fields) {
    drawLine(`${label}: ${value || "—"}`, { gap: 3 });
  }

  y -= 20;
  drawLine(`Дата подписания: ${signedAt ? formatSignedAt(signedAt) : "не подписано"}`, { gap: 8 });

  if (signedAt) {
    const stampY = y - 10;
    page.drawRectangle({
      x: MARGIN,
      y: stampY - 46,
      width: 260,
      height: 56,
      borderColor: CRIMSON,
      borderWidth: 1.5,
    });
    page.drawText("ПОДПИСАНО ЭЛЕКТРОННОЙ ПОДПИСЬЮ", {
      x: MARGIN + 10,
      y: stampY - 18,
      size: 9,
      font: bold,
      color: CRIMSON,
    });
    page.drawText(form.fullName, { x: MARGIN + 10, y: stampY - 32, size: 10, font: regular });
    page.drawText(formatSignedAt(signedAt), { x: MARGIN + 10, y: stampY - 44, size: 9, font: regular });
  }

  return pdfDoc.save();
}
