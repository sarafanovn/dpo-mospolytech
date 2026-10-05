import { useRef, useState } from "react";
import { TEMPLATE_PLACEHOLDERS, TEMPLATE_TITLES, type DocumentTemplate, type TemplateType } from "@meridian/shared";
import { api } from "../../api";
import { Loading } from "../../components/Loading";
import { PageHead } from "../../components/PageHead";
import { useToast } from "../../ToastContext";
import { errorMessage, useAsync } from "../../hooks/useAsync";
import { fmtDateTime } from "../../lib/format";

const loadTemplates = () => api.templates.list();
const TYPES = Object.keys(TEMPLATE_TITLES) as TemplateType[];

export function Templates() {
  const { data, loading, error, reload } = useAsync(loadTemplates, "Не удалось загрузить шаблоны");
  const { toast, toastError } = useToast();
  const [type, setType] = useState<TemplateType>("application");
  // Unsaved edits live in `draft`; without one the editor shows the saved template.
  const [draft, setDraft] = useState<{ type: TemplateType; content: string; fileName: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);

  const current: DocumentTemplate | undefined = data?.find((t) => t.type === type);
  const activeDraft = draft?.type === type ? draft : null;
  const content = activeDraft?.content ?? current?.content ?? "";
  const fileName = activeDraft ? activeDraft.fileName : (current?.fileName ?? null);
  const dirty = !!activeDraft && activeDraft.content !== current?.content;

  const setContent = (next: string | ((prev: string) => string), name: string | null = fileName) =>
    setDraft({ type, content: typeof next === "function" ? next(content) : next, fileName: name });

  const switchType = (next: TemplateType) => {
    if (dirty && !confirm("Несохранённые изменения будут потеряны. Продолжить?")) return;
    setDraft(null);
    setType(next);
  };

  const insertPlaceholder = (key: string) => {
    const el = editor.current;
    const token = `{{${key}}}`;
    if (!el) return setContent((c) => c + token);
    const { selectionStart: start, selectionEnd: end } = el;
    setContent((c) => c.slice(0, start) + token + c.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const onFile = async (file: File) => {
    try {
      setContent(await file.text(), file.name);
      toast(`Файл «${file.name}» загружен в редактор. Сохраните шаблон.`);
    } catch {
      toastError("Не удалось прочитать файл");
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      await api.templates.save(type, content, fileName);
      setDraft(null);
      toast("Шаблон сохранён");
      await reload();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось сохранить шаблон"));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!confirm("Вернуть стандартный шаблон? Ваша версия будет удалена.")) return;
    setBusy(true);
    try {
      await api.templates.reset(type);
      setDraft(null);
      toast("Восстановлен стандартный шаблон");
      await reload();
    } catch (err) {
      toastError(errorMessage(err, "Не удалось сбросить шаблон"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        title="Шаблоны документов"
        text="На основе шаблонов формируются заявление, договор, справки и сертификаты. Загрузите текстовый файл или отредактируйте шаблон здесь, подставляя данные через {{поля}}."
      />
      <Loading loading={loading} error={error} onRetry={reload}>
        <div className="segmented" role="tablist">
          {TYPES.map((t) => (
            <button key={t} role="tab" aria-selected={t === type} className={t === type ? "active" : ""} onClick={() => switchType(t)}>
              {TEMPLATE_TITLES[t]}
            </button>
          ))}
        </div>

        <div className="template-layout">
          <section className="card">
            <div className="card-title-row">
              <h2>{TEMPLATE_TITLES[type]}</h2>
              <span className="status status-gray">
                {current?.isDefault ? "Стандартный шаблон" : `Изменён ${fmtDateTime(current?.updatedAt)}${current?.fileName ? ` · ${current.fileName}` : ""}`}
              </span>
            </div>
            <textarea
              ref={editor}
              className="template-editor"
              value={content}
              spellCheck={false}
              onChange={(e) => setContent(e.target.value)}
              aria-label="Текст шаблона"
            />
            <p className="field-hint">
              «# Заголовок» — крупный заголовок, «## Раздел» — подзаголовок, пустая строка — отступ.
              {type === "application" && " Подпись обучающегося добавляется в конец документа автоматически."}
              {type === "contract" && " Подписи заказчика и исполнителя добавляются в конец договора автоматически."}
            </p>
            <div className="actions">
              <button className="btn btn-red" onClick={save} disabled={busy || !dirty || content.trim().length < 10}>
                {busy ? "Сохраняем…" : "Сохранить шаблон"}
              </button>
              <label className="btn btn-light upload-inline">
                Загрузить из файла
                <input
                  type="file"
                  accept=".txt,.md,text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void onFile(file);
                  }}
                />
              </label>
              <a
                className={`btn btn-light${dirty ? " is-disabled" : ""}`}
                href={api.templates.previewUrl(type)}
                target="_blank"
                rel="noreferrer"
                aria-disabled={dirty}
                title={dirty ? "Сначала сохраните шаблон" : undefined}
                style={dirty ? { opacity: 0.45, pointerEvents: "none" } : undefined}
              >
                Предпросмотр PDF
              </a>
              {!current?.isDefault && (
                <button className="btn btn-danger" onClick={reset} disabled={busy}>
                  Вернуть стандартный
                </button>
              )}
            </div>
          </section>

          <aside className="card">
            <h3 style={{ marginBottom: "0.5rem" }}>Поля шаблона</h3>
            <p className="field-hint" style={{ marginTop: 0 }}>
              Нажмите на поле, чтобы вставить его в текст.
            </p>
            <div className="placeholder-list">
              {TEMPLATE_PLACEHOLDERS.map((p) => (
                <button key={p.key} type="button" className="placeholder-chip" title={`{{${p.key}}}`} onClick={() => insertPlaceholder(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </Loading>
    </>
  );
}
