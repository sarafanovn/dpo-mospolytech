import type {
  Application,
  ApplicationForm,
  Certificate,
  CertificateType,
  Course,
  Enrollment,
  User,
} from "@meridian/shared";

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
    throw new Error(body.error ?? "Ошибка запроса");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  register: (data: { email: string; password: string; fullName: string; role: "student" | "admin" }) =>
    request<User>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<User>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),

  courses: {
    list: () => request<Course[]>("/courses"),
    create: (data: Omit<Course, "id" | "createdAt">) =>
      request<Course>("/courses", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Omit<Course, "id" | "createdAt">>) =>
      request<Course>(`/courses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: number) => request<void>(`/courses/${id}`, { method: "DELETE" }),
  },

  enrollments: {
    list: () => request<Enrollment[]>("/enrollments"),
    get: (id: number) => request<Enrollment>(`/enrollments/${id}`),
    create: (courseId: number) =>
      request<Enrollment>("/enrollments", { method: "POST", body: JSON.stringify({ courseId }) }),
    update: (
      id: number,
      data: Partial<{
        status: Enrollment["status"];
        contractNumber: string;
        intermediateAttestation: string;
        finalAttestation: string;
      }>
    ) => request<Enrollment>(`/enrollments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  applications: {
    get: (enrollmentId: number) => request<Application>(`/applications/${enrollmentId}`),
    save: (enrollmentId: number, form: ApplicationForm) =>
      request<Application>(`/applications/${enrollmentId}`, { method: "PUT", body: JSON.stringify(form) }),
    sign: (enrollmentId: number) =>
      request<Application>(`/applications/${enrollmentId}/sign`, { method: "POST" }),
    signExecutor: (enrollmentId: number) =>
      request<Application>(`/applications/${enrollmentId}/sign-executor`, { method: "POST" }),
    documentUrl: (enrollmentId: number, type: "application" | "contract" | "personal-data") =>
      `/api/applications/${enrollmentId}/documents/${type}`,
  },

  certificates: {
    listForEnrollment: (enrollmentId: number) =>
      request<Certificate[]>(`/certificates/enrollment/${enrollmentId}`),
    create: (enrollmentId: number, type: CertificateType) =>
      request<Certificate>("/certificates", { method: "POST", body: JSON.stringify({ enrollmentId, type }) }),
    downloadUrl: (id: number) => `/api/certificates/${id}/download`,
  },
};
