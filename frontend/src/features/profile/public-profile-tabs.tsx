"use client";

import { useState } from "react";
import { publicationTypeLabels } from "@/lib/profiles";

type Teaching = {
  academic_year: string;
  semesters: number[];
  discipline_name: string;
  discipline_code: string;
  curricular_year: number;
  course_name: string;
  course_code: string;
};

type Item = {
  id: number;
  title?: string;
  type?: string;
  description?: string | null;
  publication_year?: number | null;
  link?: string | null;
  citation?: string | null;
};

type Education = {
  id: number;
  title_obtained: string;
  course?: string | null;
  institution: string;
  country?: string | null;
  completion_year?: number | null;
};

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="profile-section public-detail-section" aria-label={title}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function PublicProfileTabs({
  academicEducation,
  teachingAssignments,
  researchLines,
  publications,
}: {
  academicEducation: Education[];
  teachingAssignments: Teaching[];
  researchLines: Item[];
  publications: Item[];
}) {
  const [activeTab, setActiveTab] = useState<"teaching" | "research">("teaching");
  const byYear = new Map<string, Teaching[]>();
  for (const item of teachingAssignments)
    byYear.set(item.academic_year, [...(byYear.get(item.academic_year) ?? []), item]);

  return (
    <div className="public-profile-sections">
      <div className="public-profile-tab-list" role="tablist" aria-label="Conteúdo do perfil">
        <button
          id="profile-tab-teaching"
          className={`public-profile-tab${activeTab === "teaching" ? " active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "teaching"}
          aria-controls="profile-panel-teaching"
          onClick={() => setActiveTab("teaching")}
        >
          Docência por ano académico
        </button>
        <button
          id="profile-tab-research"
          className={`public-profile-tab${activeTab === "research" ? " active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "research"}
          aria-controls="profile-panel-research"
          onClick={() => setActiveTab("research")}
        >
          Investigação e publicações científicas
        </button>
      </div>

      {activeTab === "teaching" && (
        <div
          id="profile-panel-teaching"
          className="public-profile-tab-panel"
          role="tabpanel"
          aria-labelledby="profile-tab-teaching"
          tabIndex={0}
        >
          <ProfileSection title="Formação académica">
            {academicEducation.length === 0 ? (
              <p className="empty-state">Ainda não há formações académicas registadas.</p>
            ) : (
              <div className="record-list">
                {academicEducation.map((item) => (
                  <article className="record-card" key={item.id}>
                    <div>
                      <strong>
                        {item.title_obtained}
                        {item.course ? ` — ${item.course}` : ""}
                      </strong>
                      <p>
                        {item.institution}
                        {item.country ? ` · ${item.country}` : ""}
                        {item.completion_year ? ` · ${item.completion_year}` : ""}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </ProfileSection>
          <ProfileSection title="Docência por ano académico">
            {[...byYear.entries()]
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([year, items]) => (
                <div className="teaching-year" key={year}>
                  <h3>{year}</h3>
                  <div className="record-list">
                    {items.map((item, i) => (
                      <article className="record-card" key={`${item.discipline_code}-${i}`}>
                        <div>
                          <strong>{item.discipline_name}</strong>
                          <p>
                            {item.course_name} · {item.curricular_year}º ano ·{" "}
                            {item.semesters.map((semester) => `${semester}º semestre`).join(", ")}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            {teachingAssignments.length === 0 && (
              <p className="empty-state">
                Não há disciplinas publicadas para o ano académico atual e os dois anteriores.
              </p>
            )}
          </ProfileSection>
        </div>
      )}

      {activeTab === "research" && (
        <div
          id="profile-panel-research"
          className="public-profile-tab-panel"
          role="tabpanel"
          aria-labelledby="profile-tab-research"
          tabIndex={0}
        >
          <ProfileSection title="Linhas de investigação">
            {researchLines.length === 0 ? (
              <p className="empty-state">Ainda não há linhas de investigação registadas.</p>
            ) : (
              <div className="record-list">
                {researchLines.map((item) => (
                  <article className="record-card" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      {item.description && <p>{item.description}</p>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </ProfileSection>
          <ProfileSection title="Publicações científicas">
            {publications.length === 0 ? (
              <p className="empty-state">Ainda não há publicações científicas registadas.</p>
            ) : (
              <div className="record-list">
                {publications.map((item) => (
                  <article className="record-card" key={item.id}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {publicationTypeLabels[item.type ?? ""] ?? item.type}
                        {item.publication_year ? ` · ${item.publication_year}` : ""}
                      </p>
                      {item.description && <p>{item.description}</p>}
                      {item.citation && <p>{item.citation}</p>}
                      {item.link && (
                        <a
                          className="text-button"
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Aceder à publicação →
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </ProfileSection>
        </div>
      )}
    </div>
  );
}
