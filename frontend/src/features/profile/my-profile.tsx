"use client";

import { PhotoControl } from "@/components/photo-control";
import { validateForm, type FieldErrors } from "@/lib/forms/validation";
import { enumLabel, publicationStatusLabels } from "@/lib/profiles";
import { useEffect, useMemo, useState, type FormEvent } from "react";

export type Profile = {
  id: number;
  organizational_unit_id: number;
  slug: string;
  full_name: string;
  photo_url: string | null;
  email: string | null;
  orcid_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  google_scholar_url: string | null;
  main_function: MainFunction;
  category: string;
  position: string | null;
  area_of_activity: string | null;
  publication_status: string;
};
export type Unit = { id: number; name: string; code: string };
type MainFunction = "DOCENTE" | "INVESTIGADOR" | "FUNCIONARIO_ADMINISTRATIVO";
export type Values = Record<string, string>;
type RecordItem = Record<string, string | number | null> & { id: number };
type Field = {
  name: string;
  label: string;
  kind?: "url" | "number" | "select";
  optional?: boolean;
  options?: { value: string; label: string }[];
};

export function FieldMessage({ name, errors }: { name: string; errors: FieldErrors }) {
  return errors[name] ? (
    <span className="field-error" id={`${name}-error`}>
      {errors[name]}
    </span>
  ) : null;
}

export function ValidationSummary({ errors }: { errors: FieldErrors }) {
  const count = Object.values(errors).filter(Boolean).length;
  return count ? (
    <p className="validation-summary" role="alert">
      Há {count} campo{count === 1 ? "" : "s"} a corrigir. Veja as mensagens junto aos campos
      assinalados.
    </p>
  ) : null;
}

const categories: Record<MainFunction, { value: string; label: string }[]> = {
  DOCENTE: [
    { value: "ASSISTENTE_ESTAGIARIO", label: "Assistente Estagiário" },
    { value: "ASSISTENTE", label: "Assistente" },
    { value: "PROFESSOR_AUXILIAR", label: "Professor Auxiliar" },
    { value: "PROFESSOR_ASSOCIADO", label: "Professor Associado" },
    { value: "PROFESSOR_CATEDRATICO", label: "Professor Catedrático" },
  ],
  INVESTIGADOR: [
    { value: "ESTAGIARIO_INVESTIGACAO", label: "Estagiário de Investigação" },
    { value: "ASSISTENTE_INVESTIGACAO", label: "Assistente de Investigação" },
    { value: "INVESTIGADOR_AUXILIAR", label: "Investigador Auxiliar" },
    { value: "INVESTIGADOR_PRINCIPAL", label: "Investigador Principal" },
  ],
  FUNCIONARIO_ADMINISTRATIVO: [
    { value: "TECNICO_SUPERIOR", label: "Técnico Superior" },
    { value: "TECNICO_MEDIO", label: "Técnico Médio" },
    { value: "TECNICO_BASE", label: "Técnico de Base" },
  ],
};
const positions = [
  ["DIRECTOR", "Director"],
  ["DIRECTOR_ADJUNTO", "Director Adjunto"],
  ["CHEFE_DEPARTAMENTO", "Chefe de Departamento"],
  ["CHEFE_SECCAO", "Chefe de Secção"],
  ["CHEFE_CENTRO", "Chefe do Centro"],
  ["DOCENTE", "Docente"],
  ["TECNICO", "Técnico"],
].map(([value, label]) => ({ value, label }));

const resourceConfig: Record<string, { title: string; path: string; fields: Field[] }> = {
  education: {
    title: "Formação académica",
    path: "education",
    fields: [
      { name: "title_obtained", label: "Título obtido" },
      { name: "course", label: "Curso" },
      { name: "institution", label: "Instituição" },
      { name: "country", label: "País", optional: true },
      { name: "completion_year", label: "Ano de conclusão", kind: "number", optional: true },
    ],
  },
  research: {
    title: "Linhas de investigação",
    path: "research-lines",
    fields: [
      { name: "title", label: "Título" },
      { name: "description", label: "Descrição", optional: true },
    ],
  },
  publications: {
    title: "Publicações",
    path: "publications",
    fields: [
      { name: "title", label: "Título" },
      {
        name: "type",
        label: "Tipo",
        kind: "select",
        options: [
          { value: "BOOK", label: "Livro" },
          { value: "ARTICLE", label: "Artigo" },
          { value: "OTHER", label: "Outro" },
        ],
      },
      { name: "description", label: "Descrição", optional: true },
      { name: "link", label: "Link", kind: "url", optional: true },
      { name: "citation", label: "Citação", optional: true },
      { name: "publication_year", label: "Ano de publicação", kind: "number", optional: true },
    ],
  },
};

export const emptyProfile: Values = {
  slug: "",
  full_name: "",
  email: "",
  orcid_url: "",
  linkedin_url: "",
  github_url: "",
  google_scholar_url: "",
  main_function: "DOCENTE",
  category: "ASSISTENTE_ESTAGIARIO",
  position: "",
  area_of_activity: "",
};

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/backend/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const detail = error?.detail;
    throw new Error(typeof detail === "string" ? detail : "Não foi possível concluir a operação.");
  }
  return response.status === 204 ? null : response.json();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProfileFields({
  values,
  setValues,
  isNew,
  units,
  unitId,
  setUnitId,
  slugTouched,
  setSlugTouched,
  errors,
  clearError,
}: {
  values: Values;
  setValues: (value: Values) => void;
  isNew: boolean;
  units: Unit[];
  unitId: string;
  setUnitId: (value: string) => void;
  slugTouched: boolean;
  setSlugTouched: (value: boolean) => void;
  errors: FieldErrors;
  clearError: (name: string) => void;
}) {
  const fn = (values.main_function || "DOCENTE") as MainFunction;
  const set = (name: string, value: string) => setValues({ ...values, [name]: value });
  const onName = (value: string) => {
    const next: Values = { ...values, full_name: value };
    if (isNew && !slugTouched) next.slug = slugify(value);
    setValues(next);
  };
  return (
    <>
      {isNew && (
        <label className="field">
          Unidade Orgânica
          <select
            name="organizational_unit_id"
            required
            aria-invalid={Boolean(errors.organizational_unit_id)}
            aria-describedby={
              errors.organizational_unit_id ? "organizational_unit_id-error" : undefined
            }
            value={unitId}
            onChange={(event) => {
              setUnitId(event.target.value);
              clearError("organizational_unit_id");
            }}
          >
            <option value="">Selecione a unidade</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name} ({unit.code})
              </option>
            ))}
          </select>
          <FieldMessage name="organizational_unit_id" errors={errors} />
        </label>
      )}
      <div className="form-grid">
        <label className="field">
          Nome completo
          <input
            name="full_name"
            required
            minLength={2}
            maxLength={200}
            aria-invalid={Boolean(errors.full_name)}
            aria-describedby={errors.full_name ? "full_name-error" : undefined}
            value={values.full_name ?? ""}
            onChange={(event) => {
              onName(event.target.value);
              clearError("full_name");
              if (isNew && !slugTouched) clearError("slug");
            }}
          />
          <FieldMessage name="full_name" errors={errors} />
        </label>
        <label className="field">
          Identificador público
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            minLength={2}
            maxLength={180}
            aria-invalid={Boolean(errors.slug)}
            aria-describedby={errors.slug ? "slug-error" : undefined}
            value={values.slug ?? ""}
            onChange={(event) => {
              setSlugTouched(true);
              set("slug", event.target.value);
              clearError("slug");
            }}
          />
          <small>Usado no endereço público do perfil.</small>
          <FieldMessage name="slug" errors={errors} />
        </label>
        <label className="field">
          Função principal
          <select
            name="main_function"
            value={fn}
            onChange={(event) => {
              const nextFunction = event.target.value as MainFunction;
              setValues({
                ...values,
                main_function: nextFunction,
                category: categories[nextFunction][0].value,
              });
            }}
          >
            <option value="DOCENTE">Docente</option>
            <option value="INVESTIGADOR">Investigador</option>
            <option value="FUNCIONARIO_ADMINISTRATIVO">Funcionário Administrativo</option>
          </select>
        </label>
        <label className="field">
          Categoria
          <select
            name="category"
            value={values.category ?? ""}
            onChange={(event) => set("category", event.target.value)}
          >
            {categories[fn].map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Cargo
          <select
            name="position"
            value={values.position ?? ""}
            onChange={(event) => set("position", event.target.value)}
          >
            <option value="">Sem cargo</option>
            {positions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Email público
          <input
            name="email"
            type="email"
            maxLength={320}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            value={values.email ?? ""}
            onChange={(event) => {
              set("email", event.target.value);
              clearError("email");
            }}
          />
          <FieldMessage name="email" errors={errors} />
        </label>
        {(
          [
            ["orcid_url", "ORCID (URL)"],
            ["linkedin_url", "LinkedIn (URL)"],
            ["github_url", "GitHub (URL)"],
            ["google_scholar_url", "Google Scholar (URL)"],
          ] as const
        ).map(([name, label]) => (
          <label className="field" key={name}>
            {label}
            <input
              name={name}
              type="url"
              aria-invalid={Boolean(errors[name])}
              aria-describedby={errors[name] ? `${name}-error` : undefined}
              value={values[name] ?? ""}
              onChange={(event) => {
                set(name, event.target.value);
                clearError(name);
              }}
            />
            <FieldMessage name={name} errors={errors} />
          </label>
        ))}
        <label className="field form-wide">
          Área de atuação
          <textarea
            name="area_of_activity"
            rows={3}
            value={values.area_of_activity ?? ""}
            onChange={(event) => set("area_of_activity", event.target.value)}
          />
        </label>
      </div>
    </>
  );
}

function CollectionPanel({
  profileId,
  resource,
}: {
  profileId: number;
  resource: keyof typeof resourceConfig;
}) {
  const config = resourceConfig[resource];
  const blank = useMemo(
    () =>
      Object.fromEntries(
        config.fields.map((field) => [
          field.name,
          field.kind === "select" ? (field.options?.[0]?.value ?? "") : "",
        ]),
      ),
    [config],
  );
  const [items, setItems] = useState<RecordItem[]>([]);
  const [values, setValues] = useState<Values>(blank);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const path = `/profiles/${profileId}/${config.path}`;

  async function reload() {
    setItems(await api(path));
  }
  useEffect(() => {
    let active = true;
    api(path)
      .then((result) => {
        if (active) setItems(result);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [path]);

  function startEdit(item: RecordItem) {
    setEditingId(item.id);
    setValues(
      Object.fromEntries(
        config.fields.map((field) => [
          field.name,
          item[field.name] == null ? "" : String(item[field.name]),
        ]),
      ),
    );
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const invalidFields = validateForm(event.currentTarget);
    setFieldErrors(invalidFields);
    if (Object.keys(invalidFields).length) return;
    setBusy(true);
    const payload: Record<string, string | number | null> = {};
    for (const field of config.fields) {
      const value = (values[field.name] ?? "").trim();
      payload[field.name] =
        !value && field.optional ? null : field.kind === "number" ? Number(value) : value;
    }
    try {
      await api(editingId ? `${path}/${editingId}` : path, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      await reload();
      setValues(blank);
      setEditingId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao guardar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Eliminar este registo?")) return;
    setError("");
    try {
      await api(`${path}/${id}`, { method: "DELETE" });
      await reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Erro ao eliminar.");
    }
  }

  return (
    <section className="profile-section">
      <div className="section-heading">
        <div>
          <h2>{config.title}</h2>
          <p>Adicione, edite ou remova os registos associados ao seu perfil.</p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="empty-state">Ainda não existem registos.</p>
      ) : (
        <div className="record-list">
          {items.map((item) => (
            <article className="record-card" key={item.id}>
              <div>
                <strong>{String(item.title_obtained ?? item.title ?? "")}</strong>
                <p>
                  {String(item.course ?? item.institution ?? item.description ?? item.type ?? "")}
                </p>
              </div>
              <div className="record-actions">
                <button className="text-button" type="button" onClick={() => startEdit(item)}>
                  Editar
                </button>
                <button
                  className="text-button danger-text"
                  type="button"
                  onClick={() => remove(item.id)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <form className="record-form" noValidate onSubmit={save}>
        <h3>{editingId ? "Editar registo" : "Adicionar registo"}</h3>
        <ValidationSummary errors={fieldErrors} />
        <div className="form-grid">
          {config.fields.map((field) => (
            <label
              className={`field ${field.name === "description" || field.name === "citation" ? "form-wide" : ""}`}
              key={field.name}
            >
              {field.label}
              {field.kind === "select" ? (
                <select
                  name={field.name}
                  required
                  value={values[field.name] ?? ""}
                  aria-invalid={Boolean(fieldErrors[field.name])}
                  aria-describedby={fieldErrors[field.name] ? `${field.name}-error` : undefined}
                  onChange={(event) => {
                    setValues({ ...values, [field.name]: event.target.value });
                    setFieldErrors({ ...fieldErrors, [field.name]: "" });
                  }}
                >
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.name === "description" || field.name === "citation" ? (
                <textarea
                  name={field.name}
                  rows={3}
                  required={!field.optional}
                  value={values[field.name] ?? ""}
                  aria-invalid={Boolean(fieldErrors[field.name])}
                  aria-describedby={fieldErrors[field.name] ? `${field.name}-error` : undefined}
                  onChange={(event) => {
                    setValues({ ...values, [field.name]: event.target.value });
                    setFieldErrors({ ...fieldErrors, [field.name]: "" });
                  }}
                />
              ) : (
                <input
                  name={field.name}
                  type={field.kind ?? "text"}
                  min={field.kind === "number" ? 1800 : undefined}
                  max={field.kind === "number" ? 2200 : undefined}
                  required={!field.optional}
                  value={values[field.name] ?? ""}
                  aria-invalid={Boolean(fieldErrors[field.name])}
                  aria-describedby={fieldErrors[field.name] ? `${field.name}-error` : undefined}
                  onChange={(event) => {
                    setValues({ ...values, [field.name]: event.target.value });
                    setFieldErrors({ ...fieldErrors, [field.name]: "" });
                  }}
                />
              )}
              <FieldMessage name={field.name} errors={fieldErrors} />
            </label>
          ))}
        </div>
        <div className="form-actions">
          <button className="button" type="submit" disabled={busy}>
            {busy ? "A guardar…" : editingId ? "Guardar alterações" : "Adicionar"}
          </button>
          {editingId && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setEditingId(null);
                setValues(blank);
                setFieldErrors({});
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

type CourseOption = {
  id: number;
  organizational_unit_id: number;
  name: string;
  code: string;
  degree_level: string;
};
type DisciplineOption = { id: number; name: string; code: string; curricular_year: number };
type AcademicYearOption = { id: number; label: string; status: "OPEN" | "CLOSED" };
type Assignment = {
  id: number;
  discipline_id: number;
  academic_year_id: number;
  academic_year: string;
  semesters: number[];
  discipline_name: string;
  course_name: string;
  course_organizational_unit_id: number;
  course_organizational_unit_name: string;
};

function TeachingPanel({ profileId }: { profileId: number }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [disciplines, setDisciplines] = useState<DisciplineOption[]>([]);
  const [years, setYears] = useState<AcademicYearOption[]>([]);
  const [openYearIds, setOpenYearIds] = useState<Set<number>>(new Set());
  const [courseId, setCourseId] = useState("");
  const [disciplineId, setDisciplineId] = useState("");
  const [yearId, setYearId] = useState("");
  const [semesters, setSemesters] = useState<number[]>([1]);
  const [editing, setEditing] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function loadAssignments() {
    setAssignments(await api(`/profiles/${profileId}/disciplines`));
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      api(`/profiles/${profileId}/disciplines`),
      api("/courses?limit=200"),
      api("/organizational-units"),
    ])
      .then(
        async ([teacherAssignments, catalogCourses, units]: [
          Assignment[],
          CourseOption[],
          Unit[],
        ]) => {
          const unitNames = new Map(units.map((unit) => [unit.id, unit.name]));
          const namesApplied = teacherAssignments.map((item) => ({
            ...item,
            course_organizational_unit_name:
              item.course_organizational_unit_name ||
              unitNames.get(item.course_organizational_unit_id) ||
              "",
          }));
          const ids = [...new Set(namesApplied.map((item) => item.course_organizational_unit_id))];
          const yearsPerUnit = await Promise.all(
            ids.map((id) => api(`/academic-years?organizational_unit_id=${id}&limit=100`)),
          );
          if (!active) return;
          setAssignments(namesApplied);
          setCourses(catalogCourses);
          const openIds = new Set<number>();
          for (const yearsForUnit of yearsPerUnit as AcademicYearOption[][]) {
            for (const year of yearsForUnit) if (year.status === "OPEN") openIds.add(year.id);
          }
          setOpenYearIds(openIds);
        },
      )
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  const selectedCourse = courses.find((course) => String(course.id) === courseId);
  useEffect(() => {
    let active = true;
    if (!selectedCourse)
      return () => {
        active = false;
      };
    Promise.all([
      api(`/courses/${selectedCourse.id}/disciplines`),
      api(
        `/academic-years?organizational_unit_id=${selectedCourse.organizational_unit_id}&limit=100`,
      ),
    ])
      .then(([courseDisciplines, openYears]: [DisciplineOption[], AcademicYearOption[]]) => {
        if (active) {
          setDisciplines(courseDisciplines);
          setYears(openYears.filter((year) => year.status === "OPEN"));
        }
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [selectedCourse]);

  function toggleSemester(value: number, list: number[], update: (items: number[]) => void) {
    update(list.includes(value) ? list.filter((item) => item !== value) : [...list, value].sort());
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const invalidFields = validateForm(event.currentTarget);
    setFieldErrors(invalidFields);
    if (Object.keys(invalidFields).length) return;
    setBusy(true);
    try {
      await api(`/profiles/${profileId}/disciplines`, {
        method: "POST",
        body: JSON.stringify({
          discipline_id: Number(disciplineId),
          academic_year_id: Number(yearId),
          semesters,
        }),
      });
      await loadAssignments();
      setCourseId("");
      setDisciplineId("");
      setYearId("");
      setSemesters([1]);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível associar a disciplina.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveSemesters(assignmentId: number) {
    setBusy(true);
    setError("");
    try {
      await api(`/profiles/${profileId}/disciplines/${assignmentId}`, {
        method: "PATCH",
        body: JSON.stringify({ semesters }),
      });
      await loadAssignments();
      setEditing(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível atualizar os semestres.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeAssignment(id: number) {
    if (!window.confirm("Remover esta disciplina do seu perfil?")) return;
    setError("");
    try {
      await api(`/profiles/${profileId}/disciplines/${id}`, { method: "DELETE" });
      await loadAssignments();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível remover a disciplina.");
    }
  }

  return (
    <section className="profile-section">
      <div className="section-heading">
        <div>
          <h2>Disciplinas que leciona</h2>
          <p>
            As associações são feitas por ano académico e semestre. Anos encerrados ficam
            disponíveis apenas para consulta.
          </p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p>A carregar as disciplinas…</p>
      ) : assignments.length === 0 ? (
        <p className="empty-state">Ainda não associou disciplinas.</p>
      ) : (
        <div className="record-list">
          {assignments.map((assignment) => {
            const readOnly = !openYearIds.has(assignment.academic_year_id);
            return (
              <article className="record-card" key={assignment.id}>
                <div>
                  <strong>{assignment.discipline_name}</strong>
                  <p>
                    {assignment.course_name} · {assignment.course_organizational_unit_name} ·{" "}
                    {assignment.academic_year}
                  </p>
                  {editing === assignment.id ? (
                    <div className="semester-options">
                      {[1, 2].map((semester) => (
                        <label key={semester}>
                          <input
                            type="checkbox"
                            checked={semesters.includes(semester)}
                            onChange={() => toggleSemester(semester, semesters, setSemesters)}
                          />{" "}
                          {semester}º semestre
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p>
                      {assignment.semesters.map((semester) => `${semester}º semestre`).join(" · ")}
                      {readOnly ? " · Ano encerrado (leitura)" : ""}
                    </p>
                  )}
                </div>
                <div className="record-actions">
                  {editing === assignment.id ? (
                    <>
                      <button
                        className="text-button"
                        type="button"
                        disabled={busy || semesters.length === 0}
                        onClick={() => saveSemesters(assignment.id)}
                      >
                        Guardar
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setEditing(null)}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    !readOnly && (
                      <>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => {
                            setEditing(assignment.id);
                            setSemesters(assignment.semesters);
                          }}
                        >
                          Semestres
                        </button>
                        <button
                          className="text-button danger-text"
                          type="button"
                          onClick={() => removeAssignment(assignment.id)}
                        >
                          Remover
                        </button>
                      </>
                    )
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <form className="record-form" noValidate onSubmit={submit}>
        <h3>Associar disciplina a um ano aberto</h3>
        <div className="form-grid">
          <label className="field">
            Curso
            <select
              name="course_id"
              required
              value={courseId}
              aria-invalid={Boolean(fieldErrors.course_id)}
              aria-describedby={fieldErrors.course_id ? "course_id-error" : undefined}
              onChange={(event) => {
                setCourseId(event.target.value);
                setDisciplineId("");
                setYearId("");
                setDisciplines([]);
                setYears([]);
                setFieldErrors({
                  ...fieldErrors,
                  course_id: "",
                  discipline_id: "",
                  academic_year_id: "",
                });
              }}
            >
              <option value="">Selecione o curso</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} · {course.degree_level}
                </option>
              ))}
            </select>
            <FieldMessage name="course_id" errors={fieldErrors} />
          </label>
          <label className="field">
            Disciplina
            <select
              name="discipline_id"
              required
              disabled={!courseId}
              value={disciplineId}
              aria-invalid={Boolean(fieldErrors.discipline_id)}
              aria-describedby={fieldErrors.discipline_id ? "discipline_id-error" : undefined}
              onChange={(event) => {
                setDisciplineId(event.target.value);
                setFieldErrors({ ...fieldErrors, discipline_id: "" });
              }}
            >
              <option value="">Selecione a disciplina</option>
              {disciplines.map((discipline) => (
                <option key={discipline.id} value={discipline.id}>
                  {discipline.name} · {discipline.curricular_year}º ano
                </option>
              ))}
            </select>
            <FieldMessage name="discipline_id" errors={fieldErrors} />
          </label>
          <label className="field">
            Ano académico
            <select
              name="academic_year_id"
              required
              disabled={!courseId}
              value={yearId}
              aria-invalid={Boolean(fieldErrors.academic_year_id)}
              aria-describedby={fieldErrors.academic_year_id ? "academic_year_id-error" : undefined}
              onChange={(event) => {
                setYearId(event.target.value);
                setFieldErrors({ ...fieldErrors, academic_year_id: "" });
              }}
            >
              <option value="">Selecione o ano aberto</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                </option>
              ))}
            </select>
            <FieldMessage name="academic_year_id" errors={fieldErrors} />
          </label>
          <fieldset className="field semester-field">
            <legend>Semestres</legend>
            {[1, 2].map((semester) => (
              <label key={semester}>
                <input
                  type="checkbox"
                  checked={semesters.includes(semester)}
                  onChange={() => toggleSemester(semester, semesters, setSemesters)}
                />{" "}
                {semester}º semestre
              </label>
            ))}
          </fieldset>
        </div>
        <ValidationSummary errors={fieldErrors} />
        <button
          className="button"
          type="submit"
          disabled={busy || !courseId || !disciplineId || !yearId || semesters.length === 0}
        >
          {busy ? "A guardar…" : "Associar disciplina"}
        </button>
      </form>
    </section>
  );
}

export function MyProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [values, setValues] = useState<Values>(emptyProfile);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [tab, setTab] = useState("profile");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/backend/profiles/me", { cache: "no-store" }).then(async (response) => ({
        response,
        body: await response.json().catch(() => null),
      })),
      fetch("/api/backend/organizational-units", { cache: "no-store" }).then((response) =>
        response.ok ? response.json() : [],
      ),
    ])
      .then(([result, availableUnits]) => {
        setUnits(availableUnits);
        if (result.response.ok) {
          const current = result.body as Profile;
          setProfile(current);
          setValues({
            ...emptyProfile,
            ...Object.fromEntries(
              Object.entries(current).map(([key, value]) => [
                key,
                value == null ? "" : String(value),
              ]),
            ),
          });
          setSlugTouched(true);
        } else if (result.response.status === 404) setNotFound(true);
        else if (result.response.status === 401) window.location.replace("/entrar");
        else setError(result.body?.detail ?? "Não foi possível carregar o perfil.");
      })
      .catch(() => setError("Não foi possível ligar à API. Confirme que o backend está a correr."))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const invalidFields = validateForm(event.currentTarget);
    setFieldErrors(invalidFields);
    if (Object.keys(invalidFields).length) return;
    setBusy(true);
    const payload: Record<string, unknown> = Object.fromEntries(
      Object.keys(emptyProfile).map((key) => [key, values[key] ?? ""]),
    );
    for (const key of [
      "email",
      "orcid_url",
      "linkedin_url",
      "github_url",
      "google_scholar_url",
      "position",
      "area_of_activity",
    ])
      payload[key] = String(values[key] ?? "").trim() || null;
    if (notFound) payload.organizational_unit_id = Number(unitId);
    try {
      const response = await api(notFound ? "/profiles/me" : `/profiles/${profile!.id}`, {
        method: notFound ? "POST" : "PATCH",
        body: JSON.stringify(payload),
      });
      setProfile(response);
      setNotFound(false);
      setValues({
        ...emptyProfile,
        ...Object.fromEntries(
          Object.entries(response).map(([key, value]) => [key, value == null ? "" : String(value)]),
        ),
      });
      setSlugTouched(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar o perfil.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>A carregar o seu perfil…</p>;
  return (
    <>
      <p className="eyebrow">Área pessoal</p>
      <h1>{notFound ? "Criar o seu perfil" : "O seu perfil"}</h1>
      <p className="hero-copy">Mantenha os seus dados institucionais e académicos atualizados.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notFound || profile ? (
        <>
          {!notFound && (
            <nav className="profile-tabs" aria-label="Secções do perfil">
              <button
                className={tab === "profile" ? "tab active" : "tab"}
                onClick={() => setTab("profile")}
              >
                Dados do perfil
              </button>
              <button
                className={tab === "education" ? "tab active" : "tab"}
                onClick={() => setTab("education")}
              >
                Formação
              </button>
              <button
                className={tab === "research" ? "tab active" : "tab"}
                onClick={() => setTab("research")}
              >
                Investigação
              </button>
              <button
                className={tab === "publications" ? "tab active" : "tab"}
                onClick={() => setTab("publications")}
              >
                Publicações
              </button>
              {profile?.main_function === "DOCENTE" && (
                <button
                  className={tab === "teaching" ? "tab active" : "tab"}
                  onClick={() => setTab("teaching")}
                >
                  Docência
                </button>
              )}
            </nav>
          )}
          {notFound || tab === "profile" ? (
            <section className="profile-section">
              <div className="section-heading">
                <div>
                  <h2>Dados pessoais e profissionais</h2>
                  <p>
                    Os novos perfis começam como rascunho e só ficam públicos após publicação por um
                    administrador.
                  </p>
                </div>
                <span className="status-pill">
                  {profile
                    ? enumLabel(profile.publication_status, publicationStatusLabels)
                    : "Rascunho"}
                </span>
              </div>
              {profile && (
                <PhotoControl
                  profileId={profile.id}
                  name={profile.full_name}
                  photoUrl={profile.photo_url}
                  onChange={(photo_url) => setProfile({ ...profile, photo_url })}
                />
              )}
              <form noValidate onSubmit={saveProfile}>
                <ValidationSummary errors={fieldErrors} />
                <ProfileFields
                  values={values}
                  setValues={setValues}
                  isNew={notFound}
                  units={units}
                  unitId={unitId}
                  setUnitId={setUnitId}
                  slugTouched={slugTouched}
                  setSlugTouched={setSlugTouched}
                  errors={fieldErrors}
                  clearError={(name) => setFieldErrors({ ...fieldErrors, [name]: "" })}
                />
                <button className="button" type="submit" disabled={busy}>
                  {busy ? "A guardar…" : notFound ? "Criar perfil" : "Guardar alterações"}
                </button>
              </form>
            </section>
          ) : tab === "teaching" ? (
            <TeachingPanel key={`teaching-${profile!.id}`} profileId={profile!.id} />
          ) : (
            <CollectionPanel
              key={`${profile!.id}-${tab}`}
              profileId={profile!.id}
              resource={tab as keyof typeof resourceConfig}
            />
          )}
        </>
      ) : (
        <section className="profile-section">
          <p>Não foi possível determinar o estado do perfil.</p>
        </section>
      )}
    </>
  );
}
