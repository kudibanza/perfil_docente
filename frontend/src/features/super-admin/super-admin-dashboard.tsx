"use client";

import { useEffect, useState, type FormEvent } from "react";
import { UnitAdminDashboard } from "@/features/unit-admin/unit-admin-dashboard";

type Unit = {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
};
type Account = {
  id: number;
  email: string;
  role: "USER" | "UNIT_ADMIN" | "SUPER_ADMIN";
  organizational_unit_id: number | null;
  profile_id: number | null;
  profile_organizational_unit_id: number | null;
  is_active: boolean;
  last_login_at: string | null;
  permissions: string[];
};
export type SuperAdminSection =
  "dashboard" | "accounts" | "profiles" | "units" | "unit-management" | "courses" | "disciplines";
type Statistics = {
  users_total: number;
  users_active: number;
  users_super_admin: number;
  profiles_total: number;
  profiles_published: number;
  profiles_draft: number;
  profiles_inactive: number;
  courses_total: number;
  disciplines_total: number;
  academic_years_open: number;
  units: {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    profiles_count: number;
    published_profiles_count: number;
    courses_count: number;
  }[];
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

export function SuperAdminDashboard({
  currentUserId,
  section,
}: {
  currentUserId: number;
  section: SuperAdminSection;
}) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState("");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    api("/organizational-units?include_inactive=true")
      .then((rows: Unit[]) => {
        if (!active) return;
        setUnits(rows);
        const firstActive = rows.find((unit) => unit.is_active);
        setUnitId((current) => current || (firstActive ? String(firstActive.id) : ""));
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const titles: Record<SuperAdminSection, [string, string]> = {
    dashboard: ["Dashboard", "Indicadores gerais da Universidade de Luanda."],
    accounts: [
      "Contas de utilizadores",
      "Crie contas, atribua papéis e mantenha o acesso atualizado.",
    ],
    profiles: ["Perfis", "Reveja e publique perfis de qualquer Unidade Orgânica."],
    units: ["Unidades Orgânicas", "Gira a estrutura institucional da Universidade."],
    "unit-management": [
      "Gestão de Unidades",
      "Selecione uma Unidade Orgânica para administrar perfis, catálogo e anos académicos.",
    ],
    courses: ["Cursos", "Gira os cursos das Unidades Orgânicas."],
    disciplines: ["Disciplinas", "Gira as disciplinas dos cursos das Unidades Orgânicas."],
  };
  return (
    <>
      <p className="eyebrow">Administração global</p>
      <h1>{titles[section][0]}</h1>
      <p className="hero-copy">{titles[section][1]}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {section === "dashboard" && <StatisticsDashboard />}
      {section === "accounts" && <AccountsManager currentUserId={currentUserId} units={units} />}
      {section === "units" && (
        <UnitsManager units={units} onChanged={() => setRefresh((n) => n + 1)} />
      )}
      {(section === "profiles" ||
        section === "unit-management" ||
        section === "courses" ||
        section === "disciplines") && (
        <section className="profile-section">
          <label className="field unit-picker">
            Unidade Orgânica
            <select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
              <option value="">Selecione a unidade</option>
              {units
                .filter((unit) => unit.is_active)
                .map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
            </select>
          </label>
          {unitId ? (
            <UnitAdminDashboard
              key={unitId}
              organizationalUnitId={Number(unitId)}
              section={
                section === "courses" || section === "disciplines" || section === "profiles"
                  ? section
                  : undefined
              }
              showInternalTabs={section === "unit-management"}
              hideHeading={section !== "unit-management"}
            />
          ) : (
            <p className="empty-state">
              Crie ou ative uma Unidade Orgânica para administrar os seus dados.
            </p>
          )}
        </section>
      )}
    </>
  );
}

function StatisticsDashboard() {
  const [data, setData] = useState<Statistics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("/admin/dashboard")
      .then((result) => {
        if (active) setData(result);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error)
    return (
      <section className="profile-section">
        <p className="error" role="alert">
          {error}
        </p>
      </section>
    );
  if (!data)
    return (
      <section className="profile-section">
        <p>A carregar as estatísticas…</p>
      </section>
    );
  const cards = [
    ["Contas ativas", data.users_active, `${data.users_total} contas no total`, "♙"],
    ["Perfis publicados", data.profiles_published, `${data.profiles_total} perfis no total`, "◎"],
    ["Cursos", data.courses_total, "Em todas as unidades", "▤"],
    ["Disciplinas", data.disciplines_total, "No catálogo institucional", "≡"],
    ["Anos académicos abertos", data.academic_years_open, "Prontos para atribuições", "◷"],
    ["Super Administradores", data.users_super_admin, "Contas ativas", "✦"],
  ];
  return (
    <>
      <div className="statistics-grid">
        {cards.map(([label, value, detail, icon]) => (
          <article className="stat-card" key={String(label)}>
            <div className="stat-card-top">
              <span>{label}</span>
              <span className="stat-icon" aria-hidden="true">
                {icon}
              </span>
            </div>
            <strong>{Number(value).toLocaleString("pt-PT")}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>
      <section className="profile-section stats-breakdown">
        <div className="section-heading">
          <div>
            <h2>Estado dos perfis</h2>
            <p>Distribuição atual dos perfis institucionais.</p>
          </div>
        </div>
        <div className="stat-breakdown-grid">
          <div>
            <span>Publicados</span>
            <strong>{data.profiles_published}</strong>
          </div>
          <div>
            <span>Rascunhos</span>
            <strong>{data.profiles_draft}</strong>
          </div>
          <div>
            <span>Inativos</span>
            <strong>{data.profiles_inactive}</strong>
          </div>
        </div>
      </section>
      <section className="profile-section">
        <div className="section-heading">
          <div>
            <h2>Resumo por Unidade Orgânica</h2>
            <p>Perfis e cursos registados em cada unidade.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Unidade</th>
                <th>Estado</th>
                <th>Perfis</th>
                <th>Publicados</th>
                <th>Cursos</th>
              </tr>
            </thead>
            <tbody>
              {data.units.map((unit) => (
                <tr key={unit.id}>
                  <td>
                    <strong>{unit.name}</strong>
                    <small>{unit.code}</small>
                  </td>
                  <td>{unit.is_active ? "Ativa" : "Inativa"}</td>
                  <td>{unit.profiles_count}</td>
                  <td>{unit.published_profiles_count}</td>
                  <td>{unit.courses_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function AccountsManager({ currentUserId, units }: { currentUserId: number; units: Unit[] }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Account["role"]>("USER");
  const [unitId, setUnitId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grantCreateUser, setGrantCreateUser] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    email: "",
    role: "USER" as Account["role"],
    organizational_unit_id: "",
    profile_organizational_unit_id: "",
    new_password: "",
    canCreateUsers: false,
  });
  const [offset, setOffset] = useState(0);

  async function reload() {
    setAccounts(await api(`/users?limit=100&offset=${offset}`));
  }
  useEffect(() => {
    let active = true;
    api(`/users?limit=100&offset=${offset}`)
      .then((rows) => {
        if (active) setAccounts(rows);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [offset]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          role,
          organizational_unit_id: role === "UNIT_ADMIN" ? Number(unitId) : null,
          permissions: role === "UNIT_ADMIN" && grantCreateUser ? ["CREATE_USER_ACCOUNT"] : [],
        }),
      });
      setEmail("");
      setPassword("");
      setUnitId("");
      setGrantCreateUser(false);
      await reload();
      setNotice("Conta criada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(account: Account) {
    setEditingId(account.id);
    setEditForm({
      email: account.email,
      role: account.role,
      organizational_unit_id: account.organizational_unit_id
        ? String(account.organizational_unit_id)
        : "",
      profile_organizational_unit_id: account.profile_organizational_unit_id
        ? String(account.profile_organizational_unit_id)
        : "",
      new_password: "",
      canCreateUsers: account.permissions?.includes("CREATE_USER_ACCOUNT") ?? false,
    });
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;
    setBusy(true);
    setError("");
    setNotice("");
    const payload: Record<string, unknown> = {
      email: editForm.email,
      role: editForm.role,
      organizational_unit_id:
        editForm.role === "UNIT_ADMIN" ? Number(editForm.organizational_unit_id) : null,
      permissions:
        editForm.role === "UNIT_ADMIN" && editForm.canCreateUsers ? ["CREATE_USER_ACCOUNT"] : [],
    };
    if (editForm.new_password) payload.new_password = editForm.new_password;
    try {
      await api(`/users/${editingId}`, { method: "PATCH", body: JSON.stringify(payload) });
      setEditingId(null);
      await reload();
      setNotice("Conta atualizada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a conta.");
    } finally {
      setBusy(false);
    }
  }

  async function transferUserProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const account = accounts.find((item) => item.id === editingId);
    if (!account?.profile_id) {
      setError("Esta conta ainda não tem perfil para transferir.");
      return;
    }
    const nextUnitId = Number(editForm.profile_organizational_unit_id);
    if (!nextUnitId) {
      setError("Selecione a nova Unidade Orgânica.");
      return;
    }
    if (nextUnitId === account.profile_organizational_unit_id) {
      setNotice("O perfil já pertence a esta Unidade Orgânica.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/profiles/${account.profile_id}`, {
        method: "PATCH",
        body: JSON.stringify({ organizational_unit_id: nextUnitId }),
      });
      await reload();
      setEditForm((form) => ({ ...form, profile_organizational_unit_id: String(nextUnitId) }));
      setNotice("Perfil transferido para a nova Unidade Orgânica.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível transferir o perfil.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(account: Account) {
    const next = !account.is_active;
    if (!window.confirm(`${next ? "Reativar" : "Desativar"} a conta ${account.email}?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/users/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: next }),
      });
      await reload();
      setNotice(next ? "Conta reativada." : "Conta desativada.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível alterar o estado da conta.",
      );
    } finally {
      setBusy(false);
    }
  }

  const visible = accounts.filter((account) =>
    `${account.email} ${account.role}`.toLowerCase().includes(query.toLowerCase()),
  );
  const editingAccount = accounts.find((account) => account.id === editingId);
  const activeUnits = units.filter((unit) => unit.is_active);
  return (
    <section className="profile-section">
      <div className="section-heading">
        <div>
          <h2>Contas de utilizador</h2>
          <p>
            Crie contas, atribua papéis e unidades, redefina palavras-passe e controle a ativação.
          </p>
        </div>
      </div>
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
      <form className="record-form" onSubmit={createAccount}>
        <h3>Criar conta</h3>
        <div className="form-grid">
          <label className="field">
            Email
            <input
              type="email"
              required
              maxLength={320}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            Palavra-passe inicial
            <input
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <small>Mínimo de 12 caracteres. Transmita-a ao utilizador por um canal seguro.</small>
          </label>
          <label className="field">
            Papel
            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value as Account["role"]);
                setUnitId("");
              }}
            >
              <option value="USER">Utilizador</option>
              <option value="UNIT_ADMIN">Administrador de Unidade</option>
              <option value="SUPER_ADMIN">Super Administrador</option>
            </select>
          </label>
          {role === "UNIT_ADMIN" && (
            <label className="field">
              Unidade Orgânica
              <select required value={unitId} onChange={(event) => setUnitId(event.target.value)}>
                <option value="">Selecione a unidade</option>
                {activeUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {role === "UNIT_ADMIN" && (
            <label className="permission-option">
              <input
                type="checkbox"
                checked={grantCreateUser}
                onChange={(event) => setGrantCreateUser(event.target.checked)}
              />
              <span>
                <strong>Pode criar contas USER</strong>
                <small>
                  Permite criar contas comuns, sem gerir outros utilizadores ou unidades.
                </small>
              </span>
            </label>
          )}
        </div>
        <button className="button" disabled={busy}>
          {busy ? "A guardar…" : "Criar conta"}
        </button>
      </form>
      {editingId && (
        <form className="record-form" onSubmit={saveAccount}>
          <h3>Editar conta</h3>
          <div className="form-grid">
            <label className="field">
              Email
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
              />
            </label>
            <label className="field">
              Nova palavra-passe
              <input
                type="password"
                minLength={12}
                value={editForm.new_password}
                onChange={(event) => setEditForm({ ...editForm, new_password: event.target.value })}
              />
              <small>Deixe em branco para manter a atual.</small>
            </label>
            <label className="field">
              Papel
              <select
                value={editForm.role}
                disabled={editingId === currentUserId}
                onChange={(event) => {
                  const nextRole = event.target.value as Account["role"];
                  setEditForm({
                    ...editForm,
                    role: nextRole,
                    organizational_unit_id: "",
                    canCreateUsers: nextRole === "UNIT_ADMIN" && editForm.canCreateUsers,
                  });
                }}
              >
                <option value="USER">Utilizador</option>
                <option value="UNIT_ADMIN">Administrador de Unidade</option>
                <option value="SUPER_ADMIN">Super Administrador</option>
              </select>
            </label>
            {editForm.role === "UNIT_ADMIN" && (
              <label className="field">
                Unidade Orgânica
                <select
                  required
                  value={editForm.organizational_unit_id}
                  onChange={(event) =>
                    setEditForm({ ...editForm, organizational_unit_id: event.target.value })
                  }
                >
                  <option value="">Selecione a unidade</option>
                  {activeUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {editForm.role === "UNIT_ADMIN" && (
              <label className="permission-option">
                <input
                  type="checkbox"
                  checked={editForm.canCreateUsers}
                  onChange={(event) =>
                    setEditForm({ ...editForm, canCreateUsers: event.target.checked })
                  }
                />
                <span>
                  <strong>Pode criar contas USER</strong>
                  <small>Se desmarcar, o administrador deixa de poder criar contas.</small>
                </span>
              </label>
            )}
          </div>
          <div className="form-actions">
            <button className="button" disabled={busy}>
              Guardar alterações
            </button>
            <button className="secondary-button" type="button" onClick={() => setEditingId(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      {editingId && editForm.role === "USER" && (
        <form className="record-form account-transfer-form" onSubmit={transferUserProfile}>
          <h3>Transferir utilizador para outra Unidade Orgânica</h3>
          {editingAccount?.profile_id ? (
            <>
              <p>
                Esta operação altera a unidade do perfil profissional de {editingAccount.email}.
              </p>
              <label className="field">
                Nova Unidade Orgânica
                <select
                  required
                  value={editForm.profile_organizational_unit_id}
                  onChange={(event) =>
                    setEditForm({ ...editForm, profile_organizational_unit_id: event.target.value })
                  }
                >
                  <option value="">Selecione a unidade</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                      {unit.is_active ? "" : " · Inativa"}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button"
                type="submit"
                disabled={
                  busy ||
                  !activeUnits.some(
                    (unit) => String(unit.id) === editForm.profile_organizational_unit_id,
                  )
                }
              >
                {busy ? "A transferir…" : "Transferir perfil"}
              </button>
            </>
          ) : (
            <p className="empty-state">
              Esta conta ainda não possui um perfil profissional para transferir.
            </p>
          )}
        </form>
      )}
      <label className="field search-field">
        Pesquisar contas
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Email ou papel"
        />
      </label>
      {loading ? (
        <p>A carregar contas…</p>
      ) : visible.length === 0 ? (
        <p className="empty-state">Não há contas correspondentes.</p>
      ) : (
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Papel</th>
                <th>Permissões adicionais</th>
                <th>Unidade</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((account) => {
                const accountUnitId =
                  account.role === "USER"
                    ? account.profile_organizational_unit_id
                    : account.organizational_unit_id;
                return (
                  <tr key={account.id}>
                    <td>{account.email}</td>
                    <td>{account.role}</td>
                    <td>
                      {account.permissions?.includes("CREATE_USER_ACCOUNT")
                        ? "Criar contas USER"
                        : "—"}
                    </td>
                    <td>{units.find((unit) => unit.id === accountUnitId)?.name ?? "—"}</td>
                    <td>
                      <span
                        className={`status-pill ${account.is_active ? "status-published" : "status-inactive"}`}
                      >
                        {account.is_active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => startEdit(account)}
                      >
                        Editar
                      </button>
                      <button
                        className={account.is_active ? "text-button danger-text" : "text-button"}
                        type="button"
                        disabled={busy || account.id === currentUserId}
                        onClick={() => toggleActive(account)}
                      >
                        {account.is_active ? "Desativar" : "Reativar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination">
        <button
          className="secondary-button"
          disabled={offset === 0}
          onClick={() => setOffset(Math.max(0, offset - 100))}
        >
          Anterior
        </button>
        <span>
          Contas {offset + 1}–{offset + accounts.length}
        </span>
        <button
          className="secondary-button"
          disabled={accounts.length < 100}
          onClick={() => setOffset(offset + 100)}
        >
          Seguinte
        </button>
      </div>
    </section>
  );
}

function UnitsManager({ units, onChanged }: { units: Unit[]; onChanged: () => void }) {
  const blank = { name: "", code: "", description: "" };
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function edit(unit: Unit) {
    setEditingId(unit.id);
    setForm({ name: unit.name, code: unit.code, description: unit.description ?? "" });
    setError("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const payload = { ...form, description: form.description.trim() || null };
      await api(editingId ? `/organizational-units/${editingId}` : "/organizational-units", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setForm(blank);
      setEditingId(null);
      onChanged();
      setNotice(editingId ? "Unidade atualizada." : "Unidade criada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível guardar a unidade.");
    } finally {
      setBusy(false);
    }
  }
  async function toggle(unit: Unit) {
    const next = !unit.is_active;
    if (!window.confirm(`${next ? "Ativar" : "Desativar"} a unidade ${unit.name}?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/organizational-units/${unit.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: next }),
      });
      onChanged();
      setNotice(next ? "Unidade ativada." : "Unidade desativada.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível alterar a unidade.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="profile-section">
      <div className="section-heading">
        <div>
          <h2>Unidades Orgânicas</h2>
          <p>Atualize os dados institucionais ou ative e desative unidades.</p>
        </div>
      </div>
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
      <form className="record-form" onSubmit={save}>
        <h3>{editingId ? "Editar unidade" : "Adicionar Unidade Orgânica"}</h3>
        <div className="form-grid">
          <label className="field">
            Nome
            <input
              required
              minLength={2}
              maxLength={200}
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </label>
          <label className="field">
            Código
            <input
              required
              minLength={2}
              maxLength={40}
              pattern="[A-Za-z0-9_-]+"
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </label>
          <label className="field form-wide">
            Descrição
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
        </div>
        <div className="form-actions">
          <button className="button" disabled={busy}>
            {busy ? "A guardar…" : editingId ? "Guardar alterações" : "Adicionar unidade"}
          </button>
          {editingId && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(blank);
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Código</th>
              <th>Descrição</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id}>
                <td>{unit.name}</td>
                <td>{unit.code}</td>
                <td>{unit.description ?? "—"}</td>
                <td>
                  <span
                    className={`status-pill ${unit.is_active ? "status-published" : "status-inactive"}`}
                  >
                    {unit.is_active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td>
                  <button className="text-button" type="button" onClick={() => edit(unit)}>
                    Editar
                  </button>
                  <button
                    className={unit.is_active ? "text-button danger-text" : "text-button"}
                    type="button"
                    disabled={busy}
                    onClick={() => toggle(unit)}
                  >
                    {unit.is_active ? "Desativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
