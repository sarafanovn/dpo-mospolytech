import ExcelJS from "exceljs";
import type { ApplicationForm } from "@meridian/shared";

export async function generatePersonalDataXlsx(form: ApplicationForm): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Персональные данные");
  sheet.columns = [
    { header: "Поле", key: "field", width: 32 },
    { header: "Значение", key: "value", width: 60 },
  ];
  sheet.getRow(1).font = { bold: true };

  const rows: [string, string][] = [
    ["Ф. И. О.", form.fullName],
    ["Телефон", form.phone],
    ["E-mail", form.email],
    ["Дата рождения", form.birthDate],
    ["Паспорт", form.passport],
    ["Выдан", form.passportIssuedBy],
    ["Адрес регистрации", form.addressRegistration],
    ["Адрес проживания", form.addressResidence],
    ["Сведения об образовании", form.education],
    ["СНИЛС", form.snils],
    ["ИНН", form.inn],
    ["Уровень образования", form.educationLevel],
    ["Категория работников", form.workerCategory],
    ["Категория должности", form.positionCategory],
    ["Отрасль экономики", form.industry],
  ];
  for (const [field, value] of rows) {
    sheet.addRow({ field, value });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
