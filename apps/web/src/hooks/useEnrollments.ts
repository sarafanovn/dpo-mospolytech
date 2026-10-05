import { api } from "../api";
import { useAsync } from "./useAsync";

const load = () => api.enrollments.list();

/** Enrollments with course, application, documents and certificates (own for students, all for admins). */
export function useEnrollments() {
  return useAsync(load, "Не удалось загрузить записи");
}
