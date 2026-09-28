import { PDFDocument, rgb } from "pdf-lib";
import { formatIsoDate, type ApplicationForm, type Course, type CertificateType } from "@meridian/shared";
import { embedCyrillicFonts } from "./fonts.js";
import { formatSignedAt } from "./formatDate.js";

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const CRIMSON = rgb(0.925, 0.145, 0.314);

export async function generateCertificatePdf(
  type: CertificateType,
  form: ApplicationForm,
  course: Course,
  issuedAt: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const { regular, bold } = await embedCyrillicFonts(pdfDoc);
  const page = pdfDoc.addPage(PAGE_SIZE);
  const contentWidth = PAGE_SIZE[0] - MARGIN * 2;
  let y = PAGE_SIZE[1] - MARGIN;

  const title = type === "certificate" ? "СЕРТИФИКАТ" : "СПРАВКА ОБ ОБУЧЕНИИ";
  page.drawText(title, { x: MARGIN, y, size: 20, font: bold, color: CRIMSON });
  y -= 40;

  const body =
    type === "certificate"
      ? `Настоящий сертификат подтверждает, что ${form.fullName} успешно освоил(а) программу дополнительного профессионального образования «${course.title}» объёмом ${course.hours} ак. ч. в Московском Политехе.`
      : `Дана ${form.fullName} в том, что он(а) проходит обучение по программе дополнительного профессионального образования «${course.title}» объёмом ${course.hours} ак. ч. в Московском Политехе с ${formatIsoDate(course.durationFrom)} по ${formatIsoDate(course.durationTo)}.`;

  const words = body.split(/\s+/);
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (regular.widthOfTextAtSize(candidate, 12) > contentWidth && line) {
      page.drawText(line, { x: MARGIN, y, size: 12, font: regular });
      y -= 18;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    page.drawText(line, { x: MARGIN, y, size: 12, font: regular });
    y -= 18;
  }

  y -= 30;
  page.drawText(`Дата выдачи: ${formatSignedAt(issuedAt)}`, { x: MARGIN, y, size: 11, font: regular });
  y -= 40;
  page.drawText("Московский Политех", { x: MARGIN, y, size: 11, font: bold, color: CRIMSON });

  return pdfDoc.save();
}
