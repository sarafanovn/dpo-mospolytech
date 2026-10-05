export type Role = "student" | "admin";

// Dates entered via native <input type="date"> are stored as YYYY-MM-DD; format for display.
export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

export const BRANCHES = [
  "Московский Политех (главный кампус)",
  "Рязанский институт (филиал)",
  "Чебоксарский институт (филиал)",
  "Коломенский институт (филиал)",
  "Электростальский институт (филиал)",
  "Тучковский филиал",
  "Ивантеевский филиал",
];

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  birthDate: string | null;
  branch: string | null;
  role: Role;
  createdAt: string;
}

export const STUDY_FORMS = ["очная", "очно-заочная", "заочная", "дистанционная"] as const;
export type StudyForm = (typeof STUDY_FORMS)[number];

export interface Course {
  id: number;
  title: string;
  hours: number;
  durationFrom: string;
  durationTo: string;
  description: string;
  studyForm: StudyForm;
  /** Link to the course in the SDO (distance learning system). Empty when not set. */
  sdoUrl: string;
  createdAt: string;
}

export type EnrollmentStatus =
  | "draft"
  | "submitted"
  | "signed"
  | "contract_registered"
  | "approved"
  | "completed";

export interface Enrollment {
  id: number;
  userId: number;
  courseId: number;
  status: EnrollmentStatus;
  contractNumber: string | null;
  gradePractice: string | null;
  gradeIntermediate: string | null;
  gradeFinal: string | null;
  createdAt: string;
}

export interface ApplicationForm {
  fullName: string;
  phone: string;
  email: string;
  birthDate: string;
  passport: string;
  passportIssuedBy: string;
  addressRegistration: string;
  addressResidence: string;
  education: string;
  snils: string;
  inn: string;
  educationLevel: string;
  workerCategory: string;
  positionCategory: string;
  industry: string;
  workExperience: string;
  branch: string;
}

export const EMPTY_APPLICATION_FORM: ApplicationForm = {
  fullName: "",
  phone: "",
  email: "",
  birthDate: "",
  passport: "",
  passportIssuedBy: "",
  addressRegistration: "",
  addressResidence: "",
  education: "",
  snils: "",
  inn: "",
  educationLevel: "",
  workerCategory: "",
  positionCategory: "",
  industry: "",
  workExperience: "",
  branch: "",
};

export interface Application {
  id: number;
  enrollmentId: number;
  form: ApplicationForm;
  signedAt: string | null;
  signedByExecutorAt: string | null;
  createdAt: string;
}

export type CertificateType = "reference" | "certificate";

export interface Certificate {
  id: number;
  enrollmentId: number;
  type: CertificateType;
  number: string;
  issuedAt: string;
}

export type DocumentKind = "passport" | "inn" | "education" | "other";

export const REQUIRED_DOCUMENT_KINDS: { kind: Exclude<DocumentKind, "other">; label: string }[] = [
  { kind: "passport", label: "Паспорт" },
  { kind: "inn", label: "ИНН" },
  { kind: "education", label: "Документ об образовании" },
];

export interface EnrollmentDocument {
  id: number;
  enrollmentId: number;
  kind: DocumentKind;
  fileName: string;
  mime: string;
  size: number;
  uploadedAt: string;
}

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

/** Enrollment together with everything the UI needs to render it, so pages make a single request. */
export interface EnrollmentDetail extends Enrollment {
  course: Course;
  student: { fullName: string; email: string; phone: string | null; branch: string | null };
  application: Application | null;
  documents: EnrollmentDocument[];
  certificates: Certificate[];
}

export interface BatchResult {
  updated: number[];
  skipped: { id: number; reason: string }[];
}

export type TemplateType = "application" | "contract" | "certificate" | "reference";

export const TEMPLATE_TITLES: Record<TemplateType, string> = {
  application: "Заявление",
  contract: "Договор",
  certificate: "Сертификат",
  reference: "Справка об обучении",
};

export interface DocumentTemplate {
  type: TemplateType;
  content: string;
  fileName: string | null;
  updatedAt: string | null;
  isDefault: boolean;
}

export const TEMPLATE_PLACEHOLDERS: { key: string; label: string }[] = [
  { key: "fullName", label: "Ф. И. О." },
  { key: "birthDate", label: "Дата рождения" },
  { key: "phone", label: "Телефон" },
  { key: "email", label: "E-mail" },
  { key: "branch", label: "Филиал" },
  { key: "passport", label: "Паспорт" },
  { key: "passportIssuedBy", label: "Кем выдан" },
  { key: "addressRegistration", label: "Адрес регистрации" },
  { key: "addressResidence", label: "Адрес проживания" },
  { key: "snils", label: "СНИЛС" },
  { key: "inn", label: "ИНН" },
  { key: "education", label: "Сведения об образовании" },
  { key: "educationLevel", label: "Уровень образования" },
  { key: "workExperience", label: "Стаж работы" },
  { key: "workerCategory", label: "Категория работников" },
  { key: "positionCategory", label: "Категория должности" },
  { key: "industry", label: "Отрасль экономики" },
  { key: "courseTitle", label: "Название программы" },
  { key: "courseHours", label: "Объём, ак. ч." },
  { key: "studyForm", label: "Форма обучения" },
  { key: "dateFrom", label: "Начало обучения" },
  { key: "dateTo", label: "Окончание обучения" },
  { key: "contractNumber", label: "Номер договора" },
  { key: "documentNumber", label: "Номер справки / сертификата" },
  { key: "signDate", label: "Дата подписания" },
  { key: "today", label: "Дата формирования" },
];

export const APPLICATION_FIELD_GROUPS: {
  title: string;
  fields: { key: keyof ApplicationForm; label: string; hint: string; type: "text" | "tel" | "email" | "date" | "textarea" | "select"; options?: string[] }[];
}[] = [
  {
    title: "Личные данные",
    fields: [
      { key: "fullName", label: "Ф. И. О. (полностью)", hint: "Иванов Иван Иванович", type: "text" },
      { key: "phone", label: "Телефон", hint: "+7 (___) ___-__-__", type: "tel" },
      { key: "email", label: "e-mail", hint: "iv@an.ru", type: "email" },
      { key: "birthDate", label: "Дата рождения", hint: "", type: "date" },
      { key: "branch", label: "Филиал", hint: "", type: "select", options: BRANCHES },
    ],
  },
  {
    title: "Документы",
    fields: [
      { key: "passport", label: "Паспорт", hint: "(номер, серия)", type: "text" },
      { key: "passportIssuedBy", label: "Выдан", hint: "(кем выдан, дата выдачи, код подразделения)", type: "text" },
      { key: "snils", label: "СНИЛС", hint: "000-000-000 00", type: "text" },
      { key: "inn", label: "ИНН", hint: "12 цифр", type: "text" },
    ],
  },
  {
    title: "Адреса",
    fields: [
      { key: "addressRegistration", label: "Адрес регистрации", hint: "", type: "textarea" },
      { key: "addressResidence", label: "Адрес проживания", hint: "", type: "textarea" },
    ],
  },
  {
    title: "Образование и занятость",
    fields: [
      { key: "education", label: "Сведения об образовании", hint: "что окончил и когда, специальность, квалификация", type: "textarea" },
      { key: "workExperience", label: "Стаж работы", hint: "укажите стаж работы", type: "text" },
      {
        key: "educationLevel",
        label: "Ваш уровень образования",
        hint: "",
        type: "select",
        options: ["Высшее образование", "Среднее профессиональное образование", "Нет"],
      },
      {
        key: "workerCategory",
        label: "К какой категории работников вы относитесь",
        hint: "",
        type: "select",
        options: [
          "работники предприятий и организаций",
          "работники",
          "дошкольных образовательных организаций",
          "работники общеобразовательных организаций",
          "работники профессиональных образовательных организаций",
          "работники образовательных организаций высшего образования",
          "работники организаций дополнительного профессионального образования",
          "работники организаций дополнительного образования",
          "лица, замещающие государственные должности и должности государственной гражданской службы",
          "лица, замещающие муниципальные должности и должности муниципальной службы",
          "лица, уволенные с военной службы",
          "незанятые лица по направлению службы занятости",
          "безработные",
          "студенты, обучающиеся по образовательным программам среднего профессионального образования",
          "студенты, обучающиеся по образовательным программам высшего образования",
          "другие",
        ],
      },
      {
        key: "positionCategory",
        label: "К какой категории относится ваша должность",
        hint: "",
        type: "select",
        options: ["руководители", "специалисты", "педагогические работники", "технический персонал", "нет"],
      },
      {
        key: "industry",
        label: "Отрасль экономики, в которой вы работаете",
        hint: "",
        type: "select",
        options: [
          "сельское, лесное хозяйство, охота, рыболовство и рыбоводство",
          "добыча полезных ископаемых",
          "обрабатывающие производства",
          "обеспечение электрической энергией, газом и паром; кондиционирование воздуха",
          "водоснабжение, водоотведение, организация сбора и утилизации отходов, деятельность по ликвидации загрязнений",
          "строительство",
          "торговля оптовая и розничная; ремонт автотранспортных средств и мотоциклов",
          "транспортировка и хранение",
          "деятельность гостиниц и предприятий общественного питания",
          "деятельность в области информации и связи",
          "деятельность финансовая и страховая",
          "деятельность по операциям с недвижимым имуществом",
          "деятельность профессиональная, научная и техническая",
          "деятельность административная и сопутствующие дополнительные услуги",
          "государственное управление и обеспечение военной безопасности; социальное обеспечение",
          "образование",
          "деятельность в области здравоохранения и социальных услуг",
          "деятельность в области культуры, спорта, организации досуга и развлечений",
          "предоставление прочих видов услуг",
          "деятельность домашних хозяйств как работодателей; недифференцированная деятельность частных домашних хозяйств",
          "деятельность экстерриториальных организаций и органов",
          "не занят",
        ],
      },
    ],
  },
];
