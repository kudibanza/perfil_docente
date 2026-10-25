"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ProfilePhoto } from "@/components/profile-photo";
import { enumLabel, profileCategoryLabels, profilePositionLabels } from "@/lib/profiles";

type Profile = {
  id: number;
  slug: string;
  full_name: string;
  photo_url: string | null;
  main_function: string;
  category: string;
  position: string | null;
  area_of_activity: string | null;
  organizational_unit_id: number;
};
type Unit = { id: number; name: string };

export function PublicProfileDirectory({
  initialProfiles,
  units,
  initialQuery,
  initialPage,
  initialHasNextPage,
}: {
  initialProfiles: Profile[];
  units: Unit[];
  initialQuery: string;
  initialPage: number;
  initialHasNextPage: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [page, setPage] = useState(initialPage);
  const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lastSearch = useRef(initialQuery);
  const unitNames = new Map(units.map((unit) => [unit.id, unit.name]));

  const loadProfiles = useCallback(
    async (searchText: string, targetPage: number, signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(targetPage) });
        if (searchText) params.set("q", searchText);
        const response = await fetch(`/api/public/profiles?${params.toString()}`, {
          cache: "no-store",
          signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body?.detail ?? "Não foi possível carregar os perfis.");
        setProfiles(body.profiles);
        setHasNextPage(body.hasNextPage);
        setPage(targetPage);
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar os perfis.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const searchText = query.trim().slice(0, 200);
    if (searchText === lastSearch.current) return;
    lastSearch.current = searchText;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadProfiles(searchText, 1, controller.signal);
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadProfiles, query]);

  return (
    <>
      <div className="public-directory-search">
        <label className="field">
          <span>Pesquisar pelo nome</span>
          <input
            type="search"
            maxLength={200}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Escreva o nome do docente, funcionário ou investigador"
            aria-label="Pesquisar perfis pelo nome"
          />
        </label>
      </div>
      {error && (
        <section className="profile-section">
          <p className="error" role="alert">
            {error}
          </p>
        </section>
      )}
      {loading && (
        <p className="directory-loading" role="status">
          A pesquisar perfis…
        </p>
      )}
      {!loading && profiles.length === 0 ? (
        <section className="profile-section">
          <p className="empty-state">
            {query
              ? "Não foram encontrados perfis com esse nome."
              : "Ainda não existem perfis publicados."}
          </p>
        </section>
      ) : (
        <>
          {profiles.length > 0 && (
            <>
              <p className="directory-results-count">
                {(page - 1) * 12 + 1}–{(page - 1) * 12 + profiles.length} perfis
                {hasNextPage ? " ou mais" : ""}
              </p>
              <div
                className={`public-profile-grid${loading ? " public-profile-grid-loading" : ""}`}
                aria-busy={loading}
              >
                {profiles.map((profile) => (
                  <article className="public-profile-card" key={profile.id}>
                    <ProfilePhoto src={profile.photo_url} name={profile.full_name} size="small" />
                    <div className="public-profile-copy">
                      <h2>
                        <Link href={`/perfil/${encodeURIComponent(profile.slug)}`}>
                          {profile.full_name}
                        </Link>
                      </h2>
                      <p>
                        {profile.position
                          ? enumLabel(profile.position, profilePositionLabels)
                          : enumLabel(profile.category, profileCategoryLabels)}
                      </p>
                      <p>
                        {unitNames.get(profile.organizational_unit_id) ?? "Universidade de Luanda"}
                      </p>
                      {profile.area_of_activity && <p>{profile.area_of_activity}</p>}
                      <Link
                        className="text-button"
                        href={`/perfil/${encodeURIComponent(profile.slug)}`}
                      >
                        Ver perfil →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
              <nav
                className="pagination public-directory-pagination"
                aria-label="Paginação dos perfis"
              >
                <button
                  className="secondary-button"
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => void loadProfiles(query.trim(), page - 1)}
                >
                  Anterior
                </button>
                <span>Página {page}</span>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={!hasNextPage || loading}
                  onClick={() => void loadProfiles(query.trim(), page + 1)}
                >
                  Seguinte
                </button>
              </nav>
            </>
          )}
        </>
      )}
    </>
  );
}
