"use client";

import { useEffect, useState, type FormEvent } from "react";
import { validateForm, type FieldErrors } from "@/lib/forms/validation";
import {
  emptyProfile,
  ProfileFields,
  ValidationSummary,
  type Values,
} from "@/features/profile/my-profile";
import { PhotoControl } from "@/components/photo-control";
import {
  enumLabel,
  mainFunctionLabels,
  profileCategoryLabels,
  publicationStatusLabels,
} from "@/lib/profiles";

type Unit = { id: number; name: string; code: string };
type Profile = {
  id: number;
  slug: string;
  full_name: string;
  photo_url: string | null;
  email: string | null;
  main_function: string;
  category: string;
  position: string | null;
  area_of_activity: string | null;
  publication_status: "DRAFT" | "PUBLISHED" | "INACTIVE";
};
type Course = {
  id: number;
  organizational_unit_id: number;
  name: string;
  code: string;
  description: string | null;
  degree_level: "LICENCIATURA" | "MESTRADO" | "DOUTORAMENTO";
  is_active: boolean;
};
type Discipline = {
  id: number;
  course_id: number;
  name: string;
  code: string;
  description: string | null;
  curricular_year: number;
  is_active: boolean;
};
type AcademicYear = {
  id: number;
  label: string;
  status: "OPEN" | "CLOSED";
  opened_at: string | null;
  closed_at: string | null;
};

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/backend/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      typeof body?.detail === "string" ? body.detail : "Não foi possível concluir a operação.",
    );
  }
  return response.status === 204 ? null : response.json();
}

const degreeOptions = [
  ["LICENCIATURA", "Licenciatura"],
  ["MESTRADO", "Mestrado"],
  ["DOUTORAMENTO", "Doutoramento"],
].map(([value, label]) => ({ value, label }));

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ")
    .toLocaleLowerCase("pt-PT")
    .trim();
}

function FieldError({ name, errors }: { name: string; errors: FieldErrors }) {
  return errors[name] ? (
    <span className="field-error" id={`${name}-error`}>
      {errors[name]}
    </span>
  ) : null;
}

function Summary({ errors }: { errors: FieldErrors }) {
  const count = Object.values(errors).filter(Boolean).length;
  return count ? (
    <p className="validation-summary" role="alert">
      Há campos a corrigir. Veja as mensagens junto aos campos assinalados.
    </p>
  ) : null;
}

export type UnitAdminSection = "profiles" | "catalog" | "courses" | "disciplines" | "years";

export function UnitAdminDashboard({
  organizationalUnitId,
  section,
  showInternalTabs = true,
  hideHeading = false,
}: {
  organizationalUnitId: number;
  section?: UnitAdminSection;
  showInternalTabs?: boolean;
  hideHeading?: boolean;
}) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [tab, setTab] = useState<UnitAdminSection>(section ?? "profiles");
  const activeTab = section ?? tab;
  const sectionTitle =
    activeTab === "profiles"
      ? "Perfis da unidade"
      : activeTab === "catalog"
        ? "Catálogo académico"
        : activeTab === "courses"
          ? "Cursos"
          : activeTab === "disciplines"
            ? "Disciplinas"
            : "Anos académicos";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [profileOffset, setProfileOffset] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      api("/organizational-units"),
      api(
        `/profiles?organizational_unit_id=${organizationalUnitId}&limit=100&offset=${profileOffset}`,
      ),
      api(
        `/courses?organizational_unit_id=${organizationalUnitId}&include_inactive=true&limit=200`,
      ),
      api(
        `/academic-years?organizational_unit_id=${organizationalUnitId}&include_closed=true&limit=100`,
      ),
    ])
      .then(
        ([units, profileRows, courseRows, yearRows]: [
          Unit[],
          Profile[],
          Course[],
          AcademicYear[],
        ]) => {
          if (!active) return;
          setUnit(units.find((item) => item.id === organizationalUnitId) ?? null);
          setProfiles(profileRows);
          setCourses(courseRows);
          setYears(yearRows);
          setSelectedCourseId((current) =>
            courseRows.some((course) => String(course.id) === current)
              ? current
              : String(
                  courseRows.find((course) => course.is_active)?.id ?? courseRows[0]?.id ?? "",
                ),
          );
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
  }, [organizationalUnitId, profileOffset, refresh]);

  useEffect(() => {
    let active = true;
    if (!selectedCourseId)
      return () => {
        active = false;
      };
    api(`/courses/${selectedCourseId}/disciplines?include_inactive=true`)
      .then((rows) => {
        if (active) setDisciplines(rows);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [selectedCourseId, refresh]);

  const normalizedSearch = normalizeSearchText(search);
  const filteredProfiles = profiles.filter((profile) => {
    const searchable = normalizeSearchText(
      [
        profile.full_name,
        profile.email ?? "",
        profile.slug,
        profile.main_function,
        mainFunctionLabels[profile.main_function] ?? "",
        profile.category,
      ].join(" "),
    );
    return (
      (statusFilter === "ALL" || profile.publication_status === statusFilter) &&
      searchable.includes(normalizedSearch)
    );
  });

  async function changePublication(profile: Profile) {
    const next = profile.publication_status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const prompt =
      next === "PUBLISHED"
        ? `Publicar o perfil de ${profile.full_name}?`
        : `Retirar ${profile.full_name} da área pública e voltar o perfil para rascunho?`;
    if (!window.confirm(prompt)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const updated = await api(`/profiles/${profile.id}`, {
        method: "PATCH",
        body: JSON.stringify({ publication_status: next }),
      });
      setProfiles((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setNotice(next === "PUBLISHED" ? "Perfil publicado." : "Perfil retirado da área pública.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível atualizar a publicação.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function setCourseActive(course: Course) {
    const action = course.is_active ? "desativar" : "reativar";
    if (!window.confirm(`Pretende ${action} o curso “${course.name}”?`)) return;
    setError("");
    try {
      await api(`/courses/${course.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !course.is_active }),
      });
      setRefresh((n) => n + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar o curso.");
    }
  }

  async function setDisciplineActive(discipline: Discipline) {
    const action = discipline.is_active ? "desativar" : "reativar";
    if (!window.confirm(`Pretende ${action} a disciplina “${discipline.name}”?`)) return;
    setError("");
    try {
      await api(`/disciplines/${discipline.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !discipline.is_active }),
      });
      setRefresh((n) => n + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível atualizar a disciplina.",
      );
    }
  }

  async function closeYear(year: AcademicYear) {
    const confirmed = window.confirm(
      `Encerrar o ano académico ${year.label}? Esta ação é irreversível e as atribuições ficarão em modo de leitura.`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/academic-years/${year.id}/close`, { method: "POST" });
      setNotice(`Ano académico ${year.label} encerrado.`);
      setRefresh((n) => n + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível encerrar o ano.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>A carregar a área da unidade…</p>;
  return (
    <>
      {!hideHeading && (
        <>
          <p className="eyebrow">UNIT_ADMIN{unit ? ` · ${unit.code}` : ""}</p>
          <h1>{section ? sectionTitle : (unit?.name ?? "Painel da unidade")}</h1>
          <p className="hero-copy">
            {activeTab === "profiles"
              ? "Reveja, edite e publique os perfis da sua Unidade Orgânica."
              : activeTab === "catalog" || activeTab === "courses" || activeTab === "disciplines"
                ? `Gira ${activeTab === "disciplines" ? "as disciplinas" : activeTab === "courses" ? "os cursos" : "os cursos e as disciplinas"} da sua Unidade Orgânica.`
                : "Abra e encerre anos académicos da sua Unidade Orgânica."}
          </p>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {showInternalTabs && (
        <nav className="profile-tabs admin-tabs" aria-label="Secções de administração">
          <button
            className={tab === "profiles" ? "tab active" : "tab"}
            onClick={() => setTab("profiles")}
          >
            Perfis ({profiles.length})
          </button>
          <button
            className={tab === "courses" ? "tab active" : "tab"}
            onClick={() => setTab("courses")}
          >
            Cursos
          </button>
          <button
            className={tab === "disciplines" ? "tab active" : "tab"}
            onClick={() => setTab("disciplines")}
          >
            Disciplinas
          </button>
          <button
            className={tab === "years" ? "tab active" : "tab"}
            onClick={() => setTab("years")}
          >
            Anos académicos
          </button>
        </nav>
      )}
      {activeTab === "profiles" && (
        <section className="profile-section">
          <div className="section-heading">
            <div>
              <h2>Perfis da unidade</h2>
              <p>Reveja o conteúdo e controle a sua disponibilidade pública.</p>
            </div>
          </div>
          <div className="filter-row">
            <label className="field">
              Pesquisar
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, email, slug, função ou categoria"
              />
            </label>
            <label className="field">
              Publicação
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="ALL">Todos os estados</option>
                <option value="DRAFT">Rascunho</option>
                <option value="PUBLISHED">Publicado</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </label>
          </div>
          {filteredProfiles.length === 0 ? (
            <p className="empty-state">Não há perfis que correspondam aos filtros.</p>
          ) : (
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Função</th>
                    <th>Categoria</th>
                    <th>Estado</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.map((profile) => (
                    <tr key={profile.id}>
                      <td>
                        <strong>{profile.full_name}</strong>
                        <small>{profile.email || profile.slug}</small>
                      </td>
                      <td>{enumLabel(profile.main_function, mainFunctionLabels)}</td>
                      <td>{enumLabel(profile.category, profileCategoryLabels)}</td>
                      <td>
                        <span
                          className={`status-pill status-${profile.publication_status.toLowerCase()}`}
                        >
                          {enumLabel(profile.publication_status, publicationStatusLabels)}
                        </span>
                      </td>
                      <td>
                        {profile.publication_status === "PUBLISHED" ? (
                          <button
                            className="text-button danger-text"
                            type="button"
                            disabled={busy}
                            onClick={() => changePublication(profile)}
                          >
                            Retirar
                          </button>
                        ) : (
                          <button
                            className="text-button"
                            type="button"
                            disabled={busy}
                            onClick={() => changePublication(profile)}
                          >
                            Publicar
                          </button>
                        )}
                        <details className="profile-review">
                          <summary>Rever e editar</summary>
                          <div className="profile-review-panel">
                            <ProfileEditor
                              profile={profile}
                              onSaved={(updated) =>
                                setProfiles((items) =>
                                  items.map((item) => (item.id === updated.id ? updated : item)),
                                )
                              }
                            />
                          </div>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="pagination">
            <button
              className="secondary-button"
              type="button"
              disabled={profileOffset === 0}
              onClick={() => setProfileOffset(Math.max(0, profileOffset - 100))}
            >
              Anterior
            </button>
            <span>
              {profiles.length
                ? `Perfis ${profileOffset + 1}–${profileOffset + profiles.length}`
                : "Nenhum perfil nesta página"}
            </span>
            <button
              className="secondary-button"
              type="button"
              disabled={profiles.length < 100}
              onClick={() => setProfileOffset(profileOffset + 100)}
            >
              Seguinte
            </button>
          </div>
        </section>
      )}
      {(activeTab === "catalog" || activeTab === "courses" || activeTab === "disciplines") && (
        <CatalogManager
          view={activeTab === "catalog" ? "all" : activeTab}
          unitId={organizationalUnitId}
          courses={courses}
          disciplines={disciplines}
          selectedCourseId={selectedCourseId}
          setSelectedCourseId={setSelectedCourseId}
          refresh={() => setRefresh((n) => n + 1)}
          setError={setError}
          setNotice={setNotice}
          onToggleCourse={setCourseActive}
          onToggleDiscipline={setDisciplineActive}
        />
      )}
      {activeTab === "years" && (
        <AcademicYearManager
          years={years}
          refresh={() => setRefresh((n) => n + 1)}
          setError={setError}
          setNotice={setNotice}
          onClose={closeYear}
          busy={busy}
        />
      )}
    </>
  );
}

function ProfileEditor({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: (profile: Profile) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Values>({
    ...emptyProfile,
    ...Object.fromEntries(
      Object.entries(profile).map(([key, value]) => [key, value == null ? "" : String(value)]),
    ),
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const invalid = validateForm(event.currentTarget);
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    const body: Record<string, unknown> = Object.fromEntries(
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
      body[key] = String(values[key] ?? "").trim() || null;
    try {
      const updated = await api(`/profiles/${profile.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      onSaved(updated);
      setValues({
        ...emptyProfile,
        ...Object.fromEntries(
          Object.entries(updated).map(([key, value]) => [key, value == null ? "" : String(value)]),
        ),
      });
      setEditing(false);
      setMessage("Perfil atualizado.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Não foi possível atualizar o perfil.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-editor">
      <p>
        <b>Cargo:</b> {profile.position ?? "Não indicado"}
      </p>
      <p>
        <b>Área:</b> {profile.area_of_activity ?? "Não indicada"}
      </p>
      <p>
        <b>Endereço:</b> /perfil/{profile.slug}
      </p>
      <PhotoControl
        profileId={profile.id}
        name={profile.full_name}
        photoUrl={profile.photo_url}
        onChange={(photo_url) => onSaved({ ...profile, photo_url })}
      />
      {message && (
        <p className="editor-message" role="status">
          {message}
        </p>
      )}
      {editing ? (
        <form noValidate onSubmit={save}>
          <ValidationSummary errors={errors} />
          <ProfileFields
            values={values}
            setValues={setValues}
            isNew={false}
            units={[]}
            unitId=""
            setUnitId={() => undefined}
            slugTouched
            setSlugTouched={() => undefined}
            errors={errors}
            clearError={(name) => setErrors({ ...errors, [name]: "" })}
          />
          <div className="form-actions">
            <button className="button" type="submit" disabled={busy}>
              {busy ? "A guardar…" : "Guardar perfil"}
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setEditing(false);
                setErrors({});
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button className="text-button" type="button" onClick={() => setEditing(true)}>
          Editar dados do perfil
        </button>
      )}
    </div>
  );
}

function CatalogManager({
  view,
  unitId,
  courses,
  disciplines,
  selectedCourseId,
  setSelectedCourseId,
  refresh,
  setError,
  setNotice,
  onToggleCourse,
  onToggleDiscipline,
}: {
  view: "all" | "courses" | "disciplines";
  unitId: number;
  courses: Course[];
  disciplines: Discipline[];
  selectedCourseId: string;
  setSelectedCourseId: (value: string) => void;
  refresh: () => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
  onToggleCourse: (course: Course) => void;
  onToggleDiscipline: (discipline: Discipline) => void;
}) {
  const [courseEditId, setCourseEditId] = useState<number | null>(null);
  const [courseForm, setCourseForm] = useState({
    name: "",
    code: "",
    description: "",
    degree_level: "LICENCIATURA",
  });
  const [courseSearch, setCourseSearch] = useState("");
  const [coursePage, setCoursePage] = useState(0);
  const [disciplineEditId, setDisciplineEditId] = useState<number | null>(null);
  const [disciplineForm, setDisciplineForm] = useState({
    name: "",
    code: "",
    description: "",
    curricular_year: "1",
  });
  const [disciplineSearch, setDisciplineSearch] = useState("");
  const [disciplinePage, setDisciplinePage] = useState(0);
  const [courseErrors, setCourseErrors] = useState<FieldErrors>({});
  const [disciplineErrors, setDisciplineErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const selectedCourse = courses.find((course) => String(course.id) === selectedCourseId);
  const pageSize = 10;
  const filteredCourses = courses.filter((course) =>
    normalizeSearchText(`${course.name} ${course.code} ${course.degree_level}`).includes(
      normalizeSearchText(courseSearch),
    ),
  );
  const coursePageCount = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const visibleCourses = filteredCourses.slice(coursePage * pageSize, (coursePage + 1) * pageSize);
  const filteredDisciplines = disciplines.filter((discipline) =>
    normalizeSearchText(
      `${discipline.name} ${discipline.code} ${discipline.curricular_year} ${discipline.is_active ? "ativa" : "inativa"}`,
    ).includes(normalizeSearchText(disciplineSearch)),
  );
  const disciplinePageCount = Math.max(1, Math.ceil(filteredDisciplines.length / pageSize));
  const visibleDisciplines = filteredDisciplines.slice(
    disciplinePage * pageSize,
    (disciplinePage + 1) * pageSize,
  );

  function editCourse(course: Course) {
    setCourseEditId(course.id);
    setCourseForm({
      name: course.name,
      code: course.code,
      description: course.description ?? "",
      degree_level: course.degree_level,
    });
  }
  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const invalid = validateForm(event.currentTarget);
    setCourseErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    const body = {
      ...courseForm,
      description: courseForm.description.trim() || null,
      ...(!courseEditId ? { organizational_unit_id: unitId } : {}),
    };
    try {
      await api(courseEditId ? `/courses/${courseEditId}` : "/courses", {
        method: courseEditId ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      setCourseEditId(null);
      setCourseForm({ name: "", code: "", description: "", degree_level: "LICENCIATURA" });
      setNotice("Curso guardado.");
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar o curso.");
    } finally {
      setBusy(false);
    }
  }
  function editDiscipline(discipline: Discipline) {
    setDisciplineEditId(discipline.id);
    setDisciplineForm({
      name: discipline.name,
      code: discipline.code,
      description: discipline.description ?? "",
      curricular_year: String(discipline.curricular_year),
    });
  }
  async function saveDiscipline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const invalid = validateForm(event.currentTarget);
    setDisciplineErrors(invalid);
    if (Object.keys(invalid).length) return;
    setBusy(true);
    const body = {
      ...disciplineForm,
      curricular_year: Number(disciplineForm.curricular_year),
      description: disciplineForm.description.trim() || null,
    };
    try {
      await api(
        disciplineEditId
          ? `/disciplines/${disciplineEditId}`
          : `/courses/${selectedCourseId}/disciplines`,
        { method: disciplineEditId ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      setDisciplineEditId(null);
      setDisciplineForm({ name: "", code: "", description: "", curricular_year: "1" });
      setNotice("Disciplina guardada.");
      refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar a disciplina.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="profile-section">
      <div className="section-heading">
        <div>
          <h2>
            {view === "disciplines"
              ? "Gestão de disciplinas"
              : view === "courses"
                ? "Gestão de cursos"
                : "Catálogo académico"}
          </h2>
          <p>
            {view === "disciplines"
              ? "Escolha um curso para gerir as respetivas disciplinas."
              : "Os cursos e disciplinas geridos aqui pertencem à sua unidade."}
          </p>
        </div>
      </div>
      {view !== "disciplines" && (
        <div className="catalog-grid">
          <form className="record-form admin-form" noValidate onSubmit={saveCourse}>
            <h3>{courseEditId ? "Editar curso" : "Adicionar curso"}</h3>
            <Summary errors={courseErrors} />
            <label className="field">
              Nome
              <input
                name="name"
                required
                minLength={2}
                maxLength={200}
                value={courseForm.name}
                aria-invalid={Boolean(courseErrors.name)}
                onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })}
              />
              <FieldError name="name" errors={courseErrors} />
            </label>
            <label className="field">
              Código
              <input
                name="code"
                required
                maxLength={40}
                value={courseForm.code}
                aria-invalid={Boolean(courseErrors.code)}
                onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })}
              />
              <FieldError name="code" errors={courseErrors} />
            </label>
            <label className="field">
              Grau académico
              <select
                name="degree_level"
                required
                value={courseForm.degree_level}
                onChange={(event) =>
                  setCourseForm({ ...courseForm, degree_level: event.target.value })
                }
              >
                {degreeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Descrição
              <textarea
                name="description"
                rows={2}
                value={courseForm.description}
                onChange={(event) =>
                  setCourseForm({ ...courseForm, description: event.target.value })
                }
              />
            </label>
            <div className="form-actions">
              <button className="button" type="submit" disabled={busy}>
                {busy ? "A guardar…" : courseEditId ? "Guardar curso" : "Adicionar curso"}
              </button>
              {courseEditId && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setCourseEditId(null);
                    setCourseForm({
                      name: "",
                      code: "",
                      description: "",
                      degree_level: "LICENCIATURA",
                    });
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
          <section className="catalog-list">
            <div className="section-heading">
              <div>
                <h3>Cursos</h3>
                <p>{filteredCourses.length} curso(s)</p>
              </div>
            </div>
            <label className="field table-filter">
              Filtrar cursos
              <input
                value={courseSearch}
                onChange={(event) => {
                  setCourseSearch(event.target.value);
                  setCoursePage(0);
                }}
                placeholder="Nome, código ou grau académico"
              />
            </label>
            {courses.length === 0 ? (
              <p className="empty-state">
                Ainda não há cursos. Crie um curso para poder adicionar disciplinas.
              </p>
            ) : filteredCourses.length === 0 ? (
              <p className="empty-state">Nenhum curso corresponde à pesquisa.</p>
            ) : (
              <>
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Curso</th>
                        <th>Código</th>
                        <th>Grau académico</th>
                        <th>Estado</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCourses.map((course) => (
                        <tr key={course.id}>
                          <td>
                            <strong>{course.name}</strong>
                          </td>
                          <td>{course.code}</td>
                          <td>{course.degree_level}</td>
                          <td>{course.is_active ? "Ativo" : "Inativo"}</td>
                          <td>
                            <div className="record-actions">
                              <button
                                className="text-button"
                                type="button"
                                onClick={() => editCourse(course)}
                              >
                                Editar
                              </button>
                              <button
                                className="text-button"
                                type="button"
                                onClick={() => {
                                  setSelectedCourseId(String(course.id));
                                  setDisciplineEditId(null);
                                  setDisciplinePage(0);
                                }}
                              >
                                {String(course.id) === selectedCourseId
                                  ? "Selecionado"
                                  : "Disciplinas"}
                              </button>
                              <button
                                className="text-button danger-text"
                                type="button"
                                onClick={() => onToggleCourse(course)}
                              >
                                {course.is_active ? "Desativar" : "Reativar"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  page={coursePage}
                  pageCount={coursePageCount}
                  total={filteredCourses.length}
                  pageSize={pageSize}
                  onChange={setCoursePage}
                />
              </>
            )}
          </section>
        </div>
      )}
      {view !== "courses" && (
        <div className="discipline-manager">
          <div className="section-heading">
            <div>
              <h3>Disciplinas</h3>
              <p>Escolha o curso para consultar, adicionar e atualizar as disciplinas.</p>
            </div>
          </div>
          {courses.length > 0 && (
            <label className="field course-discipline-picker">
              Curso
              <select
                value={selectedCourseId}
                onChange={(event) => {
                  setSelectedCourseId(event.target.value);
                  setDisciplineEditId(null);
                  setDisciplinePage(0);
                  setDisciplineSearch("");
                }}
                aria-label="Curso das disciplinas"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name} ({course.code}){course.is_active ? "" : " · Inativo"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selectedCourse && !selectedCourse.is_active && (
            <p className="validation-summary">
              Este curso está inativo. Pode consultar e editar disciplinas existentes, mas não
              adicionar novas.
            </p>
          )}
          {!selectedCourse && (
            <p className="empty-state">Crie primeiro um curso para poder adicionar disciplinas.</p>
          )}
          {selectedCourse && (
            <div className="catalog-grid">
              <form className="record-form admin-form" noValidate onSubmit={saveDiscipline}>
                <h3>{disciplineEditId ? "Editar disciplina" : "Adicionar disciplina"}</h3>
                <Summary errors={disciplineErrors} />
                <label className="field">
                  Nome
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={200}
                    value={disciplineForm.name}
                    aria-invalid={Boolean(disciplineErrors.name)}
                    onChange={(event) =>
                      setDisciplineForm({ ...disciplineForm, name: event.target.value })
                    }
                  />
                  <FieldError name="name" errors={disciplineErrors} />
                </label>
                <label className="field">
                  Código
                  <input
                    name="code"
                    required
                    maxLength={40}
                    value={disciplineForm.code}
                    aria-invalid={Boolean(disciplineErrors.code)}
                    onChange={(event) =>
                      setDisciplineForm({ ...disciplineForm, code: event.target.value })
                    }
                  />
                  <FieldError name="code" errors={disciplineErrors} />
                </label>
                <label className="field">
                  Ano curricular (1.º–5.º)
                  <input
                    name="curricular_year"
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    required
                    value={disciplineForm.curricular_year}
                    aria-invalid={Boolean(disciplineErrors.curricular_year)}
                    onChange={(event) => {
                      setDisciplineForm({ ...disciplineForm, curricular_year: event.target.value });
                      setDisciplineErrors({ ...disciplineErrors, curricular_year: "" });
                    }}
                  />
                  <FieldError name="curricular_year" errors={disciplineErrors} />
                </label>
                <label className="field">
                  Descrição
                  <textarea
                    name="description"
                    rows={2}
                    value={disciplineForm.description}
                    onChange={(event) =>
                      setDisciplineForm({ ...disciplineForm, description: event.target.value })
                    }
                  />
                </label>
                <div className="form-actions">
                  <button
                    className="button"
                    type="submit"
                    disabled={busy || (!disciplineEditId && !selectedCourse.is_active)}
                  >
                    {busy
                      ? "A guardar…"
                      : disciplineEditId
                        ? "Guardar disciplina"
                        : "Adicionar disciplina"}
                  </button>
                  {disciplineEditId && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setDisciplineEditId(null);
                        setDisciplineForm({
                          name: "",
                          code: "",
                          description: "",
                          curricular_year: "1",
                        });
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
              <section className="catalog-list">
                <div className="section-heading">
                  <div>
                    <h3>Disciplinas</h3>
                    <p>{filteredDisciplines.length} disciplina(s) neste curso</p>
                  </div>
                </div>
                <label className="field table-filter">
                  Filtrar disciplinas
                  <input
                    value={disciplineSearch}
                    onChange={(event) => {
                      setDisciplineSearch(event.target.value);
                      setDisciplinePage(0);
                    }}
                    placeholder="Nome, código, ano curricular ou estado"
                  />
                </label>
                {disciplines.length === 0 ? (
                  <p className="empty-state">Este curso ainda não tem disciplinas.</p>
                ) : filteredDisciplines.length === 0 ? (
                  <p className="empty-state">Nenhuma disciplina corresponde à pesquisa.</p>
                ) : (
                  <>
                    <div className="table-scroll">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Disciplina</th>
                            <th>Código</th>
                            <th>Ano curricular</th>
                            <th>Estado</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleDisciplines.map((discipline) => (
                            <tr key={discipline.id}>
                              <td>
                                <strong>{discipline.name}</strong>
                              </td>
                              <td>{discipline.code}</td>
                              <td>{discipline.curricular_year}º ano</td>
                              <td>{discipline.is_active ? "Ativa" : "Inativa"}</td>
                              <td>
                                <div className="record-actions">
                                  <button
                                    className="text-button"
                                    type="button"
                                    onClick={() => editDiscipline(discipline)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="text-button danger-text"
                                    type="button"
                                    onClick={() => onToggleDiscipline(discipline)}
                                  >
                                    {discipline.is_active ? "Desativar" : "Reativar"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <TablePagination
                      page={disciplinePage}
                      pageCount={disciplinePageCount}
                      total={filteredDisciplines.length}
                      pageSize={pageSize}
                      onChange={setDisciplinePage}
                    />
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TablePagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min((page + 1) * pageSize, total);
  return (
    <div className="pagination" aria-label="Paginação da tabela">
      <button
        className="secondary-button"
        type="button"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </button>
      <span>
        {first}–{last} de {total} · Página {page + 1} de {pageCount}
      </span>
      <button
        className="secondary-button"
        type="button"
        disabled={page + 1 >= pageCount}
        onClick={() => onChange(page + 1)}
      >
        Seguinte
      </button>
    </div>
  );
}

function AcademicYearManager({
  years,
  refresh,
  setError,
  setNotice,
  onClose,
  busy,
}: {
  years: AcademicYear[];
  refresh: () => void;
  setError: (value: string) => void;
  setNotice: (value: string) => void;
  onClose: (year: AcademicYear) => void;
  busy: boolean;
}) {
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const currentOpenYear = years.find((year) => year.status === "OPEN");
  async function openYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const invalid = validateForm(event.currentTarget);
    if (!/^\d{4}\/\d{4}$/.test(label) || Number(label.slice(5)) !== Number(label.slice(0, 4)) + 1)
      invalid.label = "Use anos consecutivos no formato 2026/2027.";
    setErrors(invalid);
    if (Object.keys(invalid).length) return;
    setSaving(true);
    try {
      await api("/academic-years", { method: "POST", body: JSON.stringify({ label }) });
      setLabel("");
      setNotice(`Ano académico ${label} aberto.`);
      refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível abrir o ano académico.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="profile-section">
      <div className="section-heading">
        <div>
          <h2>Anos académicos</h2>
          <p>
            Há no máximo um ano aberto por unidade. Encerrar impede novas alterações às atribuições
            desse ano.
          </p>
        </div>
      </div>
      <form className="record-form year-form" noValidate onSubmit={openYear}>
        <h3>Abrir um novo ano</h3>
        {currentOpenYear && (
          <p className="validation-summary">
            Encerre o ano {currentOpenYear.label} antes de abrir outro.
          </p>
        )}
        <div className="form-grid">
          <label className="field">
            Ano académico
            <input
              name="label"
              required
              pattern="\d{4}/\d{4}"
              maxLength={9}
              placeholder="2026/2027"
              value={label}
              aria-invalid={Boolean(errors.label)}
              onChange={(event) => {
                setLabel(event.target.value);
                setErrors({});
              }}
            />
            <small>Formato: ano inicial seguido do ano seguinte.</small>
            <FieldError name="label" errors={errors} />
          </label>
        </div>
        <Summary errors={errors} />
        <button className="button" type="submit" disabled={saving || Boolean(currentOpenYear)}>
          {saving ? "A abrir…" : "Abrir ano académico"}
        </button>
      </form>
      <div className="record-list year-list">
        {years.map((year) => (
          <article className="record-card" key={year.id}>
            <div>
              <strong>{year.label}</strong>
              <p>
                {year.status === "OPEN"
                  ? "Aberto para alterações"
                  : "Encerrado · atribuições em leitura"}
              </p>
            </div>
            {year.status === "OPEN" && (
              <button
                className="text-button danger-text"
                type="button"
                disabled={busy}
                onClick={() => onClose(year)}
              >
                Encerrar ano
              </button>
            )}
          </article>
        ))}
        {years.length === 0 && (
          <p className="empty-state">Ainda não há anos académicos registados.</p>
        )}
      </div>
    </section>
  );
}
