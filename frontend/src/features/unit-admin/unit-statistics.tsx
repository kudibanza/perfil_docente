"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Statistics = {
  unit: { id: number; name: string; code: string; is_active: boolean };
  users_total: number;
  users_active: number;
  profiles_total: number;
  profiles_published: number;
  profiles_draft: number;
  profiles_inactive: number;
  courses_total: number;
  disciplines_total: number;
  academic_years_open: number;
};

export function UnitStatistics({ organizationalUnitId }: { organizationalUnitId: number }) {
  const [data, setData] = useState<Statistics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/backend/admin/unit-dashboard?organizational_unit_id=${organizationalUnitId}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(
            typeof body?.detail === "string"
              ? body.detail
              : "Não foi possível carregar as estatísticas.",
          );
        return body as Statistics;
      })
      .then((body) => {
        if (active) setData(body);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [organizationalUnitId]);

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
        <p>A carregar as estatísticas da unidade…</p>
      </section>
    );
  const cards = [
    [
      "Perfis publicados",
      data.profiles_published,
      `${data.profiles_total} perfis no total`,
      "◎",
      "/painel/unidade/perfis",
    ],
    [
      "Contas associadas",
      data.users_active,
      `${data.users_total} contas no total`,
      "♙",
      "/painel/unidade/perfis",
    ],
    [
      "Cursos",
      data.courses_total,
      "Nesta Unidade Orgânica",
      "▤",
      "/painel/unidade/catalogo/cursos",
    ],
    [
      "Disciplinas",
      data.disciplines_total,
      "No catálogo da unidade",
      "≡",
      "/painel/unidade/catalogo/disciplinas",
    ],
    [
      "Anos académicos abertos",
      data.academic_years_open,
      "Disponíveis para atribuições",
      "◷",
      "/painel/unidade/anos-academicos",
    ],
  ];
  return (
    <>
      <p className="eyebrow">UNIT_ADMIN · {data.unit.code}</p>
      <h1>{data.unit.name}</h1>
      <p className="hero-copy">Resumo da atividade da sua Unidade Orgânica.</p>
      {!data.unit.is_active && (
        <p className="error" role="alert">
          Esta Unidade Orgânica está inativa.
        </p>
      )}
      <div className="statistics-grid unit-statistics-grid">
        {cards.map(([label, value, detail, icon, href]) => (
          <Link className="stat-card stat-card-link" href={String(href)} key={String(label)}>
            <div className="stat-card-top">
              <span>{label}</span>
              <span className="stat-icon" aria-hidden="true">
                {icon}
              </span>
            </div>
            <strong>{Number(value).toLocaleString("pt-PT")}</strong>
            <small>{detail}</small>
          </Link>
        ))}
      </div>
      <section className="profile-section stats-breakdown">
        <div className="section-heading">
          <div>
            <h2>Estado dos perfis</h2>
            <p>Estado de publicação dos perfis da unidade.</p>
          </div>
          <Link className="text-button" href="/painel/unidade/perfis">
            Gerir perfis →
          </Link>
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
    </>
  );
}
