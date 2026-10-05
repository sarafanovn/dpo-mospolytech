import { api } from "../../api";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { useEnrollments } from "../../hooks/useEnrollments";
import { fmtDate } from "../../lib/format";

export function MyCertificates() {
  const { data, loading, error, reload } = useEnrollments();
  const items = data?.flatMap((e) => e.certificates.map((c) => ({ cert: c, enrollment: e }))) ?? [];

  return (
    <>
      <PageHead title="Сертификаты ДПО" text="Справки об обучении и сертификаты, которые администратор сформировал по результатам вашего обучения." />
      <Loading loading={loading} error={error} onRetry={reload}>
        {items.length === 0 ? (
          <div className="card">
            <div className="empty">Справки и сертификаты появятся здесь после того, как администратор их сформирует.</div>
          </div>
        ) : (
          <div className="grid-2">
            {items.map(({ cert, enrollment }) => (
              <article className="certificate" key={cert.id}>
                <div className="eyebrow">Московский Политех</div>
                <h2>{cert.type === "certificate" ? "Сертификат" : "Справка об обучении"}</h2>
                <div className="cert-name">{enrollment.application?.form.fullName || enrollment.student.fullName}</div>
                <p>{cert.type === "certificate" ? "успешно освоил(а) программу" : "проходит обучение по программе"}</p>
                <div className="cert-course">{enrollment.course.title}</div>
                <p>
                  {enrollment.course.hours} часов · № {cert.number} · {fmtDate(cert.issuedAt)}
                </p>
                <a className="btn btn-primary" href={api.certificates.url(cert.id)} target="_blank" rel="noreferrer">
                  Открыть PDF
                </a>
              </article>
            ))}
          </div>
        )}
      </Loading>
    </>
  );
}
