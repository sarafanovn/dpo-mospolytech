import type {
  Application,
  ApplicationForm,
  BatchResult,
  CertificateType,
  Course,
  DocumentKind,
  DocumentTemplate,
  Enrollment,
  EnrollmentDetail,
  EnrollmentDocument,
  EnrollmentStatus,
  TemplateType,
  User,
} from "@meridian/shared";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? "Ошибка запроса");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export type CourseInput = Omit<Course, "id" | "createdAt">;
export type ProfileInput = { fullName: string; phone: string; birthDate: string; branch: string };
export type GradeInput = { id: number; gradePractice: string; gradeIntermediate: string; gradeFinal: string };

export const api = {
  register: (data: { email: string; password: string; fullName: string }) =>
    request<User>("/auth/register", json("POST", data)),
  login: (data: { email: string; password: string }) => request<User>("/auth/login", json("POST", data)),
  logout: () => request<void>("/auth/logout", json("POST")),
  me: () => request<User>("/auth/me"),
  updateProfile: (data: ProfileInput) => request<User>("/auth/me", json("PATCH", data)),

  courses: {
    list: () => request<Course[]>("/courses"),
    create: (data: CourseInput) => request<Course>("/courses", json("POST", data)),
    update: (id: number, data: Partial<CourseInput>) => request<Course>(`/courses/${id}`, json("PATCH", data)),
    remove: (id: number) => request<void>(`/courses/${id}`, json("DELETE")),
  },

  enrollments: {
    list: () => request<EnrollmentDetail[]>("/enrollments"),
    get: (id: number) => request<EnrollmentDetail>(`/enrollments/${id}`),
    create: (courseId: number) => request<EnrollmentDetail>("/enrollments", json("POST", { courseId })),
    withdraw: (id: number) => request<void>(`/enrollments/${id}`, json("DELETE")),
    setStatus: (id: number, status: EnrollmentStatus) =>
      request<Enrollment>(`/enrollments/${id}`, json("PATCH", { status })),
    registerContracts: (enrollmentIds: number[]) =>
      request<BatchResult>("/enrollments/contracts/register", json("POST", { enrollmentIds })),
    signContracts: (enrollmentIds: number[]) =>
      request<BatchResult>("/enrollments/contracts/sign", json("POST", { enrollmentIds })),
    unsignContracts: (enrollmentIds: number[]) =>
      request<BatchResult>("/enrollments/contracts/unsign", json("POST", { enrollmentIds })),
    saveGrades: (grades: GradeInput[]) => request<void>("/enrollments/grades", json("PUT", { grades })),
  },

  applications: {
    save: (enrollmentId: number, form: ApplicationForm) =>
      request<Application>(`/applications/${enrollmentId}`, json("PUT", form)),
    sign: (enrollmentId: number) => request<Application>(`/applications/${enrollmentId}/sign`, json("POST")),
    documentUrl: (enrollmentId: number, type: "application" | "contract" | "personal-data") =>
      `/api/applications/${enrollmentId}/documents/${type}`,
  },

  documents: {
    upload: async (enrollmentId: number, kind: DocumentKind, file: File): Promise<EnrollmentDocument> => {
      const query = new URLSearchParams({ kind, fileName: file.name });
      const res = await fetch(`/api/documents/enrollment/${enrollmentId}?${query}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new ApiError(res.status, body.error ?? "Не удалось загрузить файл");
      }
      return res.json();
    },
    remove: (id: number) => request<void>(`/documents/${id}`, json("DELETE")),
    url: (id: number) => `/api/documents/${id}/download`,
  },

  certificates: {
    issue: (enrollmentIds: number[], type: CertificateType) =>
      request<BatchResult>("/certificates/batch", json("POST", { enrollmentIds, type })),
    remove: (id: number) => request<void>(`/certificates/${id}`, json("DELETE")),
    url: (id: number) => `/api/certificates/${id}/download`,
  },

  templates: {
    list: () => request<DocumentTemplate[]>("/templates"),
    save: (type: TemplateType, content: string, fileName: string | null) =>
      request<DocumentTemplate>(`/templates/${type}`, json("PUT", { content, fileName })),
    reset: (type: TemplateType) => request<DocumentTemplate>(`/templates/${type}`, json("DELETE")),
    previewUrl: (type: TemplateType) => `/api/templates/${type}/preview`,
  },
};
