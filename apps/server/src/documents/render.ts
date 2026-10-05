import type { Certificate, EnrollmentDetail, TemplateType } from "@meridian/shared";
import { EMPTY_FORM } from "../serialize.js";
import { renderTemplatePdf, type PdfStamp } from "./templatePdf.js";
import { buildValues, getTemplateContent } from "./values.js";

export function renderApplication(detail: EnrollmentDetail): Promise<Uint8Array> {
  const app = detail.application;
  const form = app?.form ?? EMPTY_FORM;
  const stamps: PdfStamp[] = [
    { title: "Обучающийся", name: form.fullName, signedAt: app?.signedAt ?? null, side: "left" },
  ];
  return renderTemplatePdf(
    getTemplateContent("application"),
    buildValues(form, detail.course, { signedAt: app?.signedAt }),
    stamps,
    `application|${detail.id}|${form.fullName}`
  );
}

export function renderContract(detail: EnrollmentDetail): Promise<Uint8Array> {
  const app = detail.application;
  const form = app?.form ?? EMPTY_FORM;
  const stamps: PdfStamp[] = [
    { title: `Заказчик: ${form.fullName}`, name: form.fullName, signedAt: app?.signedAt ?? null, side: "left" },
    {
      title: "Исполнитель: Московский Политех",
      name: "Московский Политех",
      signedAt: app?.signedByExecutorAt ?? null,
      side: "right",
    },
  ];
  return renderTemplatePdf(
    getTemplateContent("contract"),
    buildValues(form, detail.course, { contractNumber: detail.contractNumber, signedAt: app?.signedAt }),
    stamps,
    `contract|${detail.id}|${detail.contractNumber ?? ""}`
  );
}

export function renderCertificate(detail: EnrollmentDetail, cert: Certificate): Promise<Uint8Array> {
  const form = { ...EMPTY_FORM, ...(detail.application?.form ?? {}), fullName: detail.application?.form.fullName || detail.student.fullName };
  const type: TemplateType = cert.type;
  return renderTemplatePdf(
    getTemplateContent(type),
    buildValues(form, detail.course, { documentNumber: cert.number, issuedAt: cert.issuedAt }),
    [],
    `${type}|${cert.id}`
  );
}
