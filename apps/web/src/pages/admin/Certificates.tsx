import { useEffect, useState } from "react";
import type { Certificate, CertificateType, Course, Enrollment } from "@meridian/shared";
import { api } from "../../api";
import { StatusBadge } from "../../components/StatusBadge";
import "./admin.css";

export function AdminCertificates() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [certificatesByEnrollment, setCertificatesByEnrollment] = useState<Record<number, Certificate[]>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    const [e, c] = await Promise.all([api.enrollments.list(), api.courses.list()]);
    const eligible = e.filter((en) => en.status === "approved" || en.status === "completed");
    setEnrollments(eligible);
    setCourses(c);
    const entries = await Promise.all(
      eligible.map(async (en) => [en.id, await api.certificates.listForEnrollment(en.id)] as const)
    );
    setCertificatesByEnrollment(Object.fromEntries(entries));
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleIssue = async (enrollmentId: number, type: CertificateType) => {
    setBusyId(enrollmentId);
    try {
      await api.certificates.create(enrollmentId, type);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="page-loading">Загрузка…</div>;

  return (
    <div>
      <div className="eyebrow">Администрирование</div>
      <h1 style={{ fontSize: 28, marginTop: 8, marginBottom: 28 }}>Справки и сертификаты</h1>

      <div className="list-stack">
        {enrollments.map((enrollment) => {
          const course = courses.find((c) => c.id === enrollment.courseId);
          const certs = certificatesByEnrollment[enrollment.id] ?? [];
          return (
            <div key={enrollment.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{course?.title}</div>
                  <div style={{ fontSize: 13, color: "var(--gray-500)" }}>Заявка №{enrollment.id}</div>
                </div>
                <StatusBadge status={enrollment.status} />
              </div>
              <div className="inline-actions" style={{ marginBottom: certs.length ? 16 : 0 }}>
                <button className="btn btn-secondary" disabled={busyId === enrollment.id} onClick={() => handleIssue(enrollment.id, "reference")}>
                  Сформировать справку
                </button>
                <button className="btn btn-primary" disabled={busyId === enrollment.id} onClick={() => handleIssue(enrollment.id, "certificate")}>
                  Сформировать сертификат
                </button>
              </div>
              {certs.length > 0 && (
                <div className="inline-actions">
                  {certs.map((cert) => (
                    <a
                      key={cert.id}
                      className="btn btn-ghost"
                      href={api.certificates.downloadUrl(cert.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {cert.type === "certificate" ? "Сертификат" : "Справка"} от{" "}
                      {new Date(cert.issuedAt).toLocaleDateString("ru-RU")}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {enrollments.length === 0 && (
          <p style={{ color: "var(--gray-500)" }}>Нет зачисленных или завершивших обучение студентов.</p>
        )}
      </div>
    </div>
  );
}
