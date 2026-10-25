import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiRequest } from "@/lib/api/server";
import { ProfilePhoto } from "@/components/profile-photo";
import { PublicProfileTabs } from "@/features/profile/public-profile-tabs";
import {
  enumLabel,
  mainFunctionLabels,
  profileCategoryLabels,
  profilePositionLabels,
} from "@/lib/profiles";

type Teaching = {
  academic_year: string;
  semesters: number[];
  discipline_name: string;
  discipline_code: string;
  curricular_year: number;
  course_name: string;
  course_code: string;
  course_organizational_unit_name: string;
  degree_level: string;
};
type Education = {
  id: number;
  title_obtained: string;
  course?: string | null;
  institution: string;
  country?: string | null;
  completion_year?: number | null;
};
type Profile = {
  id: number;
  slug: string;
  full_name: string;
  photo_url: string | null;
  email: string | null;
  orcid_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  google_scholar_url: string | null;
  main_function: string;
  category: string;
  position: string | null;
  area_of_activity: string | null;
  organizational_unit_id: number;
  academic_education: Education[];
  research_lines: { id: number; title: string; description: string | null }[];
  publications: {
    id: number;
    title: string;
    type: string;
    description: string | null;
    publication_year: number | null;
    link: string | null;
    citation: string | null;
  }[];
  teaching_assignments: Teaching[];
  current_academic_year: string | null;
};
type Unit = { id: number; name: string; code: string };

async function loadProfile(slug: string): Promise<{ profile: Profile; unit: string }> {
  const response = await apiRequest(`/public/profiles/${encodeURIComponent(slug)}`);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Não foi possível carregar o perfil público.");
  const profile: Profile = await response.json();
  const unitResponse = await apiRequest("/organizational-units");
  const units: Unit[] = unitResponse.ok ? await unitResponse.json() : [];
  return {
    profile,
    unit:
      units.find((unit) => unit.id === profile.organizational_unit_id)?.name ??
      "Universidade de Luanda",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { profile } = await loadProfile(slug);
    return {
      title: profile.full_name,
      description: profile.area_of_activity ?? `Perfil institucional de ${profile.full_name}.`,
    };
  } catch {
    return { title: "Perfil não encontrado" };
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { profile, unit } = await loadProfile(slug);
  const currentYearStart = profile.current_academic_year
    ? Number(profile.current_academic_year.slice(0, 4))
    : null;
  const recentTeaching = (profile.teaching_assignments ?? []).filter((item) => {
    const assignmentYearStart = Number(item.academic_year.slice(0, 4));
    return (
      currentYearStart !== null &&
      assignmentYearStart >= currentYearStart - 2 &&
      assignmentYearStart <= currentYearStart
    );
  });
  return (
    <div className="shell">
      <header className="topbar">
        <Link className="nav-link" href="/docentes">
          ← Todos os perfis
        </Link>
      </header>
      <main className="main public-profile-main">
        <section className="public-profile-hero">
          <ProfilePhoto src={profile.photo_url} name={profile.full_name} size="large" />
          <div>
            <p className="eyebrow">{unit}</p>
            <h1>{profile.full_name}</h1>
            <p className="profile-role">
              {profile.position
                ? enumLabel(profile.position, profilePositionLabels)
                : enumLabel(profile.category, profileCategoryLabels)}{" "}
              · {enumLabel(profile.main_function, mainFunctionLabels)}
            </p>
            {profile.area_of_activity && <p className="hero-copy">{profile.area_of_activity}</p>}
            {profile.email && (
              <a className="text-button" href={`mailto:${profile.email}`}>
                {profile.email}
              </a>
            )}
            <div className="profile-links">
              {[
                ["ORCID", profile.orcid_url],
                ["LinkedIn", profile.linkedin_url],
                ["GitHub", profile.github_url],
                ["Google Scholar", profile.google_scholar_url],
              ]
                .filter((entry): entry is [string, string] => typeof entry[1] === "string")
                .map(([label, href]) => (
                  <a
                    className="secondary-button"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={label}
                  >
                    {label}
                  </a>
                ))}
            </div>
          </div>
        </section>
        <PublicProfileTabs
          academicEducation={profile.academic_education ?? []}
          teachingAssignments={recentTeaching}
          researchLines={profile.research_lines ?? []}
          publications={profile.publications ?? []}
        />
      </main>
      <footer className="footer">Universidade de Luanda</footer>
    </div>
  );
}
