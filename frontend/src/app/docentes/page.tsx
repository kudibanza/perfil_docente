import { apiRequest } from "@/lib/api/server";
import { PublicProfileDirectory } from "@/features/public/public-profile-directory";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Perfis públicos" };

type SearchParams = { q?: string; page?: string };
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

const pageSize = 12;

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = params.q?.trim().slice(0, 200) ?? "";
  const requestedPage = params.page && /^\d+$/.test(params.page) ? Number(params.page) : 1;
  const page = Math.max(1, Math.min(requestedPage, 100000));
  const search = new URLSearchParams({
    limit: String(pageSize + 1),
    offset: String((page - 1) * pageSize),
  });
  if (query) search.set("q", query);

  const [profilesResponse, unitsResponse] = await Promise.all([
    apiRequest(`/public/profiles?${search.toString()}`),
    apiRequest("/organizational-units"),
  ]);
  const receivedProfiles: Profile[] = profilesResponse.ok ? await profilesResponse.json() : [];
  const hasNextPage = receivedProfiles.length > pageSize;
  const profiles = receivedProfiles.slice(0, pageSize);
  const units = unitsResponse.ok
    ? ((await unitsResponse.json()) as { id: number; name: string }[])
    : [];
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="nav-link" href="/">
          ← Início
        </Link>
      </header>
      <main className="main">
        <p className="eyebrow">Universidade de Luanda</p>
        <h1>Docentes, funcionários e investigadores</h1>
        <p className="hero-copy">
          Conheça os perfis institucionais publicados pelas Unidades Orgânicas.
        </p>
        <PublicProfileDirectory
          key={`${query}:${page}`}
          initialProfiles={profiles}
          units={units}
          initialQuery={query}
          initialPage={page}
          initialHasNextPage={hasNextPage}
        />
      </main>
      <footer className="footer">Universidade de Luanda</footer>
    </div>
  );
}
