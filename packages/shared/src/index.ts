export type Role = "student" | "admin";

// Course dates are stored as YYYY-MM-DD (native <input type="date"> format).
export function formatCourseDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}.${month}.${year}`;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}

export interface Course {
  id: number;
  title: string;
  hours: number;
  durationFrom: string;
  durationTo: string;
  description: string;
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
  intermediateAttestation: string | null;
  finalAttestation: string | null;
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
}

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
  issuedAt: string;
}

export const APPLICATION_FIELD_GROUPS: {
  title: string;
  fields: { key: keyof ApplicationForm; label: string; hint: string; type: "text" | "tel" | "email" | "textarea" | "select"; options?: string[] }[];
}[] = [
  {
    title: "Личные данные",
    fields: [
      { key: "fullName", label: "Ф. И. О. (полностью)", hint: "Иванов Иван Иванович", type: "text" },
      { key: "phone", label: "Телефон", hint: "+7 (___) ___-__-__", type: "tel" },
      { key: "email", label: "e-mail", hint: "iv@an.ru", type: "email" },
      { key: "birthDate", label: "Дата рождения", hint: "дд.мм.гггг", type: "text" },
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
